'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'urql'

import { nodeTypeInfo } from '@/components/workflow/NodeTypeInfo'
import { StepConfigUI } from '@/components/workflow/StepConfigUIs'
import { GetWorkflowDetailQuery } from '@/graphql/queries/workflow-detail'
import {
  InsertWorkflowStepMutation,
  UpdateWorkflowStepMutation,
  DeleteWorkflowStepMutation,
  UpdateWorkflowStepPositionMutation
} from '@/graphql/mutations/steps'

type StepType = 'llm_call' | 'http_request' | 'db_write' | 'notify' | 'conditional_branch' | 'approval_gate'

const UpdateWorkflowMutation = `
  mutation UpdateWorkflow($id: uuid!, $name: String!, $description: String!) {
    update_workflows_by_pk(
      pk_columns: { id: $id }
      _set: { name: $name, description: $description }
    ) {
      id
      name
      description
    }
  }
`

const DeleteWorkflowMutation = `
  mutation DeleteWorkflow($id: uuid!) {
    delete_workflows_by_pk(id: $id) {
      id
    }
  }
`

const DEFAULT_STEP_CONFIG: Record<StepType, any> = {
  llm_call: { model: 'llama3-8b-8192', prompt: '' },
  http_request: { method: 'GET', url: '', headers: {}, body: '' },
  db_write: { target: '', data: {} },
  notify: { channel: 'email', message: '' },
  conditional_branch: { condition: '', truePath: '', falsePath: '' },
  approval_gate: { message: 'Please review and approve this step.' },
}

function getDefaultConfig(type: StepType): string {
  return JSON.stringify(DEFAULT_STEP_CONFIG[type], null, 2)
}

function ensureMutationSucceeded(result: any, fallbackMessage: string) {
  if (result.error) {
    throw new Error(result.error.message || fallbackMessage)
  }
}

export default function WorkflowDetailPage({ params }: { params: Promise<{ workflowId: string }> }) {
  const { workflowId } = use(params)
  const router = useRouter()

  // State management
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Step builder modal/form state
  const [showStepForm, setShowStepForm] = useState(false)
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [stepName, setStepName] = useState('')
  const [stepType, setStepType] = useState<StepType>('llm_call')
  const [stepConfigStr, setStepConfigStr] = useState(getDefaultConfig('llm_call'))
  const [stepError, setStepError] = useState<string | null>(null)
  const [isStepSaving, setIsStepSaving] = useState(false)

  // Manual run state
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false)
  const [runId, setRunId] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<string | null>(null)

  // Recent runs collapse/expand states
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [expandedStepRunId, setExpandedStepRunId] = useState<string | null>(null)

  // GraphQL query
  const [result, reexecute] = useQuery({
    query: GetWorkflowDetailQuery,
    variables: { id: workflowId },
  })

  // Mutations
  const [, updateWorkflow] = useMutation(UpdateWorkflowMutation)
  const [, deleteWorkflow] = useMutation(DeleteWorkflowMutation)
  const [, insertWorkflowStep] = useMutation(InsertWorkflowStepMutation)
  const [, updateWorkflowStep] = useMutation(UpdateWorkflowStepMutation)
  const [, deleteWorkflowStep] = useMutation(DeleteWorkflowStepMutation)
  const [, updateStepPosition] = useMutation(UpdateWorkflowStepPositionMutation)

  const { data, fetching, error } = result
  const workflow = data?.workflows_by_pk
  const members = data?.org_members || []
  const orderedSteps = [...(workflow?.workflow_steps ?? [])].sort((a: any, b: any) => a.position - b.position)

  // Resolve user role in this organization
  const userOrgMember = workflow ? members.find((m: any) => m.org_id === workflow.org_id) : null
  const userRole = userOrgMember?.role || 'viewer' // Fallback to viewer for safety
  const orgName = userOrgMember?.organization?.name || workflow?.org_id || 'Unknown Organization'

  const canEdit = userRole === 'owner' || userRole === 'editor'
  const canDelete = userRole === 'owner' || userRole === 'editor'

  // Initialize edit fields
  useEffect(() => {
    if (workflow) {
      setEditName(workflow.name || '')
      setEditDesc(workflow.description || '')
    }
  }, [workflow])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const res = await updateWorkflow({
        id: workflowId,
        name: editName,
        description: editDesc,
      })
      ensureMutationSucceeded(res, 'Failed to update workflow')
      setIsEditing(false)
      reexecute()
    } catch (err: any) {
      setSaveError(err.message || 'Failed to update workflow')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!canDelete || !window.confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await deleteWorkflow({ id: workflowId })
      ensureMutationSucceeded(res, 'Delete failed')
      router.push('/workflows')
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
      setIsDeleting(false)
    }
  }

  // Step builder actions
  const handleAddStepClick = () => {
    setEditingStepId(null)
    setStepName('')
    setStepType('llm_call')
    setStepConfigStr(getDefaultConfig('llm_call'))
    setStepError(null)
    setShowStepForm(true)
  }

  const handleEditStepClick = (step: any) => {
    setEditingStepId(step.id)
    setStepName(step.name || '')
    setStepType(step.type || 'llm_call')
    setStepConfigStr(JSON.stringify(step.config || {}, null, 2))
    setStepError(null)
    setShowStepForm(true)
  }

  const handleDeleteStep = async (stepId: string) => {
    if (!canEdit || !window.confirm('Are you sure you want to remove this step?')) {
      return
    }

    try {
      const res = await deleteWorkflowStep({ id: stepId })
      ensureMutationSucceeded(res, 'Failed to delete step')
      reexecute()
    } catch (err: any) {
      alert(`Failed to delete step: ${err.message}`)
    }
  }

  const handleStepFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return

    setStepError(null)
    setIsStepSaving(true)

    let parsedConfig = {}
    try {
      parsedConfig = JSON.parse(stepConfigStr)
    } catch (err) {
      setStepError('Invalid JSON configuration. Please check your syntax.')
      setIsStepSaving(false)
      return
    }

    try {
      let res
      if (editingStepId) {
        // Edit step
        res = await updateWorkflowStep({
          id: editingStepId,
          name: stepName,
          type: stepType,
          config: parsedConfig
        })
        ensureMutationSucceeded(res, 'Failed to save step')
      } else {
        // Insert step (append to end)
        const maxPosition = orderedSteps.reduce(
          (max: number, step: any) => Math.max(max, step.position),
          -1
        )
        res = await insertWorkflowStep({
          workflowId,
          name: stepName,
          type: stepType,
          config: parsedConfig,
          position: maxPosition + 1
        })
        ensureMutationSucceeded(res, 'Failed to insert step')
      }

      setShowStepForm(false)
      reexecute()
    } catch (err: any) {
      setStepError(err.message || 'Failed to save step')
    } finally {
      setIsStepSaving(false)
    }
  }

  const handleMoveStepUp = async (step: any, steps: any[]) => {
    if (!canEdit) return
    const index = steps.findIndex((s) => s.id === step.id)
    if (index <= 0) return
    const prevStep = steps[index - 1]

    try {
      const updateResults = await Promise.all([
        updateStepPosition({ id: step.id, workflowId, position: prevStep.position }),
        updateStepPosition({ id: prevStep.id, workflowId, position: step.position })
      ])
      updateResults.forEach((result) => ensureMutationSucceeded(result, 'Failed to move step up'))
      reexecute()
    } catch (err: any) {
      alert(`Failed to move step: ${err.message}`)
    }
  }

  const handleMoveStepDown = async (step: any, steps: any[]) => {
    if (!canEdit) return
    const index = steps.findIndex((s) => s.id === step.id)
    if (index < 0 || index >= steps.length - 1) return
    const nextStep = steps[index + 1]

    try {
      const updateResults = await Promise.all([
        updateStepPosition({ id: step.id, workflowId, position: nextStep.position }),
        updateStepPosition({ id: nextStep.id, workflowId, position: step.position })
      ])
      updateResults.forEach((result) => ensureMutationSucceeded(result, 'Failed to move step down'))
      reexecute()
    } catch (err: any) {
      alert(`Failed to move step: ${err.message}`)
    }
  }

  const handleRunWorkflow = async () => {
    if (!canEdit) return

    setIsRunningWorkflow(true)
    setRunId(null)
    setRunStatus(null)

    try {
      const response = await fetch('/api/trigger-workflow-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workflow_id: workflowId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to trigger workflow')
      }

      setRunId(data.run_id)
      setRunStatus(data.status)
      reexecute() // Refresh execution logs
    } catch (error: any) {
      console.error('Error triggering workflow:', error)
      alert(`Failed to trigger workflow: ${error.message}`)
    } finally {
      setIsRunningWorkflow(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-16">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
        <Link href="/workflows" className="hover:text-zinc-300 transition-colors duration-150">
          Workflows
        </Link>
        <span>/</span>
        <span className="text-zinc-400">Console</span>
      </div>

      {/* Loading state */}
      {fetching && (
        <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-600 mb-3"></div>
          <p className="text-zinc-400 text-xs">Loading workflow configuration...</p>
        </div>
      )}

      {/* Error state */}
      {!fetching && error && (
        <div className="bg-rose-950/20 border border-rose-800/30 text-rose-300 rounded-lg p-5 text-xs">
          <h4 className="font-semibold">Query Failed</h4>
          <p className="mt-1 text-zinc-400 font-mono">{error.message}</p>
          <div className="mt-4">
            <Link href="/workflows" className="text-xs text-violet-400 hover:underline">
              ← Return to list
            </Link>
          </div>
        </div>
      )}

      {/* Main Detail view */}
      {!fetching && !error && workflow && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Info Box */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-6 space-y-4">
              {isEditing ? (
                /* Edit Form */
                <form onSubmit={handleUpdate} className="space-y-4">
                  <h2 className="text-sm font-semibold text-zinc-100 mb-4">Edit Workflow Settings</h2>
                  
                  {saveError && (
                    <div className="p-3 bg-rose-950/20 border border-rose-800/30 text-rose-300 rounded-lg text-xs">
                      {saveError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Workflow Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      disabled={isSaving}
                      className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      Description
                    </label>
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={4}
                      disabled={isSaving}
                      className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors resize-none"
                      placeholder="Give a description to this automation..."
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bg-violet-600 hover:bg-violet-700 text-white font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setIsEditing(false)
                        setEditName(workflow.name || '')
                        setEditDesc(workflow.description || '')
                        setSaveError(null)
                      }}
                      className="text-zinc-400 hover:text-zinc-200 text-xs py-1.5 px-2 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Detail Display */
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">{workflow.name}</h1>
                      <p className="text-[10px] text-zinc-500 font-mono mt-1 select-all">UUID: {workflow.id}</p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 font-medium py-1 px-3 rounded-md text-xs transition-colors cursor-pointer"
                      >
                        Edit Settings
                      </button>
                    )}
                  </div>

                  <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">
                    {workflow.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center space-x-2 pt-3 border-t border-zinc-850">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Tenant:</span>
                    <span className="text-[10px] text-zinc-300 font-medium bg-zinc-800/40 border border-zinc-850 px-2 py-0.5 rounded">
                      {orgName}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Workflow Steps Builder */}
            <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-6 space-y-5">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
                  <span>Workflow Builder</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full">
                    {orderedSteps.length}
                  </span>
                </h2>
                {canEdit && (
                  <button
                    onClick={handleAddStepClick}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-medium py-1 px-3 rounded-md text-xs transition-colors cursor-pointer"
                  >
                    Add Step
                  </button>
                )}
              </div>

              {orderedSteps.length === 0 ? (
                <div className="border border-dashed border-zinc-800 rounded-md p-8 text-center text-zinc-500 text-xs">
                  No steps defined. Add a step to begin configuring the agent pipeline.
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:left-[15px] before:top-4 before:bottom-4 before:w-[1px] before:bg-zinc-800">
                  {orderedSteps.map((step: any, idx: number) => {
                    const info = nodeTypeInfo[step.type] || { icon: 'STEP', label: step.type, color: 'border-zinc-800 bg-[#0e0e11] text-zinc-300' }
                    const stepNum = String(idx + 1).padStart(2, '0')
                    
                    return (
                      <div key={step.id} className="flex items-start space-x-3 relative group">
                        
                        {/* Timeline Connector & Up/Down Actions */}
                        <div className="flex flex-col items-center shrink-0">
                          <div className={`w-8 h-8 rounded-md border flex items-center justify-center text-[10px] font-bold z-10 shrink-0 ${info.color}`}>
                            {info.icon}
                          </div>
                          
                          {/* Reordering indicators for editors */}
                          {canEdit && (
                            <div className="flex items-center space-x-[2px] mt-1 z-20">
                              <button
                                onClick={() => handleMoveStepUp(step, orderedSteps)}
                                disabled={idx === 0}
                                title="Move Step Up"
                                className="p-0.5 rounded bg-zinc-900 border border-zinc-850 text-[8px] text-zinc-400 hover:text-zinc-100 disabled:opacity-20 cursor-pointer"
                              >
                                ▲
                              </button>
                              <button
                                onClick={() => handleMoveStepDown(step, orderedSteps)}
                                disabled={idx === orderedSteps.length - 1}
                                title="Move Step Down"
                                className="p-0.5 rounded bg-zinc-900 border border-zinc-850 text-[8px] text-zinc-400 hover:text-zinc-100 disabled:opacity-20 cursor-pointer"
                              >
                                ▼
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Step block */}
                        <div className="flex-1 bg-[#0e0e11]/40 border border-zinc-800 rounded-md p-4 space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-mono font-bold text-zinc-500">{stepNum}</span>
                                <h4 className="text-xs font-semibold text-zinc-100">{step.name}</h4>
                              </div>
                              <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider mt-0.5">{info.label}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-850 px-1.5 py-0.2 rounded">
                                Pos: {step.position}
                              </span>
                              {canEdit && (
                                <div className="flex items-center space-x-1">
                                  <button
                                    onClick={() => handleEditStepClick(step)}
                                    title="Edit Config"
                                    className="p-1 rounded text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStep(step.id)}
                                    title="Delete Step"
                                    className="p-1 rounded text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {step.config && Object.keys(step.config).length > 0 && (
                            <div className="bg-[#0e0e11] border border-zinc-850 rounded p-2.5 overflow-x-auto">
                              <pre className="text-[10px] font-mono text-zinc-400 select-all leading-relaxed">
                                {JSON.stringify(step.config, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Recent Executions Section */}
            <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-6 space-y-5">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
                <span>Execution History</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-full">
                  {workflow.workflow_runs?.length || 0}
                </span>
              </h2>

              {!workflow.workflow_runs || workflow.workflow_runs.length === 0 ? (
                <div className="border border-dashed border-zinc-800 rounded-md p-6 text-center text-zinc-500 text-xs">
                  No execution runs recorded. Use the "Run Workflow" option to test.
                </div>
              ) : (
                <div className="space-y-2">
                  {workflow.workflow_runs.map((run: any) => {
                    const isExpanded = expandedRunId === run.id
                    const startedTime = run.started_at ? new Date(run.started_at).toLocaleString() : 'N/A'
                    const duration = run.started_at && run.completed_at
                      ? `${((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000).toFixed(2)}s`
                      : null

                    return (
                      <div key={run.id} className="border border-zinc-800 rounded-md overflow-hidden bg-zinc-950/20">
                        {/* Run Header */}
                        <div 
                          onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                          className="flex flex-wrap items-center justify-between gap-4 p-3 cursor-pointer select-none hover:bg-zinc-900/40 text-xs"
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              run.status === 'completed' ? 'bg-emerald-500' :
                              run.status === 'running' ? 'bg-amber-500 animate-pulse' :
                              'bg-rose-500'
                            }`} />
                            <div>
                              <span className="font-mono font-semibold text-zinc-300 select-all">#{run.id.slice(0, 8)}</span>
                              <span className="text-[10px] text-zinc-500 ml-2 font-medium">{startedTime}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <span className="text-[10px] font-mono text-zinc-400">{duration ? `${duration}` : ''}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                              run.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              run.status === 'running' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                              'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            }`}>
                              {run.status}
                            </span>
                          </div>
                        </div>

                        {/* Run Details (Step Runs) */}
                        {isExpanded && (
                          <div className="border-t border-zinc-800 bg-[#0e0e11]/60 p-3 space-y-3 text-xs">
                            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">Step Outputs</div>
                            
                            {!run.step_runs || run.step_runs.length === 0 ? (
                              <div className="text-zinc-600 text-xs italic">No steps were executed for this run.</div>
                            ) : (
                              <div className="space-y-2 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-zinc-800">
                                {run.step_runs.map((stepRun: any) => {
                                  const step = stepRun.workflow_step || {}
                                  const stepInfo = nodeTypeInfo[step.type] || { icon: 'STEP', label: step.type, color: 'border-zinc-800 bg-[#0e0e11] text-zinc-300' }
                                  const isStepRunExpanded = expandedStepRunId === stepRun.id

                                  return (
                                    <div key={stepRun.id} className="flex items-start space-x-2 relative">
                                      <div className={`w-6 h-6 rounded border flex items-center justify-center text-[9px] font-bold z-10 shrink-0 ${stepInfo.color}`}>
                                        {stepInfo.icon}
                                      </div>
                                      <div className="flex-1 bg-[#0e0e11] border border-zinc-850 rounded p-2.5 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <span className="font-semibold text-zinc-300">{step.name || 'Step'}</span>
                                            <span className="text-[9px] text-zinc-500 font-mono ml-2">Pos: {step.position}</span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded border ${
                                              stepRun.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                              stepRun.status === 'skipped' ? 'bg-zinc-800 border-zinc-700 text-zinc-400' :
                                              'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                            }`}>
                                              {stepRun.status}
                                            </span>
                                            {(stepRun.input || stepRun.output || stepRun.error) && (
                                              <button
                                                onClick={() => setExpandedStepRunId(isStepRunExpanded ? null : stepRun.id)}
                                                className="text-[9px] text-zinc-400 hover:text-zinc-100 cursor-pointer"
                                              >
                                                {isStepRunExpanded ? 'Hide Payload' : 'Show Payload'}
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {stepRun.error && (
                                          <div className="bg-rose-950/20 border border-rose-900/30 rounded p-2 text-[10px] font-mono text-rose-400 whitespace-pre-wrap">
                                            {stepRun.error}
                                          </div>
                                        )}

                                        {isStepRunExpanded && (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-zinc-850">
                                            {stepRun.input && (
                                              <div className="space-y-1">
                                                <span className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider">Input</span>
                                                <pre className="text-[9px] font-mono text-zinc-400 bg-black/40 p-2 rounded overflow-x-auto max-h-32">
                                                  {typeof stepRun.input === 'object' ? JSON.stringify(stepRun.input, null, 2) : String(stepRun.input)}
                                                </pre>
                                              </div>
                                            )}
                                            {stepRun.output && (
                                              <div className="space-y-1">
                                                <span className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider">Output</span>
                                                <pre className="text-[9px] font-mono text-zinc-400 bg-black/40 p-2 rounded overflow-x-auto max-h-32">
                                                  {typeof stepRun.output === 'object' ? JSON.stringify(stepRun.output, null, 2) : String(stepRun.output)}
                                                </pre>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar / Triggers & Actions */}
          <div className="space-y-6">
            
            {/* User Access Rights */}
            <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-5 space-y-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Access Control</span>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300">Your Role</span>
                <span className="font-semibold uppercase tracking-wider text-zinc-300 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-[10px]">
                  {userRole}
                </span>
              </div>
            </div>

            {/* Manual Run Card */}
            {canEdit && (
              <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-5 space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Manual Execution</h3>
                
                {isRunningWorkflow ? (
                  <div className="flex items-center space-x-2 py-1.5">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-zinc-500"></div>
                    <span className="text-zinc-400 text-[10px]">Executing steps...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleRunWorkflow}
                    disabled={isRunningWorkflow}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer"
                  >
                    {runId ? 'Re-run Workflow' : 'Run Workflow'}
                  </button>
                )}
                
                {runId && (
                  <div className="pt-2 border-t border-zinc-850 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-500 font-medium">Run ID</span>
                      <span className="text-zinc-300 font-mono select-all text-right max-w-[130px] truncate" title={runId}>{runId}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-500 font-medium">Status</span>
                      <span className="text-emerald-500 font-bold uppercase tracking-wider">● {runStatus}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Triggers Card */}
            <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                <span>Triggers</span>
                <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-1.5 py-0.2 rounded font-semibold">
                  {workflow.workflow_triggers.length}
                </span>
              </h3>

              {workflow.workflow_triggers.length === 0 ? (
                <div className="border border-dashed border-zinc-800 rounded-md p-4 text-center text-zinc-500 text-[11px]">
                  No trigger defined.
                </div>
              ) : (
                <div className="space-y-2">
                  {workflow.workflow_triggers.map((trigger: any) => (
                    <div key={trigger.id} className="bg-[#0e0e11] border border-zinc-850 rounded p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-300">
                          {trigger.type}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${trigger.enabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}>
                          {trigger.enabled ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      
                      {trigger.config && Object.keys(trigger.config).length > 0 && (
                        <pre className="text-[10px] font-mono text-zinc-500 overflow-x-auto bg-black/20 p-2 rounded">
                          {JSON.stringify(trigger.config, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dangerous Actions Box */}
            {canDelete && (
              <div className="bg-rose-950/10 border border-rose-900/20 rounded-lg p-5 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-rose-400">Danger Zone</h4>
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Permanently delete this workflow pipeline. This action is irreversible.
                  </p>
                </div>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full bg-rose-950/20 hover:bg-rose-900 text-rose-400 hover:text-white border border-rose-800/30 text-xs font-semibold py-1.5 px-3 rounded-md transition-colors cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Workflow'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Step Modal */}
      {showStepForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] animate-fade-in">
          <div className="w-full max-w-lg bg-[#16161a] border border-zinc-800 rounded-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-semibold text-zinc-100">
              {editingStepId ? 'Configure Step Details' : 'Add New Step'}
            </h3>

            {stepError && (
              <div className="p-3 bg-rose-950/20 border border-rose-900/30 text-rose-300 rounded-lg text-xs font-mono">
                {stepError}
              </div>
            )}

            <form onSubmit={handleStepFormSubmit} className="space-y-4">
              {/* Step Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Step Name
                </label>
                <input
                  type="text"
                  value={stepName}
                  onChange={(e) => setStepName(e.target.value)}
                  required
                  disabled={isStepSaving}
                  placeholder="e.g. Run Sentiment Analysis"
                  className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs"
                />
              </div>

              {/* Step Type */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Step Type
                </label>
                <select
                  value={stepType}
                  onChange={(e) => {
                    const nextType = e.target.value as StepType
                    setStepType(nextType)
                    setStepConfigStr(getDefaultConfig(nextType))
                  }}
                  disabled={isStepSaving}
                  className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs"
                >
                  <option value="llm_call">LLM Call</option>
                  <option value="http_request">HTTP Request</option>
                  <option value="db_write">DB Write</option>
                  <option value="notify">Notification</option>
                  <option value="conditional_branch">Conditional Branch</option>
                  <option value="approval_gate">Approval Gate</option>
                </select>
              </div>

              {/* Visual Config Builder */}
              <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-lg space-y-3">
                <h4 className="text-[10px] font-semibold text-zinc-450 uppercase tracking-wider">
                  Visual Parameters Builder
                </h4>
                <StepConfigUI
                  stepType={stepType}
                  config={(() => {
                    try {
                      return JSON.parse(stepConfigStr)
                    } catch (e) {
                      return {}
                    }
                  })()}
                  onConfigChange={(newConfig) => {
                    setStepConfigStr(JSON.stringify(newConfig, null, 2))
                  }}
                />
              </div>

              {/* Step Config JSON */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Configuration (JSON)
                </label>
                <textarea
                  value={stepConfigStr}
                  onChange={(e) => setStepConfigStr(e.target.value)}
                  required
                  disabled={isStepSaving}
                  rows={6}
                  className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 font-mono text-xs resize-none"
                  placeholder={'{\n  "prompt": "Evaluate context..."\n}'}
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end space-x-2.5 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowStepForm(false)}
                  disabled={isStepSaving}
                  className="text-zinc-400 hover:text-zinc-200 text-xs font-semibold px-3 py-1.5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStepSaving}
                  className="bg-violet-600 hover:bg-violet-700 text-white font-medium py-1.5 px-4 rounded-md text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isStepSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}