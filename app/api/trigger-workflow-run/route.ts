import { NextRequest, NextResponse } from 'next/server'

// Environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY
const NHOST_ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET
const NHOST_BACKEND_URL = process.env.NHOST_BACKEND_URL

if (!GROQ_API_KEY) {
  console.warn('GROQ_API_KEY is not set')
}
if (!NHOST_ADMIN_SECRET) {
  console.error('NHOST_ADMIN_SECRET is not set')
}
if (!NHOST_BACKEND_URL) {
  console.error('NHOST_BACKEND_URL is not set')
}

// Helper function to make a GraphQL request to Hasura (using admin secret for server-side operations)
const graphqlRequest = async (query: string, variables: Record<string, any> = {}) => {
  const response = await fetch(`${NHOST_BACKEND_URL}/v1/graphql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': NHOST_ADMIN_SECRET || '',
    },
    body: JSON.stringify({ query, variables }),
  })

  const json = await response.json()
  if (json.errors) {
    throw new Error(json.errors.map((e: any) => e.message).join('. '))
  }
  return json.data
}

// Helper function to make an HTTP request with retry logic
const httpRequestWithRetry = async (
  url: string,
  options: RequestInit = {},
  maxAttempts = 2
) => {
  let lastError: any
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        // Timeout after 10 seconds
        signal: AbortSignal.timeout(10000),
      })

      // Retry on 5xx errors
      if (response.status >= 500 && response.status < 600) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // For 4xx errors, we don't retry (except maybe 429, but we keep it simple)
      if (response.status >= 400 && response.status < 500) {
        // We'll still return the response so the caller can handle 4xx as needed
        return response
      }

      return response
    } catch (error: any) {
      lastError = error
      if (attempt === maxAttempts) {
        throw error
      }
      // Wait for a short delay before retrying (e.g., 500ms)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  throw lastError
}

// Helper function to call Groq LLM API with retry logic
const llmCallWithRetry = async (
  model: string,
  prompt: string,
  maxAttempts = 2
) => {
  let lastError: any
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      })

      if (!response.ok) {
        // Retry on 5xx errors
        if (response.status >= 500 && response.status < 600) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        // For 4xx errors, we don't retry
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || ''
    } catch (error: any) {
      lastError = error
      if (attempt === maxAttempts) {
        throw error
      }
      // Wait for a short delay before retrying
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  throw lastError
}

// Helper function to evaluate a simple condition on the previous output
const evaluateCondition = (condition: any, previousOutput: any) => {
  // If previousOutput is a string, try to parse it as JSON
  let parsedOutput: any = previousOutput
  if (typeof previousOutput === 'string') {
    try {
      parsedOutput = JSON.parse(previousOutput)
    } catch (e) {
      // If parsing fails, we treat it as a string
      parsedOutput = previousOutput
    }
  }

  // Handle condition format: { field: string, operator: string, value: any }
  if (
    condition &&
    typeof condition === 'object' &&
    condition.field !== undefined &&
    condition.operator !== undefined &&
    condition.value !== undefined
  ) {
    const fieldValue = (parsedOutput as any)[condition.field]
    const operator = condition.operator
    const value = condition.value

    switch (operator) {
      case 'equals':
        return fieldValue === value
      case 'not_equals':
        return fieldValue !== value
      case 'greater_than':
        return fieldValue > value
      case 'less_than':
        return fieldValue < value
      case 'greater_than_or_equals':
        return fieldValue >= value
      case 'less_than_or_equals':
        return fieldValue <= value
      case 'contains':
        if (typeof fieldValue === 'string' && typeof value === 'string') {
          return fieldValue.includes(value)
        }
        return false
      case 'starts_with':
        if (typeof fieldValue === 'string' && typeof value === 'string') {
          return fieldValue.startsWith(value)
        }
        return false
      case 'ends_with':
        if (typeof fieldValue === 'string' && typeof value === 'string') {
          return fieldValue.endsWith(value)
        }
        return false
      default:
        return false
    }
  }

  // If condition is not in the expected format, return false
  return false
}

export async function POST(request: NextRequest) {
  try {
    const { workflow_id } = await request.json()

    // Get user ID from Hasura headers
    const userId = request.headers.get('x-hasura-user-id') || request.headers.get('X-Hasura-User-Id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: missing user ID' }, { status: 401 })
    }

    // Get admin secret from environment
    const adminSecret = process.env.NHOST_ADMIN_SECRET
    if (!adminSecret) {
      console.error('NHOST_ADMIN_SECRET is not set')
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const graphqlEndpoint = `${process.env.NHOST_BACKEND_URL}/v1/graphql`

    // Helper function to make a GraphQL request
    const graphqlRequest = async (query: string, variables: Record<string, any> = {}) => {
      const response = await fetch(graphqlEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': adminSecret,
        },
        body: JSON.stringify({ query, variables }),
      })

      const json = await response.json()
      if (json.errors) {
        throw new Error(json.errors.map((e: any) => e.message).join('. '))
      }
      return json.data
    }

    // 1. Load the workflow and check existence
    const workflowData = await graphqlRequest(`
      query GetWorkflow($id: uuid!) {
        workflows_by_pk(id: $id) {
          id
          org_id
          name
        }
      }
    `, { id: workflow_id })

    if (!workflowData?.workflows_by_pk) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const workflow = workflowData.workflows_by_pk
    const orgId = workflow.org_id

    // 2. Check user's membership and role in the organization
    const memberData = await graphqlRequest(`
      query CheckMember($org_id: uuid!, $user_id: uuid!) {
        org_members(where: { org_id: { _eq: $org_id }, user_id: { _eq: $user_id } }) {
          role
        }
      }
    `, { org_id: orgId, user_id: userId })

    if (!memberData?.org_members?.length) {
      return NextResponse.json({ error: 'User is not a member of the organization' }, { status: 403 })
    }

    const role = memberData.org_members[0].role
    if (role !== 'owner' && role !== 'editor') {
      return NextResponse.json({ error: 'Insufficient permissions: only owners and editors can trigger workflows' }, { status: 403 })
    }

    // 3. Check organization quota
    const orgData = await graphqlRequest(`
      query GetOrganization($id: uuid!) {
        organizations_by_pk(id: $id) {
          quota_limit
          quota_used
        }
      }
    `, { id: orgId })

    if (!orgData?.organizations_by_pk) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const { quota_limit, quota_used } = orgData.organizations_by_pk
    if (quota_used >= quota_limit) {
      return NextResponse.json({ error: 'Organization quota exceeded' }, { status: 429 })
    }

    // 4. Create workflow_run
    const runData = await graphqlRequest(`
      mutation CreateWorkflowRun($workflow_id: uuid!, $created_by: uuid!) {
        insert_workflow_runs_one(object: {
          workflow_id: $workflow_id
          status: "running"
          created_by: $created_by
          started_at: now()
        }) {
          id
          status
          started_at
        }
      }
    `, { workflow_id: workflow_id, created_by: userId })

    if (!runData?.insert_workflow_runs_one) {
      return NextResponse.json({ error: 'Failed to create workflow run' }, { status: 500 })
    }

    const workflowRun = runData.insert_workflow_runs_one
    const runId = workflowRun.id

    // 5. Load workflow steps in position order
    const stepsData = await graphqlRequest(`
      query GetWorkflowSteps($workflow_id: uuid!) {
        workflow_steps(where: { workflow_id: { _eq: $workflow_id } }, order_by: { position: asc }) {
          id
          type
          config
        }
      }
    `, { workflow_id: workflow_id })

    const steps = stepsData?.workflow_steps || []

    // 6. Initialize previous output as null
    let previousOutput = null

    // 7. Process each step
    let currentStepIndex = 0
    let skipNextStep = false
    let skippedStepRunId: string | null = null

    while (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex]
      const stepType = step.type
      const stepConfig = step.config || {}

      // If we are supposed to skip this step, mark it as skipped and continue
      if (skipNextStep) {
        // Create a step_run for this step with status skipped
        const skippedStepRunData = await graphqlRequest(`
          mutation CreateSkippedStepRun($workflow_run_id: uuid!, $workflow_step_id: uuid!, $reason: String!) {
            insert_step_runs_one(object: {
              workflow_run_id: $workflow_run_id
              workflow_step_id: $workflow_step_id
              status: "skipped"
              input: $input
              attempt_count: 1
              started_at: now()
              completed_at: now()
              output: $reason
            }) {
              id
            }
          }
        `, {
          workflow_run_id: runId,
          workflow_step_id: step.id,
          input: previousOutput,
          reason: `Skipped due to conditional branch at step ${skippedStepRunId ? '(previous)' : ''}`
        })

        if (!skippedStepRunData?.insert_step_runs_one) {
          return NextResponse.json({ error: 'Failed to create skipped step run' }, { status: 500 })
        }

        // Reset skipNextStep
        skipNextStep = false
        // Move to the next step
        currentStepIndex += 1
        // The output of a skipped step is the reason? We'll set previousOutput to the reason so that the next step can use it if needed.
        // But note: the skipped step does not produce an output, so the next step should not use its output.
        // We'll set previousOutput to null? Or we can keep it as the output of the last executed step.
        // We'll keep previousOutput as the output of the last executed step (not the skipped step).
        // So we do not update previousOutput here.
        continue
      }

      // Create step_run for this step (we'll update it later based on execution)
      const stepRunData = await graphqlRequest(`
        mutation CreateStepRun($workflow_run_id: uuid!, $workflow_step_id: uuid!) {
          insert_step_runs_one(object: {
            workflow_run_id: $workflow_run_id
            workflow_step_id: $workflow_step_id
            status: "running"
            input: $input
            attempt_count: 1
            started_at: now()
          }) {
            id
          }
        }
      `, {
        workflow_run_id: runId,
        workflow_step_id: step.id,
        input: previousOutput,
      })

      if (!stepRunData?.insert_step_runs_one) {
        // If we fail to create a step run, we should update the workflow run to failed and break
        await graphqlRequest(`
          mutation UpdateWorkflowRunFailed($id: uuid!) {
            update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "failed", completed_at: now() }) {
              id
            }
          }
        `, { id: runId })
        return NextResponse.json({ error: 'Failed to create step run' }, { status: 500 })
      }

      const stepRun = stepRunData.insert_step_runs_one
      const stepRunId = stepRun.id

      let stepOutput = null
      let stepError = null
      let stepStatus = 'completed'

      try {
        // 8. Execute the step based on type
        switch (stepType) {
          case 'llm_call': {
            const { model = 'llama3-8b-8192', prompt } = stepConfig
            if (!prompt) {
              throw new Error('LLM call step missing prompt in config')
            }
            // Interpolate previous output into the prompt if needed
            const interpolatedPrompt = prompt.replace(
              /\{\{previous_output\}\}/g,
              previousOutput !== null ? JSON.stringify(previousOutput) : ''
            )
            stepOutput = await llmCallWithRetry(model, interpolatedPrompt)
            break
          }
          case 'http_request': {
            const { method = 'GET', url, headers = {}, body } = stepConfig
            if (!url) {
              throw new Error('HTTP request step missing url in config')
            }
            // Interpolate previous output into the url, headers, or body if needed
            // For simplicity, we only support interpolation in the url as a placeholder {{previous_output}}
            let interpolatedUrl = url
            if (typeof previousOutput === 'string') {
              interpolatedUrl = url.replace(/\{\{previous_output\}\}/g, previousOutput)
            } else if (previousOutput !== null) {
              try {
                interpolatedUrl = url.replace(/\{\{previous_output\}\}/g, JSON.stringify(previousOutput))
              } catch (e) {
                // If we can't stringify, we don't interpolate
              }
            }

            const response = await httpRequestWithRetry(interpolatedUrl, {
              method,
              headers: typeof headers === 'object' ? headers : JSON.parse(headers),
              body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
            })

            // Store response status, body, and headers in step output
            const responseBody = await response.text()
            stepOutput = {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              body: responseBody,
            }
            break
          }
          case 'conditional_branch': {
            const condition = stepConfig.condition
            if (!condition) {
              throw new Error('Conditional branch step missing condition in config')
            }
            const conditionMet = evaluateCondition(condition, previousOutput)
            stepOutput = {
              condition_met: conditionMet,
              condition,
              previous_output: previousOutput,
            }
            // Determine if we should skip the next step based on condition and config
            const skipOnTrue = stepConfig.skipOnTrue || false
            const skipOnFalse = stepConfig.skipOnFalse || false
            if ((conditionMet && skipOnTrue) || (!conditionMet && skipOnFalse)) {
              // Set flag to skip the next step
              skipNextStep = true
            }
            break
          }
          case 'db_write':
          case 'notify':
          case 'approval_gate':
            // For now, we'll treat these as stubs (as per the instruction not to implement them yet)
            stepOutput = {
              stub: true,
              step_type: stepType,
              message: `Step type ${stepType} is not yet implemented; treated as stub.`,
            }
            break
          default:
            throw new Error(`Unknown step type: ${stepType}`)
        }

        // If we have a stepOutput from the step execution, we'll use it
        if (stepOutput !== null && stepOutput !== undefined) {
          // Update step_run with output and status completed
          await graphqlRequest(`
            mutation UpdateStepRunCompleted($id: uuid!, $output: jsonb) {
              update_step_runs_by_pk(pk_columns: { id: $id }, _set: { output: $output, status: "completed", completed_at: now() }) {
                id
              }
            }
          `, { id: stepRunId, output: stepOutput })
        } else {
          // If stepOutput is null, we still mark as completed (should not happen)
          await graphqlRequest(`
            mutation UpdateStepRunCompleted($id: uuid!) {
              update_step_runs_by_pk(pk_columns: { id: $id }, _set: { status: "completed", completed_at: now() }) {
                id
              }
            }
          `, { id: stepRunId })
        }

        // Set previous output for the next step
        previousOutput = stepOutput
      } catch (error) {
        // If step execution fails, update step_run to failed and break
        stepError = error instanceof Error ? error.message : String(error)
        await graphqlRequest(`
          mutation UpdateStepRunFailed($id: uuid!, $message: String!) {
            update_step_runs_by_pk(pk_columns: { id: $id }, _set: { status: "failed", error: $message, completed_at: now() }) {
              id
            }
          }
        `, { id: stepRunId, message: stepError })
        stepStatus = 'failed'

        // Update workflow_run to failed
        await graphqlRequest(`
          mutation UpdateWorkflowRunFailed($id: uuid!) {
            update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "failed", completed_at: now() }) {
              id
            }
          }
        `, { id: runId })
        return NextResponse.json({ error: `Step execution failed: ${stepError}` }, { status: 500 })
      }

      // Move to the next step
      currentStepIndex += 1
    }

    // 10. All steps succeeded: update workflow_run to completed and increment quota
    await graphqlRequest(`
      mutation UpdateWorkflowRunCompleted($id: uuid!) {
        update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "completed", completed_at: now() }) {
          id
        }
      }
    `, { id: runId })

    // Increment quota_used by 1
    await graphqlRequest(`
      mutation IncrementQuota($id: uuid!) {
        update_organizations_by_pk(pk_columns: { id: $id }, _inc: { quota_used: 1 }) {
          id
          quota_used
        }
      }
    `, { id: orgId })

    // 11. Return the workflow run ID and status
    return NextResponse.json({ run_id: runId, status: 'completed' })
  } catch (error) {
    console.error('Error in triggerWorkflowRun:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
