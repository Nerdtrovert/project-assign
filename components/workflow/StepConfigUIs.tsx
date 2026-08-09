'use client'

import { useState } from 'react'

type StepConfigProps = {
  config: any
  onConfigChange: (config: any) => void
}

export function LLMCallConfig({ config, onConfigChange }: StepConfigProps) {
  const [model, setModel] = useState(config?.model || '')
  const [prompt, setPrompt] = useState(config?.prompt || '')

  const handleChange = () => {
    onConfigChange({ model, prompt })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Model
        </label>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm"
          placeholder="e.g., llama3-8b-8192"
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm"
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

export function HttpRequestConfig({ config, onConfigChange }: HttpRequestConfigProps) {
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm"
            onBlur={handleChange}
            onKeyPress={(e) => e.key === 'Enter' && handleChange()}
          >
            {methods.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm"
            placeholder="https://api.example.com/endpoint"
            onBlur={handleChange}
            onKeyPress={(e) => e.key === 'Enter' && handleChange()}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
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
          className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm font-mono"
          rows={2}
          placeholder='{"Authorization": "Bearer token"}'
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Body
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm"
          rows={3}
          placeholder="Request body (for POST/PUT/PATCH)..."
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>
    </div>
  )
}

type DBWriteConfigProps = {
  config: any
  onConfigChange: (config: any) => void
}

export function DBWriteConfig({ config, onConfigChange }: DBWriteConfigProps) {
  const [target, setTarget] = useState(config?.target || config?.table || '')
  const [data, setData] = useState(config?.data || {})

  const handleChange = () => {
    onConfigChange({ target, data })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Target / Table Identifier
        </label>
        <input
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm"
          placeholder="public.users, crm.customers, etc."
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
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
          className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm font-mono"
          rows={4}
          placeholder='{"name": "John", "email": "john@example.com"}'
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>
    </div>
  )
}

type NotifyConfigProps = {
  config: any
  onConfigChange: (config: any) => void
}

export function NotifyConfig({ config, onConfigChange }: NotifyConfigProps) {
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
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Channel
          </label>
          <select
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm"
            onBlur={handleChange}
            onKeyPress={(e) => e.key === 'Enter' && handleChange()}
          >
            {channels.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
            Message
          </label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm"
            placeholder="Notification message..."
            onBlur={handleChange}
            onKeyPress={(e) => e.key === 'Enter' && handleChange()}
          />
        </div>
      </div>
    </div>
  )
}

type ConditionalBranchConfigProps = {
  config: any
  onConfigChange: (config: any) => void
}

export function ConditionalBranchConfig({ config, onConfigChange }: ConditionalBranchConfigProps) {
  const [condition, setCondition] = useState(config?.condition || '')
  const [truePath, setTruePath] = useState(config?.truePath || '')
  const [falsePath, setFalsePath] = useState(config?.falsePath || '')

  const handleChange = () => {
    onConfigChange({ condition, truePath, falsePath })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Condition Expression
        </label>
        <input
          type="text"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
          className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm"
          placeholder="e.g., {{steps[0].output.status}} == 'success'"
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          True Path (Step ID or Description)
        </label>
        <input
          type="text"
          value={truePath}
          onChange={(e) => setTruePath(e.target.value)}
          className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm"
          placeholder="Next step if condition is true"
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          False Path (Step ID or Description)
        </label>
        <input
          type="text"
          value={falsePath}
          onChange={(e) => setFalsePath(e.target.value)}
          className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm"
          placeholder="Next step if condition is false"
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>
    </div>
  )
}

type ApprovalGateConfigProps = {
  config: any
  onConfigChange: (config: any) => void
}

export function ApprovalGateConfig({ config, onConfigChange }: ApprovalGateConfigProps) {
  const [message, setMessage] = useState(config?.message || 'Please approve this step')
  const [approvers, setApprovers] = useState(config?.approvers || [])

  const handleChange = () => {
    onConfigChange({ message, approvers })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Approval Message
        </label>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm"
          placeholder="Message to show to approvers..."
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
          Approvers (email addresses, comma-separated)
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
          className="w-full px-3 py-2 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm"
          placeholder="approver1@example.com, approver2@example.com"
          onBlur={handleChange}
          onKeyPress={(e) => e.key === 'Enter' && handleChange()}
        />
      </div>
    </div>
  )
}

// Main component to render the appropriate config UI based on step type
export function StepConfigUI({ stepType, config, onConfigChange }: {
  stepType: string
  config: any
  onConfigChange: (config: any) => void
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
      return <div className="text-slate-500 text-center py-4">Configuration UI for {stepType} not implemented</div>
  }
}