'use client'

import { useState, useEffect } from 'react'

type StepConfigProps = {
  stepType: string
  config: any
  onConfigChange: (config: any) => void
}

export function LLMCallConfig({ config, onConfigChange }: { config: any; onConfigChange: (config: any) => void }) {
  const [model, setModel] = useState(config?.model || '')
  const [prompt, setPrompt] = useState(config?.prompt || '')

  const handleChange = () => {
    onConfigChange({ model, prompt })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
          Model
        </label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors"
          placeholder="e.g., llama-3.1-8b-instant"
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs resize-none transition-colors"
          placeholder="Enter the prompt for the LLM..."
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>
    </div>
  )
}

type HttpRequestConfigProps = {
  config: any
  onConfigChange: (config: any) => void
}

export function HttpRequestConfig({ config, onConfigChange }: { config: any; onConfigChange: (config: any) => void }) {
  const [method, setMethod] = useState(config?.method || 'GET')
  const [url, setUrl] = useState(config?.url || '')
  const [headers, setHeaders] = useState(config?.headers || {})
  const [body, setBody] = useState(config?.body || '')

  const handleChange = () => {
    onConfigChange({ method, url, headers, body })
  }

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors"
            onBlur={handleChange}
            onKeyPress={(e) => e.key === 'Enter' && handleChange()}
          >
            {methods.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors"
            placeholder="https://api.example.com/endpoint"
            onBlur={handleChange}
            onKeyPress={(e) => e.key === 'Enter' && handleChange()}
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
          Headers (JSON)
        </label>
        <textarea
          value={JSON.stringify(headers, null, 2)}
          onChange={(e) => {
            try {
              setHeaders(JSON.parse(e.target.value))
            } catch (err) {
              // Keep invalid JSON, don't update state
            }
          }}
          className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs font-mono resize-none transition-colors"
          rows={2}
          placeholder='{"Authorization": "Bearer token"}'
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
          Body
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs resize-none transition-colors"
          rows={2}
          placeholder="Request body (for POST/PUT/PATCH)..."
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>
    </div>
  )
}

export function DBWriteConfig({ config, onConfigChange }: { config: any; onConfigChange: (config: any) => void }) {
  const [target, setTarget] = useState(config?.target || config?.table || '')
  const [data, setData] = useState(config?.data || {})

  const handleChange = () => {
    onConfigChange({ target, data })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
          Target / Table Identifier
        </label>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors"
          placeholder="public.users, crm.customers, etc."
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
          Data (JSON)
        </label>
        <textarea
          value={JSON.stringify(data, null, 2)}
          onChange={(e) => {
            try {
              setData(JSON.parse(e.target.value))
            } catch (err) {
              // Keep invalid JSON, don't update state
            }
          }}
          className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs font-mono resize-none transition-colors"
          rows={3}
          placeholder='{"name": "John", "email": "john@example.com"}'
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>
    </div>
  )
}

export function NotifyConfig({ config, onConfigChange }: { config: any; onConfigChange: (config: any) => void }) {
  const [channel, setChannel] = useState(config?.channel || 'email')
  const [message, setMessage] = useState(config?.message || '')

  const handleChange = () => {
    onConfigChange({ channel, message })
  }

  const channels = ['email', 'slack', 'webhook', 'sms']

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Channel
          </label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors"
            onBlur={handleChange}
            onKeyPress={(e) => e.key === 'Enter' && handleChange()}
          >
            {channels.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Message
          </label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors"
            placeholder="Notification message..."
            onBlur={handleChange}
            onKeyPress={(e) => e.key === 'Enter' && handleChange()}
          />
        </div>
      </div>
    </div>
  )
}

export function ConditionalBranchConfig({
  config,
  onConfigChange,
}: {
  config: any
  onConfigChange: (config: any) => void
}) {
  const [condition, setCondition] = useState(config?.condition || '')
  const [skipOnTrue, setSkipOnTrue] = useState(config?.skipOnTrue || false)
  const [skipOnFalse, setSkipOnFalse] = useState(config?.skipOnFalse || false)

  const handleChange = (newCond: string, newTrueSkip: boolean, newFalseSkip: boolean) => {
    setCondition(newCond)
    setSkipOnTrue(newTrueSkip)
    setSkipOnFalse(newFalseSkip)

    // Preserve the existing JSON schema: truePath/falsePath point to 'skip' if true, or are empty
    const finalTruePath = newTrueSkip ? 'skip' : ''
    const finalFalsePath = newFalseSkip ? 'skip' : ''

    onConfigChange({
      condition: newCond,
      truePath: finalTruePath,
      falsePath: finalFalsePath,
      skipOnTrue: newTrueSkip,
      skipOnFalse: newFalseSkip,
    })
  }

  // Ensure initial configuration fields are safely synced in memory
  useEffect(() => {
    const initialTrueSkip = config?.skipOnTrue || config?.truePath === 'skip'
    const initialFalseSkip = config?.skipOnFalse || config?.falsePath === 'skip'
    
    if (initialTrueSkip !== skipOnTrue || initialFalseSkip !== skipOnFalse || config?.condition !== condition) {
      setSkipOnTrue(initialTrueSkip)
      setSkipOnFalse(initialFalseSkip)
      setCondition(config?.condition || '')
    }
  }, [config])

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
          Condition Expression
        </label>
        <input
          type="text"
          value={condition}
          onChange={(e) => handleChange(e.target.value, skipOnTrue, skipOnFalse)}
          className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors"
          placeholder="e.g., previous.output.classification == urgent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            If True
          </label>
          <select
            value={skipOnTrue ? 'skip' : ''}
            onChange={(e) => handleChange(condition, e.target.value === 'skip', skipOnFalse)}
            className="w-full px-2 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors cursor-pointer"
          >
            <option value="">Continue to next step</option>
            <option value="skip">Skip next step</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            If False
          </label>
          <select
            value={skipOnFalse ? 'skip' : ''}
            onChange={(e) => handleChange(condition, skipOnTrue, e.target.value === 'skip')}
            className="w-full px-2 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors cursor-pointer"
          >
            <option value="">Continue to next step</option>
            <option value="skip">Skip next step</option>
          </select>
        </div>
      </div>
      <div className="text-[10px] text-zinc-550 leading-normal bg-zinc-950/20 p-2 rounded border border-zinc-900">
        💡 <strong>Runner Flow Info:</strong> The execution runner is sequential. Selecting <em>"Skip next step"</em> causes the immediate downstream action (e.g. HTTP Webhook) to be skipped when this branch path evaluates.
      </div>
    </div>
  )
}

export function ApprovalGateConfig({ config, onConfigChange }: { config: any; onConfigChange: (config: any) => void }) {
  const [message, setMessage] = useState(config?.message || 'Please approve this step')
  const [approvers, setApprovers] = useState(config?.approvers || [])

  const handleChange = () => {
    onConfigChange({ message, approvers })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
          Approval Message
        </label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors"
          placeholder="Message to show to approvers..."
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>

      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1">
          Approvers (emails, comma-separated)
        </label>
        <input
          type="text"
          value={approvers.join(', ')}
          onChange={(e) => {
            const emails = e.target.value
              .split(',')
              .map(email => email.trim())
              .filter(email => email.length > 0)
            setApprovers(emails)
          }}
          className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors"
          placeholder="approver1@example.com, approver2@example.com"
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>
    </div>
  )
}

export function StepConfigUI({
  stepType,
  config,
  onConfigChange,
  steps = [],
  currentStepId,
}: {
  stepType: string
  config: any
  onConfigChange: (config: any) => void
  steps?: any[]
  currentStepId?: string | null
}) {
  switch (stepType) {
    case 'llm_call':
      return <LLMCallConfig config={config} onConfigChange={onConfigChange} />
    case 'http_request':
      return <HttpRequestConfig config={config} onConfigChange={onConfigChange} />
    case 'db_write':
      return <DBWriteConfig config={config} onConfigChange={onConfigChange} />
    case 'notify':
      return <NotifyConfig config={config} onConfigChange={onConfigChange} />
    case 'conditional_branch':
      return <ConditionalBranchConfig config={config} onConfigChange={onConfigChange} />
    case 'approval_gate':
      return <ApprovalGateConfig config={config} onConfigChange={onConfigChange} />
    default:
      return <div className="text-zinc-500 text-center py-4 text-xs">Configuration UI for {stepType} not implemented</div>
  }
}