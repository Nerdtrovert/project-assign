import { NextRequest, NextResponse } from 'next/server'

// Environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY
const NHOST_ADMIN_SECRET = process.env.NHOST_ADMIN_SECRET
const NHOST_BACKEND_URL = process.env.NHOST_BACKEND_URL
const NHOST_REGION = process.env.NEXT_PUBLIC_NHOST_REGION || process.env.NHOST_REGION || 'ap-south-1'

const resolveGraphqlEndpoint = (backendUrl: string | undefined) => {
  if (!backendUrl) {
    return ''
  }

  const cleanUrl = backendUrl.replace(/\/+$/, '')
  const match = cleanUrl.match(/https?:\/\/([^.]+)\.nhost\.(run|app)/)

  if (match) {
    const [, subdomain, tld] = match
    return `https://${subdomain}.graphql.${NHOST_REGION}.nhost.${tld}/v1`
  }

  return `${cleanUrl}/v1/graphql`
}

const NHOST_GRAPHQL_ENDPOINT = resolveGraphqlEndpoint(NHOST_BACKEND_URL)

if (!GROQ_API_KEY) {
  console.warn('GROQ_API_KEY is not set')
}
if (!NHOST_ADMIN_SECRET) {
  console.error('NHOST_ADMIN_SECRET is not set')
}
if (!NHOST_BACKEND_URL) {
  console.error('NHOST_BACKEND_URL is not set')
}

type WorkflowExecutionError = Error & {
  attempts?: number
  operation?: string
  retryable?: boolean
}

const createExecutionError = (message: string, retryable: boolean): WorkflowExecutionError => {
  const error = new Error(message) as WorkflowExecutionError & { retryable?: boolean }
  error.retryable = retryable
  return error
}

const graphqlRequest = async (query: string, variables: Record<string, unknown> = {}) => {
  const opMatch = query.match(/(query|mutation)\s+(\w+)/)
  const opName = opMatch ? opMatch[2] : 'global_graphql_op'

  console.log(`[GRAPHQL-REQUEST] Starting: ${opName}`)

  let lastError: Error | null = null
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

      console.log(`[GRAPHQL-RESPONSE] ${opName} HTTP Status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        console.error('[WORKFLOW-GRAPHQL-ERROR]', {
          operation: opName,
          httpStatus: response.status,
          message: response.statusText,
        })
        const err = new Error(`HTTP ${response.status}: ${response.statusText}`) as WorkflowExecutionError
        err.operation = opName
        throw err
      }

      const json = await response.json()
      const hasErrors = !!json.errors
      const hasData = !!json.data

      console.log(`[GRAPHQL-RESPONSE] ${opName} hasData: ${hasData}, hasErrors: ${hasErrors}`)

      if (json.errors) {
        json.errors.forEach((graphqlError: { message: string; path?: unknown; extensions?: { code?: string } }) => {
          console.error('[WORKFLOW-GRAPHQL-ERROR]', {
            operation: opName,
            message: graphqlError.message,
            path: graphqlError.path ?? null,
            code: graphqlError.extensions?.code ?? null,
          })
        })
        const err = new Error(
          `GraphQL ${opName} failed: ${json.errors.map((graphqlError: { message: string }) => graphqlError.message).join('; ')}`
        ) as WorkflowExecutionError
        err.operation = opName
        throw err
      }

      return json.data
    } catch (err: any) {
      console.warn(`[GRAPHQL-WARNING] Attempt ${attempt} failed for ${opName}: ${err.message}`)
      lastError = err
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }

  const operationError = lastError as WorkflowExecutionError
  if (operationError && !operationError.operation) {
    operationError.operation = opName
  }
  throw operationError || new Error(`GraphQL operation ${opName} failed after 3 attempts`)
}

// Helper function to make an HTTP request with retry logic
const httpRequestWithRetry = async (
  url: string,
  options: RequestInit = {},
  maxAttempts = 2,
  stepId?: string
): Promise<{ response: Response; bodyText: string; attempts: number }> => {
  const startTime = Date.now()
  const timeoutValue = 10000
  const method = options.method || 'GET'

  if (stepId) {
    console.log(`[HTTP_STEP_START] Step: ${stepId} | URL: ${url} | Method: ${method} | Timeout: ${timeoutValue}ms`)
  }

  let lastError: WorkflowExecutionError | undefined
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptStartTime = Date.now()
    const controller = new AbortController()
    const signal = controller.signal
    const timeoutId = setTimeout(() => controller.abort(), timeoutValue)

    if (stepId) {
      console.log(`[HTTP_ATTEMPT] Step: ${stepId} | Attempt: ${attempt}/${maxAttempts} | Started`)
    }

    try {
      const response = await fetch(url, {
        ...options,
        signal,
      })

      // Read response body text under the protection of the active abort signal
      const bodyText = await response.text()
      clearTimeout(timeoutId)

      const elapsed = Date.now() - attemptStartTime
      if (stepId) {
        console.log(`[HTTP_RESPONSE] Step: ${stepId} | Attempt: ${attempt}/${maxAttempts} | Status: ${response.status} | Time: ${elapsed}ms`)
      }

      const isError5xx = response.status >= 500 && response.status < 600
      const isError4xx = response.status >= 400 && response.status < 500

      if (isError5xx) {
        const willRetry = attempt < maxAttempts
        if (stepId && willRetry) {
          console.log(`[HTTP_RETRY] Step: ${stepId} | Attempt: ${attempt}/${maxAttempts} | Retrying 5xx status: ${response.status}`)
        }
        throw createExecutionError(`HTTP ${response.status}: ${response.statusText}`, true)
      }

      if (isError4xx) {
        throw createExecutionError(`HTTP ${response.status}: ${response.statusText}`, false)
      }

      return { response, bodyText, attempts: attempt }
    } catch (error: unknown) {
      clearTimeout(timeoutId)
      const elapsed = Date.now() - attemptStartTime

      let executionError: WorkflowExecutionError
      if (error instanceof Error && (error.name === 'AbortError' || error.message.includes('aborted'))) {
        executionError = createExecutionError('Request timed out', true)
      } else {
        executionError = error instanceof Error ? (error as WorkflowExecutionError) : createExecutionError(String(error), true)
      }

      executionError.attempts = attempt
      lastError = executionError
      
      const willRetry = executionError.retryable !== false && attempt < maxAttempts

      if (stepId) {
        if (willRetry) {
          console.log(`[HTTP_RETRY] Step: ${stepId} | Attempt: ${attempt}/${maxAttempts} | Error: ${executionError.message} | Retrying: true`)
        } else {
          console.log(`[HTTP_STEP_ERROR] Step: ${stepId} | Attempt: ${attempt}/${maxAttempts} | Error: ${executionError.message} | Time: ${elapsed}ms | Retrying: false`)
        }
      }

      if (executionError.retryable === false || attempt === maxAttempts) {
        throw executionError
      }

      // Wait for a short delay before retrying (e.g., 500ms)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  throw lastError ?? createExecutionError('HTTP request failed', true)
}

// Helper function to call Groq LLM API with retry logic
const llmCallWithRetry = async (
  model: string,
  prompt: string,
  maxAttempts = 2
): Promise<{ output: string; attempts: number }> => {
  if (!GROQ_API_KEY) {
    throw createExecutionError('GROQ_API_KEY is not configured', false)
  }

  let lastError: WorkflowExecutionError | undefined
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
        console.error('[WORKFLOW-GROQ-ERROR]', {
          model,
          attempt,
          httpStatus: response.status,
          message: response.statusText,
        })
        // Retry on 5xx errors
        if (response.status >= 500 && response.status < 600) {
          throw createExecutionError(`HTTP ${response.status}: ${response.statusText}`, true)
        }
        // For 4xx errors, we don't retry
        throw createExecutionError(`HTTP ${response.status}: ${response.statusText}`, false)
      }

      const data = await response.json()
      return { output: data.choices[0]?.message?.content || '', attempts: attempt }
    } catch (error: unknown) {
      const executionError = error as WorkflowExecutionError & { retryable?: boolean }
      executionError.attempts = attempt
      lastError = executionError
      if (executionError.retryable === false || attempt === maxAttempts) {
        throw executionError
      }
      // Wait for a short delay before retrying
      await new Promise(resolve => setTimeout(resolve, 500))
    }
  }
  throw lastError ?? createExecutionError('LLM request failed', true)
}

// Helper function to evaluate a simple condition on the previous output
const evaluateCondition = (condition: any, previousOutput: any) => {
  // If previousOutput is a string, try to parse it as JSON
  let parsedOutput: any = previousOutput
  if (typeof previousOutput === 'string') {
    const cleanText = previousOutput.replace(/```json/gi, '').replace(/```/g, '').trim()
    try {
      parsedOutput = JSON.parse(cleanText)
    } catch (e) {
      // If parsing fails, we treat the clean string as output
      parsedOutput = cleanText
    }
  }

  if (typeof condition === 'string') {
    const match = condition.trim().match(/^previous\.output(?:\.classification)?\s*(?:==|===)\s*["']?([^"'\s]+)["']?$/)
    if (!match) {
      return false
    }

    const [, expectedValue] = match
    const classification =
      parsedOutput && typeof parsedOutput === 'object' && 'classification' in parsedOutput
        ? parsedOutput.classification
        : parsedOutput

    return typeof classification === 'string' && classification.trim().toLowerCase() === expectedValue.toLowerCase()
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
  let currentOperation: string | undefined
  let runId: string | null = null

  try {
    console.log('[WORKFLOW] triggerWorkflowRun handler reached')

    // Parse the Hasura Action body
    const body = await request.json()

    console.log('[WORKFLOW] input received:', {
      hasInput: !!body?.input,
      hasWorkflowId: !!body?.input?.workflow_id,
      hasSessionVariables: !!body?.session_variables,
      hasUserId: !!body?.session_variables?.['x-hasura-user-id'],
    })
    console.log('[WORKFLOW] environment:', {
      hasAdminSecret: !!NHOST_ADMIN_SECRET,
      hasBackendUrl: !!NHOST_BACKEND_URL,
      hasGraphqlEndpoint: !!NHOST_GRAPHQL_ENDPOINT,
      hasGroqApiKey: !!GROQ_API_KEY,
    })

    if (body?.action?.name !== 'triggerWorkflowRun') {
      return NextResponse.json({ error: 'Invalid Hasura Action request' }, { status: 400 })
    }

    const workflow_id = body?.input?.workflow_id
    if (!workflow_id) {
      return NextResponse.json({ error: 'Missing workflow_id in Hasura Action input' }, { status: 400 })
    }

    const customer_message = body?.input?.customer_message || null

    const userId = body?.session_variables?.['x-hasura-user-id']

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: missing user ID' }, { status: 401 })
    }

    // Get admin secret from environment
    const adminSecret = process.env.NHOST_ADMIN_SECRET
    if (!adminSecret) {
      throw new Error('NHOST_ADMIN_SECRET is not configured')
    }

    // 1. Load the workflow and check existence
    currentOperation = 'GetWorkflow'
    console.log('[WORKFLOW] operation: GetWorkflow')
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
    currentOperation = 'CheckMembership'
    console.log('[WORKFLOW] operation: CheckMembership')
    const memberData = await graphqlRequest(`
      query CheckMembership($org_id: uuid!, $user_id: uuid!) {
        org_members(where: { org_id: { _eq: $org_id }, user_id: { _eq: $user_id } }) {
          role
        }
      }
    `, { org_id: orgId, user_id: userId })

    if (!memberData?.org_members?.length) {
      return NextResponse.json({ error: 'User is not a member of the organization' }, { status: 403 })
    }

    const memberRole = memberData.org_members[0].role
    if (memberRole !== 'owner' && memberRole !== 'editor') {
      return NextResponse.json({ error: 'Insufficient permissions: only owners and editors can trigger workflows' }, { status: 403 })
    }

    // 3. Check organization quota
    currentOperation = 'CheckQuota'
    console.log('[WORKFLOW] operation: CheckQuota')
    const orgData = await graphqlRequest(`
      query CheckQuota($id: uuid!) {
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

    // 4. Resolve / Create workflow run
    const run_id = body?.input?.run_id || null
    let workflowRun = null

    if (run_id) {
      currentOperation = 'GetWorkflowRun'
      console.log('[WORKFLOW] operation: GetWorkflowRun')
      const runQueryData = await graphqlRequest(`
        query GetWorkflowRun($id: uuid!) {
          workflow_runs_by_pk(id: $id) {
            id
            workflow_id
            status
            trigger_type
            workflow {
              id
              org_id
              name
            }
          }
        }
      `, { id: run_id })

      if (!runQueryData?.workflow_runs_by_pk) {
        return NextResponse.json({ error: 'Workflow run not found' }, { status: 404 })
      }

      const run = runQueryData.workflow_runs_by_pk
      if (run.workflow.id !== workflow_id) {
        return NextResponse.json({ error: 'Workflow ID mismatch for run' }, { status: 400 })
      }

      currentOperation = 'UpdateWorkflowRunRunning'
      console.log('[WORKFLOW] operation: UpdateWorkflowRunRunning')
      await graphqlRequest(`
        mutation UpdateWorkflowRunRunning($id: uuid!) {
          update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "running" }) {
            id
          }
        }
      `, { id: run_id })

      workflowRun = { id: run_id, status: 'running' }
      runId = run_id
    } else {
      currentOperation = 'CreateWorkflowRun'
      console.log('[WORKFLOW] operation: CreateWorkflowRun')
      const runData = await graphqlRequest(`
        mutation CreateWorkflowRun($workflow_id: uuid!, $created_by: uuid!, $started_at: timestamptz!, $trigger_type: String!) {
          insert_workflow_runs_one(object: {
            workflow_id: $workflow_id
            status: "running"
            created_by: $created_by
            started_at: $started_at
            trigger_type: $trigger_type
          }) {
            id
            status
            started_at
          }
        }
      `, {
        workflow_id,
        created_by: userId,
        started_at: new Date().toISOString(),
        trigger_type: body?.input?.trigger_type || 'manual',
      })

      if (!runData?.insert_workflow_runs_one) {
        throw new Error('CreateWorkflowRun returned no workflow run')
      }

      workflowRun = runData.insert_workflow_runs_one
      runId = workflowRun.id
    }

    // 5. Load workflow steps and existing step runs
    currentOperation = 'LoadWorkflowStepsAndRuns'
    console.log('[WORKFLOW] operation: LoadWorkflowStepsAndRuns')
    const data = await graphqlRequest(`
      query GetStepsAndRuns($workflow_id: uuid!, $run_id: uuid!) {
        workflow_steps(where: { workflow_id: { _eq: $workflow_id } }, order_by: { position: asc }) {
          id
          type
          config
          position
        }
        step_runs(where: { workflow_run_id: { _eq: $run_id } }) {
          id
          workflow_step_id
          status
          output
          error
          input
        }
      }
    `, { workflow_id, run_id: runId })

    const steps = data?.workflow_steps || []
    const stepRuns = data?.step_runs || []

    // 6. Initialize previous output with customer message if provided
    let previousOutput = customer_message

    // 7. Process each step
    let currentStepIndex = 0
    let skipNextStep = false

    while (currentStepIndex < steps.length) {
      const step = steps[currentStepIndex]
      const stepType = step.type
      const stepConfig = step.config || {}

      // Check if this step already executed in a previous attempt of the same run
      const existingStepRun = stepRuns.find((r: any) => r.workflow_step_id === step.id)

      if (existingStepRun) {
        if (existingStepRun.status === 'completed' || existingStepRun.status === 'skipped') {
          console.log(`[WORKFLOW] Step ${step.id} (${stepType}) already ran with status ${existingStepRun.status}. Reusing output.`)
          previousOutput = existingStepRun.output
          
          if (existingStepRun.status === 'skipped') {
            skipNextStep = false
          } else {
            if (stepType === 'conditional_branch' && existingStepRun.output) {
              const conditionMet = existingStepRun.output.condition_met
              const skipOnTrue = stepConfig.skipOnTrue || false
              const skipOnFalse = stepConfig.skipOnFalse || false
              if ((conditionMet && skipOnTrue) || (!conditionMet && skipOnFalse)) {
                skipNextStep = true
              }
            }
          }
          currentStepIndex += 1
          continue
        }

        if (existingStepRun.status === 'paused') {
          console.log(`[WORKFLOW] Step ${step.id} is paused for approval. Pausing execution.`)
          currentOperation = 'MarkWorkflowRunWaiting'
          await graphqlRequest(`
            mutation UpdateWorkflowRunWaiting($id: uuid!) {
              update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "paused" }) {
                id
              }
            }
          `, { id: runId })
          return NextResponse.json({ run_id: runId, status: 'paused' })
        }
      }

      // If we are supposed to skip this step, mark it as skipped and continue
      if (skipNextStep) {
        // Create a step_run for this step with status skipped
        currentOperation = 'CreateSkippedStepRun'
        console.log('[WORKFLOW] operation: CreateSkippedStepRun')
        const skippedStepRunData = await graphqlRequest(`
          mutation CreateSkippedStepRun($workflow_run_id: uuid!, $workflow_step_id: uuid!, $input: jsonb, $reason: jsonb!) {
            insert_step_runs_one(object: {
              workflow_run_id: $workflow_run_id
              workflow_step_id: $workflow_step_id
              status: "skipped"
              input: $input
              attempt_count: 1
              output: $reason
            }) {
              id
            }
          }
        `, {
          workflow_run_id: runId,
          workflow_step_id: step.id,
          input: previousOutput,
          reason: 'Skipped due to the preceding conditional branch'
        })

        if (!skippedStepRunData?.insert_step_runs_one) {
          throw new Error('CreateSkippedStepRun returned no step run')
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
      currentOperation = 'CreateStepRun'
      console.log('[WORKFLOW] operation: CreateStepRun')
      const stepRunData = await graphqlRequest(`
        mutation CreateStepRun($workflow_run_id: uuid!, $workflow_step_id: uuid!, $input: jsonb) {
          insert_step_runs_one(object: {
            workflow_run_id: $workflow_run_id
            workflow_step_id: $workflow_step_id
            status: "running"
            input: $input
            attempt_count: 1
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
        currentOperation = 'MarkWorkflowRunFailed'
        console.log('[WORKFLOW] operation: MarkWorkflowRunFailed')
        await graphqlRequest(`
          mutation UpdateWorkflowRunFailed($id: uuid!, $completed_at: timestamptz!) {
            update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "failed", completed_at: $completed_at }) {
              id
            }
          }
        `, { id: runId, completed_at: new Date().toISOString() })
        throw new Error('CreateStepRun returned no step run')
      }

      const stepRun = stepRunData.insert_step_runs_one
      const stepRunId = stepRun.id

      let stepOutput = null
      let stepError = null
      let attemptCount = 1

      try {
        currentOperation = 'ExecuteStep'
        // 8. Execute the step based on type
        switch (stepType) {
          case 'llm_call': {
            const { model = 'llama-3.1-8b-instant', prompt } = stepConfig
            if (!prompt) {
              throw new Error('LLM call step missing prompt in config')
            }
            // Interpolate previous output into the prompt if needed
            const interpolatedPrompt = prompt.replace(
              /\{\{previous_output\}\}/g,
              previousOutput !== null
                ? (typeof previousOutput === 'string' ? previousOutput : JSON.stringify(previousOutput))
                : ''
            )
            const result = await llmCallWithRetry(model, interpolatedPrompt)
            stepOutput = result.output
            attemptCount = result.attempts
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

            const fetchOptions: RequestInit = {
              method,
              headers: typeof headers === 'object' ? headers : JSON.parse(headers),
            }
            if (method !== 'GET' && method !== 'HEAD' && body !== undefined && body !== null && body !== '') {
              fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
            }

            const result = await httpRequestWithRetry(interpolatedUrl, fetchOptions, 2, step.id)
            attemptCount = result.attempts

            // Store response status, body, and headers in step output
            stepOutput = {
              status: result.response.status,
              statusText: result.response.statusText,
              headers: Object.fromEntries(result.response.headers.entries()),
              body: result.bodyText,
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
          case 'approval_gate': {
            currentOperation = 'MarkStepRunWaiting'
            console.log('[WORKFLOW] Reached approval gate. Pausing execution.')
            await graphqlRequest(`
              mutation UpdateStepRunWaiting($id: uuid!, $message: String!) {
                update_step_runs_by_pk(pk_columns: { id: $id }, _set: { status: "paused", output: { approved: false, message: $message } }) {
                  id
                }
              }
            `, { id: stepRunId, message: stepConfig.message || 'Please review and approve this step.' })

            currentOperation = 'MarkWorkflowRunWaiting'
            await graphqlRequest(`
              mutation UpdateWorkflowRunWaiting($id: uuid!) {
                update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "paused" }) {
                  id
                }
              }
            `, { id: runId })

            return NextResponse.json({ run_id: runId, status: 'paused' })
          }
          case 'db_write':
          case 'notify':
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
          currentOperation = 'MarkStepRunCompleted'
          console.log('[WORKFLOW] operation: MarkStepRunCompleted')
          await graphqlRequest(`
            mutation UpdateStepRunCompleted($id: uuid!, $output: jsonb, $attempt_count: Int!) {
              update_step_runs_by_pk(pk_columns: { id: $id }, _set: { output: $output, status: "completed", attempt_count: $attempt_count }) {
                id
              }
            }
          `, { id: stepRunId, output: stepOutput, attempt_count: attemptCount })
        } else {
          // If stepOutput is null, we still mark as completed (should not happen)
          currentOperation = 'MarkStepRunCompleted'
          console.log('[WORKFLOW] operation: MarkStepRunCompleted')
          await graphqlRequest(`
            mutation UpdateStepRunCompleted($id: uuid!, $attempt_count: Int!) {
              update_step_runs_by_pk(pk_columns: { id: $id }, _set: { status: "completed", attempt_count: $attempt_count }) {
                id
              }
            }
          `, { id: stepRunId, attempt_count: attemptCount })
        }

        // Set previous output for the next step
        previousOutput = stepOutput
      } catch (error) {
        // If step execution fails, update step_run to failed
        const originalError = error instanceof Error ? error : new Error(String(error))
        stepError = originalError.message
        attemptCount = (error as WorkflowExecutionError).attempts ?? attemptCount

        // 1. Mark Step Run as Failed
        try {
          currentOperation = 'MarkStepRunFailed'
          console.log('[WORKFLOW] operation: MarkStepRunFailed')
          await graphqlRequest(`
            mutation UpdateStepRunFailed($id: uuid!, $message: String!, $attempt_count: Int!) {
              update_step_runs_by_pk(pk_columns: { id: $id }, _set: { status: "failed", error: $message, attempt_count: $attempt_count }) {
                id
              }
            }
          `, { id: stepRunId, message: stepError, attempt_count: attemptCount })
        } catch (stepRunFailedErr) {
          console.error('[WORKFLOW] Failed to mark step run as failed:', stepRunFailedErr)
        }

        // 2. Mark Workflow Run as Failed
        let markWorkflowFailedError = null
        if (runId) {
          try {
            currentOperation = 'MarkWorkflowRunFailed'
            console.log('[WORKFLOW] operation: MarkWorkflowRunFailed')
            await graphqlRequest(`
              mutation UpdateWorkflowRunFailed($id: uuid!, $completed_at: timestamptz!) {
                update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "failed", completed_at: $completed_at }) {
                  id
                }
              }
            `, { id: runId, completed_at: new Date().toISOString() })
          } catch (wfFailedErr: any) {
            console.error('[WORKFLOW] Failed to mark workflow run as failed:', wfFailedErr)
            markWorkflowFailedError = wfFailedErr
          }
        }

        // 3. Construct aggregated error object to prevent masking the original error
        const finalError = new Error(originalError.message) as WorkflowExecutionError
        finalError.stack = originalError.stack
        if (markWorkflowFailedError) {
          finalError.operation = 'MarkWorkflowRunFailed'
          finalError.message = `Step execution failed: [${originalError.message}]. Additionally, database update failed: [${markWorkflowFailedError.message}]`
        } else {
          finalError.operation = 'ExecuteStep'
          finalError.message = originalError.message
        }
        
        throw finalError
      }

      // Move to the next step
      currentStepIndex += 1
    }

    // 10. All steps succeeded: update workflow_run to completed and increment quota
    currentOperation = 'MarkWorkflowRunCompleted'
    console.log('[WORKFLOW] operation: MarkWorkflowRunCompleted')
    await graphqlRequest(`
      mutation UpdateWorkflowRunCompleted($id: uuid!, $completed_at: timestamptz!) {
        update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "completed", completed_at: $completed_at }) {
          id
        }
      }
    `, { id: runId, completed_at: new Date().toISOString() })

    // Increment quota_used by 1
    currentOperation = 'IncrementQuota'
    console.log('[WORKFLOW] operation: IncrementQuota')
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
  } catch (error: unknown) {
    const executionError = error as WorkflowExecutionError
    const safeOperationName = executionError.operation ?? currentOperation ?? 'unknown'

    console.error('[WORKFLOW_EXECUTION_ERROR]', {
      errorName: executionError.name,
      errorMessage: executionError.message,
      errorStack: executionError.stack,
      operation: safeOperationName,
    })

    // If runId exists, try to mark the workflow run as failed
    if (runId) {
      try {
        console.log('[WORKFLOW] Outer catch: marking workflow run failed in db')
        await graphqlRequest(`
          mutation UpdateWorkflowRunFailed($id: uuid!, $completed_at: timestamptz!) {
            update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "failed", completed_at: $completed_at }) {
              id
            }
          }
        `, { id: runId, completed_at: new Date().toISOString() })
      } catch (dbErr) {
        console.error('[WORKFLOW] Outer catch: failed to mark workflow run as failed in db:', dbErr)
      }
    }

    return NextResponse.json({
      error: 'Workflow execution failed',
      operation: safeOperationName,
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
