import { NextRequest, NextResponse } from 'next/server'

const NHOST_ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET
const NHOST_BACKEND_URL = process.env.NHOST_BACKEND_URL
const NHOST_REGION = process.env.NEXT_PUBLIC_NHOST_REGION || process.env.NHOST_REGION || 'ap-south-1'
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'demo-webhook-secret-123'

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
    // 1. Authenticate the webhook request using a signature / secret token
    const receivedSecret = request.headers.get('x-webhook-secret') || request.nextUrl.searchParams.get('secret')
    if (!receivedSecret || receivedSecret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: invalid or missing x-webhook-secret' }, { status: 401 })
    }

    const { workflow_id, customer_message } = await request.json()
    if (!workflow_id) {
      return NextResponse.json({ error: 'Missing workflow_id in request body' }, { status: 400 })
    }

    // 2. Fetch the workflow creator to run the workflow under their identity context
    const workflowData = await adminGraphqlRequest(`
      query GetWorkflowCreator($id: uuid!) {
        workflows_by_pk(id: $id) {
          id
          created_by
        }
      }
    `, { id: workflow_id })

    if (!workflowData?.workflows_by_pk) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const creatorId = workflowData.workflows_by_pk.created_by
    if (!creatorId) {
      return NextResponse.json({ error: 'Workflow has no valid creator assigned' }, { status: 400 })
    }

    // 3. Trigger execution engine with the resolved creator ID
    const origin = request.nextUrl.origin
    const triggerRes = await fetch(`${origin}/api/trigger-workflow-run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: { name: 'triggerWorkflowRun' },
        input: {
          workflow_id,
          customer_message,
        },
        session_variables: {
          'x-hasura-user-id': creatorId,
        },
      }),
    })

    if (!triggerRes.ok) {
      const triggerError = await triggerRes.json()
      return NextResponse.json({
        error: 'Webhook trigger processed but execution failed',
        details: triggerError.details || triggerError.error || 'Execution engine failure',
      }, { status: 500 })
    }

    const triggerJson = await triggerRes.json()
    return NextResponse.json({
      message: 'Workflow webhook trigger initialized successfully',
      run_id: triggerJson.run_id,
      status: triggerJson.status,
    })
  } catch (err: any) {
    console.error('[WEBHOOK_TRIGGER_ERROR]', err)
    return NextResponse.json({
      error: 'Failed to process webhook trigger',
      details: err.message,
    }, { status: 500 })
  }
}
