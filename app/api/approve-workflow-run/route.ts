import { NextRequest, NextResponse } from 'next/server'

const NHOST_ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET
const NHOST_BACKEND_URL = process.env.NHOST_BACKEND_URL
const NHOST_REGION = process.env.NEXT_PUBLIC_NHOST_REGION || process.env.NHOST_REGION || 'ap-south-1'

const resolveGraphqlEndpoint = (backendUrl: string | undefined): string => {
  if (!backendUrl) return ''
  const cleanUrl = backendUrl.replace(/\/+$/, '')
  const match = cleanUrl.match(/https?:\/\/([^.]+)\.nhost\.(run|app)/)
  if (match) {
    const subdomain = match[1]
    const tld = match[2]
    return `https://${subdomain}.graphql.${NHOST_REGION}.nhost.${tld}/v1`
  }
  return `${cleanUrl}/v1/graphql`
}

const NHOST_GRAPHQL_ENDPOINT = resolveGraphqlEndpoint(NHOST_BACKEND_URL)

// GraphQL request helper with admin access
const adminGraphqlRequest = async (query: string, variables: Record<string, any> = {}) => {
  let lastError: Error | undefined
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(NHOST_GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': NHOST_ADMIN_SECRET || '',
        },
        body: JSON.stringify({ query, variables }),
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      const payload = await response.json()
      if (payload.errors && payload.errors.length > 0) {
        throw new Error(payload.errors[0].message)
      }
      return payload.data
    } catch (error: any) {
      lastError = error
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }
  throw lastError || new Error('GraphQL request failed')
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized: missing authorization header' }, { status: 401 })
    }

    const { run_id } = await request.json()
    if (!run_id) {
      return NextResponse.json({ error: 'Missing run_id in request body' }, { status: 400 })
    }

    // 1. Authenticate user by forwarding JWT to Hasura
    const profileRes = await fetch(NHOST_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        query: `
          query GetMyUserId {
            org_members(limit: 1) {
              user_id
            }
          }
        `
      }),
    })

    if (!profileRes.ok) {
      return NextResponse.json({ error: 'Unauthorized: token validation failed' }, { status: 401 })
    }

    const profileJson = await profileRes.json()
    const userId = profileJson.data?.org_members?.[0]?.user_id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: user profile not found' }, { status: 401 })
    }

    // 2. Fetch the workflow run details
    const runData = await adminGraphqlRequest(`
      query GetWorkflowRun($id: uuid!) {
        workflow_runs_by_pk(id: $id) {
          id
          status
          workflow {
            id
            org_id
            name
          }
        }
      }
    `, { id: run_id })

    if (!runData?.workflow_runs_by_pk) {
      return NextResponse.json({ error: 'Workflow run not found' }, { status: 404 })
    }

    const run = runData.workflow_runs_by_pk
    const orgId = run.workflow.org_id
    const workflowId = run.workflow.id

    // 3. Authorize the user's role in the workflow's organization
    const memberData = await adminGraphqlRequest(`
      query CheckMembership($org_id: uuid!, $user_id: uuid!) {
        org_members(where: { org_id: { _eq: $org_id }, user_id: { _eq: $user_id } }) {
          role
        }
      }
    `, { org_id: orgId, user_id: userId })

    if (!memberData?.org_members?.length) {
      return NextResponse.json({ error: 'Forbidden: you do not belong to this organization' }, { status: 403 })
    }

    const role = memberData.org_members[0].role
    if (role !== 'owner' && role !== 'editor') {
      return NextResponse.json({ error: 'Forbidden: only owners and editors can approve runs' }, { status: 403 })
    }

    // 4. Find the step run currently in 'paused' status
    const waitingStepRuns = await adminGraphqlRequest(`
      query GetWaitingStepRuns($run_id: uuid!) {
        step_runs(where: { workflow_run_id: { _eq: $run_id }, status: { _eq: "paused" } }) {
          id
        }
      }
    `, { run_id })

    if (!waitingStepRuns?.step_runs?.length) {
      return NextResponse.json({ error: 'Bad Request: no step runs are paused for approval' }, { status: 400 })
    }

    const waitingStepRunId = waitingStepRuns.step_runs[0].id

    // 5. Update step run to completed and persist approval info
    await adminGraphqlRequest(`
      mutation ApproveStepRun($id: uuid!, $approved_by: uuid!, $approved_at: timestamptz!) {
        update_step_runs_by_pk(
          pk_columns: { id: $id }
          _set: {
            status: "completed"
            approved_by: $approved_by
            approved_at: $approved_at
            output: { approved: true, message: "Step approved and execution resumed" }
          }
        ) {
          id
        }
      }
    `, {
      id: waitingStepRunId,
      approved_by: userId,
      approved_at: new Date().toISOString(),
    })

    // 6. Resume workflow run execution
    const origin = request.nextUrl.origin
    const triggerRes = await fetch(`${origin}/api/trigger-workflow-run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: { name: 'triggerWorkflowRun' },
        input: {
          workflow_id: workflowId,
          run_id: run_id,
        },
        session_variables: {
          'x-hasura-user-id': userId,
        },
      }),
    })

    if (!triggerRes.ok) {
      const triggerError = await triggerRes.json()
      return NextResponse.json({
        error: 'Workflow run resumed but execution failed',
        details: triggerError.details || triggerError.error || 'Execution engine failure',
      }, { status: 500 })
    }

    const triggerJson = await triggerRes.json()
    return NextResponse.json({
      message: 'Workflow approved and completed successfully',
      run_id: run_id,
      status: triggerJson.status,
    })
  } catch (err: any) {
    console.error('[APPROVE_WORKFLOW_RUN_ERROR]', err)
    return NextResponse.json({
      error: 'Failed to approve workflow run',
      details: err.message,
    }, { status: 500 })
  }
}
