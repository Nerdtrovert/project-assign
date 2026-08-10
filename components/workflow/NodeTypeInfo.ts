export const nodeTypeInfo: Record<string, { icon: string; label: string; color: string }> = {
  llm_call: { icon: 'LLM', label: 'LLM Call', color: 'border-zinc-800 bg-[#0e0e11] text-zinc-300' },
  http_request: { icon: 'HTTP', label: 'HTTP Request', color: 'border-zinc-800 bg-[#0e0e11] text-zinc-300' },
  db_write: { icon: 'DB', label: 'DB Write', color: 'border-zinc-800 bg-[#0e0e11] text-zinc-300' },
  notify: { icon: 'MSG', label: 'Notification', color: 'border-zinc-800 bg-[#0e0e11] text-zinc-300' },
  conditional_branch: { icon: 'IF', label: 'Conditional Branch', color: 'border-zinc-800 bg-[#0e0e11] text-zinc-300' },
  approval_gate: { icon: 'GATE', label: 'Approval Gate', color: 'border-zinc-800 bg-[#0e0e11] text-zinc-300' },
}