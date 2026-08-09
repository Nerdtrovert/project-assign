export const nodeTypeInfo: Record<string, { icon: string; label: string; color: string }> = {
  llm_call: { icon: '🤖', label: 'LLM Call', color: 'border-violet-500/20 bg-violet-500/5 text-violet-400' },
  http_request: { icon: '🌐', label: 'HTTP Request', color: 'border-sky-500/20 bg-sky-500/5 text-sky-400' },
  db_write: { icon: '💾', label: 'DB Write', color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400' },
  notify: { icon: '🔔', label: 'Notification', color: 'border-amber-500/20 bg-amber-500/5 text-amber-400' },
  conditional_branch: { icon: '🌿', label: 'Conditional Branch', color: 'border-teal-500/20 bg-teal-500/5 text-teal-400' },
  approval_gate: { icon: '⏸', label: 'Approval Gate', color: 'border-orange-500/20 bg-orange-500/5 text-orange-400' },
}