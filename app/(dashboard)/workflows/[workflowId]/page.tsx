'use client'

import { use, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from 'urql'

import { nodeTypeInfo } from '@/components/workflow/NodeTypeInfo'
import { StepConfigUI } from '@/components/workflow/StepConfigUIs'
import { GetWorkflowDetailQuery } from '@/graphql/queries/workflow-detail'
import { GetWorkflowLiveStatusQuery } from '@/graphql/queries/workflow-live-status'
import {
  InsertWorkflowStepMutation,
  UpdateWorkflowStepMutation,
  DeleteWorkflowStepMutation,
  UpdateWorkflowStepPositionMutation
} from '@/graphql/mutations/steps'
import { TriggerWorkflowRunMutation } from '@/graphql/mutations/workflow-run'
import { DeleteWorkflowMutation, UpdateWorkflowMutation } from '@/graphql/mutations/workflows'
import nhostClient from '@/lib/nhost/client'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'

type StepType = 'llm_call' | 'http_request' | 'db_write' | 'notify' | 'conditional_branch' | 'approval_gate'

const DEFAULT_STEP_CONFIG: Record<StepType, any> = {
  llm_call: { model: 'llama-3.1-8b-instant', prompt: '' },
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

const LIVE_RUN_STATUSES = new Set(['running', 'paused'])

function normalizeStatus(status?: string | null): string {
  return (status || '').toLowerCase().replace(/\s+/g, '_')
}

function isLiveRunStatus(status?: string | null): boolean {
  return LIVE_RUN_STATUSES.has(normalizeStatus(status))
}

function mergeLatestRun(runs: any[], latestRun: any): any[] {
  const runIndex = runs.findIndex((run) => run.id === latestRun.id)
  const nextRuns = runIndex === -1
    ? [latestRun, ...runs]
    : runs.map((run, index) => index === runIndex ? { ...run, ...latestRun } : run)

  return JSON.stringify(nextRuns) === JSON.stringify(runs) ? runs : nextRuns
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
  const [customerMessage, setCustomerMessage] = useState("URGENT: My payment was deducted twice and I need this fixed immediately.")

  // Recent runs collapse/expand states
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [expandedStepRunId, setExpandedStepRunId] = useState<string | null>(null)

  // GraphQL query
  const [result, reexecute] = useQuery({
    query: GetWorkflowDetailQuery,
    variables: { id: workflowId },
  })
  const [liveStatusResult, reexecuteLiveStatus] = useQuery({
    query: GetWorkflowLiveStatusQuery,
    variables: { workflowId },
    pause: true,
  })

  // Mutations
  const [, updateWorkflow] = useMutation(UpdateWorkflowMutation)
  const [, deleteWorkflow] = useMutation(DeleteWorkflowMutation)
  const [, insertWorkflowStep] = useMutation(InsertWorkflowStepMutation)
  const [, updateWorkflowStep] = useMutation(UpdateWorkflowStepMutation)
  const [, deleteWorkflowStep] = useMutation(DeleteWorkflowStepMutation)
  const [, updateStepPosition] = useMutation(UpdateWorkflowStepPositionMutation)
  const [, triggerWorkflowRun] = useMutation(TriggerWorkflowRunMutation)

  const [approvingRunId, setApprovingRunId] = useState<string | null>(null)
  const [liveWorkflowRuns, setLiveWorkflowRuns] = useState<any[]>([])
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollingRunIdRef = useRef<string | null>(null)
  const reexecuteLiveStatusRef = useRef(reexecuteLiveStatus)

  // Get the data from the queries
  const { data, fetching, error } = result
  const workflow = data?.workflows_by_pk
  const workflowRuns = liveWorkflowRuns.length > 0 ? liveWorkflowRuns : (workflow?.workflow_runs ?? [])
  const latestRun = workflowRuns[0]
  const activePollingRunId = latestRun && isLiveRunStatus(latestRun.status)
    ? latestRun.id
    : runId !== null && isLiveRunStatus(runStatus)
      ? runId
      : null
  const isInitialLoading = fetching && !workflow
  const members = data?.org_members || []
  const orderedSteps = [...(workflow?.workflow_steps ?? [])].sort((a: any, b: any) => a.position - b.position)

  // Resolve user role in this organization
  const userOrgMember = workflow ? members.find((m: any) => m.org_id === workflow.org_id) : null
  const userRole = userOrgMember?.role || 'viewer' // Fallback to viewer for safety
  const orgName = userOrgMember?.organization?.name || workflow?.org_id || 'Unknown Organization'

  const canEdit = userRole === 'owner' || userRole === 'editor'
  const canDelete = userRole === 'owner' || userRole === 'editor'

  // Set up polling interval for live status updates
  useEffect(() => {
    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Get the latest run from the best available source: live if available, otherwise main
    const runs = liveWorkflowRuns.length > 0 ? liveWorkflowRuns : (data?.workflows_by_pk?.workflow_runs || []);
    const latestRun = runs[0];

    const shouldPoll = data?.workflows_by_pk && latestRun && isLiveRunStatus(latestRun.status);

    if (shouldPoll) {
      const interval = setInterval(() => {
        reexecuteLiveStatusRef.current({ requestPolicy: 'network-only' });
      }, 1500);

      pollingIntervalRef.current = interval;
    }

    // Cleanup function
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [data, liveWorkflowRuns])

  // Handle activePollingRunId changes (cleanup and immediate reexecute)
  useEffect(() => {
    if (!activePollingRunId) {
      // No active run, clear interval and reset refs
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      pollingRunIdRef.current = null;
      return;
    }

    // There is an active run. If the interval is not set for this run, we want to:
    //   - Clear any existing interval (to avoid duplicates)
    //   - Set the pollingRunIdRef to this run
    //   - Do an immediate reexecute to get the latest status for this run
    if (pollingIntervalRef.current && pollingRunIdRef.current === activePollingRunId) {
      // The interval is already set for this run, do nothing
      return;
    }

    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Set the pollingRunIdRef to the active run
    pollingRunIdRef.current = activePollingRunId;

    // Do an immediate reexecute for the live status
    reexecuteLiveStatusRef.current({ requestPolicy: 'network-only' });
  }, [activePollingRunId])

  // Update liveWorkflowRuns from workflow?.workflow_runs (to keep in sync with the main query)
  useEffect(() => {
    if (workflow?.workflow_runs) {
      setLiveWorkflowRuns((currentRuns) => {
        const nextRuns = workflow.workflow_runs
        return JSON.stringify(currentRuns) === JSON.stringify(nextRuns) ? currentRuns : nextRuns
      })
    }
  }, [workflow?.workflow_runs])

  // Initialize edit fields
  useEffect(() => {
    if (workflow) {
      setEditName(workflow.name || '')
      setEditDesc(workflow.description || '')
    }
  }, [workflow])

  const handleApproveRun = async (runId: string) => {
    setApprovingRunId(runId)
    try {
      const token = nhostClient.auth.getAccessToken()
      const res = await fetch('/api/approve-workflow-run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ run_id: runId }),
      })
      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || errJson.details || 'Approval failed')
      }
      reexecuteLiveStatus({ requestPolicy: 'network-only' })
    } catch (err: any) {
      console.error('Approval failed:', err)
      alert(`Approval error: ${err.message}`)
    } finally {
      setApprovingRunId(null)
    }
  }

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
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
      const res = await deleteWorkflowStep({ id: stepId, workflowId })
      ensureMutationSucceeded(res, 'Failed to delete step')
      reexecute()
    } catch (err: any) {
      alert(`Failed to delete step: ${err.message}`)
    }
  }

  const handleStepFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
            workflowId,
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
      const res = await triggerWorkflowRun({ 
        workflow_id: workflowId,
        customer_message: customerMessage 
      })

      if (res.error) {
        throw new Error(res.error.message || 'Failed to trigger workflow')
      }

      const runData = res.data?.triggerWorkflowRun
      if (!runData) {
        throw new Error('No execution run data returned')
      }

      setRunId(runData.run_id)
      setRunStatus(runData.status)
      reexecuteLiveStatus({ requestPolicy: 'network-only' })
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
      {isInitialLoading && (
        <div className="bg-[#131316] border border-zinc-800 rounded-lg p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="flex items-center justify-center mb-4">
            <div className="h-6 w-6 animate-spin border-t border-r border-zinc-400 border-l-transparent border-b-transparent rounded-full mx-auto" />
          </div>
          <p className="text-zinc-400 text-xs">Loading workflow configuration...</p>
        </div>
      )}

      {/* Error state */}
      {!isInitialLoading && error && (
        <div className="bg-rose-950/10 border border-rose-900/20 text-rose-300 rounded-lg p-5 text-xs flex flex-col items-center">
          <div className="flex items-center justify-center mb-3">
            <div className="w-8 h-8 bg-rose-500/20 rounded-full flex items-center justify-center">
              <span className="text-rose-400 font-bold">⚠️</span>
            </div>
          </div>
          <h4 className="font-semibold text-center mb-2">Query Failed</h4>
          <p className="mt-1 text-zinc-400 font-mono text-center">{error.message}</p>
          <div className="mt-4">
            <Link href="/workflows" className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors">
              ← Return to list
            </Link>
          </div>
        </div>
      )}

      {/* Main Detail view */}
      {!isInitialLoading && !error && workflow && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
          
          {/* Main Info Box */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            <div className="bg-[#131316] border border-zinc-800 rounded-lg p-6 space-y-4 shadow-sm">
              {isEditing ? (
                /* Edit Form */
                <form onSubmit={handleUpdate} className="space-y-4">
                  <h2 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                    Edit Workflow Settings
                  </h2>
                  
                  {saveError && (
                    <div className="p-3 bg-rose-950/10 border border-rose-900/20 text-rose-300 rounded-lg text-xs">
                      {saveError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      Workflow Name
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      disabled={isSaving}
                      className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 text-zinc-100 text-xs transition-colors placeholder:text-zinc-700"
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
                      className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:ring-1 focus:ring-zinc-700 focus:border-zinc-700 text-zinc-100 text-xs transition-colors resize-none placeholder:text-zinc-700"
                      placeholder="Give a description to this automation..."
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer shadow-sm"
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
                      className="text-zinc-500 hover:text-zinc-200 focus:text-zinc-200 focus:outline-none text-xs py-1.5 px-2 cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* Detail Display */
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <h1 className="text-base font-semibold text-zinc-100 tracking-tight">{workflow.name}</h1>
                      <span className="text-[9px] text-zinc-500 font-mono select-all">ID: {workflow.id}</span>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 font-medium py-1 px-3 rounded-md text-[11px] transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                      >
                        <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </button>
                    )}
                  </div>

                  <p className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap bg-[#0e0e11]/80 border border-zinc-900 px-3.5 py-2.5 rounded-md">
                    {workflow.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center space-x-2 pt-3 border-t border-zinc-900">
                    <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">Tenant:</span>
                    <span className="text-[10px] text-zinc-300 font-semibold bg-zinc-900 border border-zinc-800 px-2.5 py-0.5 rounded-md flex items-center gap-1.5">
                      <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {orgName}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Workflow Steps Builder */}
            <div className="bg-[#131316] border border-zinc-800 rounded-lg p-6 space-y-5 shadow-sm">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
                  <span>Workflow Steps</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-full">
                    {orderedSteps.length}
                  </span>
                </h2>
                {canEdit && (
                  <button
                    onClick={handleAddStepClick}
                    className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold py-1.5 px-3 rounded-md text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="text-sm font-bold">+</span> Add Step
                  </button>
                )}
              </div>

              {orderedSteps.length === 0 ? (
                <div className="border border-dashed border-zinc-800 rounded-md p-8 text-center text-zinc-500 text-xs flex flex-col items-center justify-center bg-zinc-950/5">
                  <div className="flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-zinc-400 font-medium mb-1">No steps defined</p>
                  <p className="text-zinc-500 text-xs">Add a step to begin configuring the agent pipeline.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orderedSteps.map((step: any, idx: number) => {
                    const info = nodeTypeInfo[step.type] || { icon: 'STEP', label: step.type, color: 'border-zinc-800 bg-[#0e0e11] text-zinc-300' }
                    const stepNum = String(idx + 1).padStart(2, '0')
                    
                    return (
                      <div key={step.id} className="relative">
                        {idx > 0 && (
                          <div className="flex justify-center -my-2 mb-2">
                            <div className="h-6 w-6 rounded-full border border-zinc-800 bg-[#0e0e11] flex items-center justify-center shadow-md">
                              <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        )}
                        <div className="bg-[#111115] border border-zinc-800 rounded-lg p-5 space-y-4 transition-all duration-150 hover:border-zinc-800 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            {/* Left icon and details */}
                            <div className="flex items-start space-x-3.5 min-w-0">
                              {/* Step index badge */}
                              <div className="flex items-center justify-center w-8 h-8 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-zinc-500 shrink-0">
                                {stepNum}
                              </div>
                              
                              {/* Step metadata */}
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-xs font-semibold text-zinc-100 truncate">{step.name}</h4>
                                  <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border font-semibold ${
                                    step.type === 'llm_call' ? 'bg-blue-950/20 border-blue-900/30 text-blue-400' :
                                    step.type === 'http_request' ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' :
                                    step.type === 'conditional_branch' ? 'bg-amber-950/10 border-amber-900/20 text-amber-400' :
                                    step.type === 'approval_gate' ? 'bg-rose-950/10 border-rose-900/20 text-rose-400' :
                                    step.type === 'db_write' ? 'bg-teal-950/20 border-teal-900/30 text-teal-400' :
                                    'bg-zinc-900 border-zinc-800 text-zinc-400'
                                  }`}>
                                    {info.label}
                                  </span>
                                </div>
                                
                                {/* Step configuration description */}
                                <div className="mt-2 text-xs text-zinc-400 space-y-1">
                                  {step.type === 'llm_call' && (
                                    <>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-zinc-500 font-medium w-[60px]">Model:</span>
                                        <span className="font-mono text-[10px] text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 block max-w-xs truncate">{step.config?.model || 'llama-3.1-8b-instant'}</span>
                                      </div>
                                      <div className="mt-1.5">
                                        <span className="text-zinc-500 font-medium w-[60px] block mb-1">Prompt:</span>
                                        <p className="text-zinc-400 line-clamp-2 bg-black/20 border border-zinc-900/40 px-2 py-1.5 rounded max-w-md">{step.config?.prompt || ''}</p>
                                      </div>
                                    </>
                                  )}
                                  {step.type === 'http_request' && (
                                    <>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-zinc-500 font-medium w-[60px]">Request:</span>
                                        <span className="font-bold text-[9px] text-emerald-400 uppercase bg-emerald-950/20 border border-emerald-900/30 px-2 py-0.5 rounded">{step.config?.method || 'GET'}</span>
                                      </div>
                                      <div className="mt-1.5">
                                        <span className="text-zinc-500 font-medium w-[60px] block mb-1">URL:</span>
                                        <span className="font-mono text-[10px] text-zinc-300 block max-w-md truncate" title={step.config?.url}>{step.config?.url}</span>
                                      </div>
                                    </>
                                  )}
                                  {step.type === 'conditional_branch' && (
                                    <>
                                      <div className="flex items-center space-x-2">
                                        <span className="text-zinc-500 font-medium w-[60px]">Condition:</span>
                                        <span className="font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 block max-w-md truncate">{step.config?.condition}</span>
                                      </div>
                                      <div className="mt-1.5">
                                        <span className="text-zinc-500 font-medium w-[60px] block mb-1">Behavior:</span>
                                        <span className="text-zinc-500 italic text-[10px]">{step.config?.skipOnFalse ? 'FALSE → skip downstream steps' : 'TRUE → skip downstream steps'}</span>
                                      </div>
                                    </>
                                  )}
                                  {['db_write', 'notify', 'approval_gate'].includes(step.type) && (
                                    <div className="mt-1">
                                      <span className="text-zinc-500 font-medium w-[60px] block mb-1">Type:</span>
                                      <span className="text-zinc-500 italic text-[10px]">Configuration saved (Integration Stub)</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right Controls */}
                            <div className="flex items-center space-x-2 shrink-0">
                              {canEdit && (
                                <>
                                  {/* Move up/down buttons */}
                                  <div className="flex items-center space-x-1 bg-zinc-900/60 p-0.5 rounded border border-zinc-800">
                                    <button
                                      onClick={() => handleMoveStepUp(step, orderedSteps)}
                                      disabled={idx === 0}
                                      aria-label="Move Step Up"
                                      title="Move Step Up"
                                      className="px-1.5 py-0.5 rounded text-[9px] text-zinc-400 hover:text-zinc-100 disabled:opacity-20 transition-all cursor-pointer font-semibold"
                                    >
                                      ↑
                                    </button>
                                    <button
                                      onClick={() => handleMoveStepDown(step, orderedSteps)}
                                      disabled={idx === orderedSteps.length - 1}
                                      aria-label="Move Step Down"
                                      title="Move Step Down"
                                      className="px-1.5 py-0.5 rounded text-[9px] text-zinc-400 hover:text-zinc-100 disabled:opacity-20 transition-all cursor-pointer font-semibold"
                                    >
                                      ↓
                                    </button>
                                  </div>
                                  
                                  <button
                                    onClick={() => handleEditStepClick(step)}
                                    aria-label="Edit Config"
                                    className="text-xs text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-800 transition-colors py-1 px-2.5 rounded cursor-pointer bg-zinc-900/50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteStep(step.id)}
                                    aria-label="Delete Step"
                                    className="text-xs text-rose-400 hover:text-rose-200 border border-rose-950/20 hover:border-rose-900 transition-all py-1 px-2.5 rounded cursor-pointer bg-rose-950/5"
                                  >
                                    Delete
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Collapsible raw JSON configuration display */}
                          {step.config && Object.keys(step.config).length > 0 && (
                            <details className="group border-t border-zinc-800/60 pt-3">
                              <summary className="text-[9px] text-zinc-500 font-semibold cursor-pointer select-none hover:text-zinc-300 transition-colors uppercase tracking-wider outline-none">
                                Raw JSON Configuration
                              </summary>
                              <div className="mt-2 bg-zinc-950/60 border border-zinc-900 rounded-md p-3 overflow-x-auto max-h-48">
                                <pre className="text-[10px] font-mono text-zinc-400 select-all leading-relaxed">
                                  {JSON.stringify(step.config, null, 2)}
                                </pre>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Recent Executions Section */}
            <div className="bg-[#131316] border border-zinc-800 rounded-lg p-6 space-y-5 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
                <span>Execution History</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-full">
                  {workflowRuns.length}
                </span>
              </h2>

              {workflowRuns.length === 0 ? (
                <div className="border border-dashed border-zinc-800 bg-zinc-950/5 rounded-md p-6 text-center text-zinc-500 text-xs flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center mb-3 text-zinc-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-zinc-400 font-medium mb-1">No execution runs recorded</p>
                  <p className="text-zinc-500 text-xs">Use the "Run Workflow" option to test.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workflowRuns.map((run: any) => {
                    const isExpanded = expandedRunId === run.id
                    const startedTime = run.started_at ? new Date(run.started_at).toLocaleString() : 'N/A'
                    const duration = run.started_at && run.completed_at
                      ? (new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000
                      : null

                    return (
                      <div key={run.id} className="border border-zinc-800 rounded-md overflow-hidden bg-zinc-950/5">
                        {/* Run Header */}
                        <div 
                          onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                          className="flex flex-wrap items-center justify-between gap-4 p-3 cursor-pointer select-none hover:bg-zinc-900/40 text-xs transition-colors"
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${
                              run.status === 'completed' ? 'bg-emerald-500' :
                              run.status === 'running' ? 'bg-blue-500 animate-pulse' :
                              run.status === 'paused' ? 'bg-amber-500' :
                              'bg-rose-500'
                            }`} />
                            <div>
                              <span className="font-mono font-semibold text-zinc-300 select-all">#{run.id.slice(0, 8)}</span>
                              <span className="text-[10px] text-zinc-500 ml-2 font-medium">{startedTime}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            {duration !== null ? (
                              <>
                                <span className="flex items-center space-x-2">
                                  <span className="text-[10px] font-mono text-zinc-400">{duration.toFixed(2)}s</span>
                                  <span className="w-0.5 bg-zinc-800/50"></span>
                                  <span className="text-xs text-zinc-505">{duration > 60 ? `${(duration/60).toFixed(1)}m` : `${duration.toFixed(2)}s`}</span>
                                </span>
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                                  run.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                  run.status === 'running' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse' :
                                  run.status === 'paused' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                  'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                }`}>
                                  {run.status === 'paused' ? 'WAITING APPROVAL' : run.status}
                                </span>
                              </>
                            ) : (
                              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                                run.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                run.status === 'running' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse' :
                                run.status === 'paused' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              }`}>
                                {run.status === 'paused' ? 'WAITING APPROVAL' : run.status}
                              </span>
                            )}
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
                                      <div className="flex-1 bg-[#0e0e11] border border-zinc-800 rounded p-2.5 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <span className="font-semibold text-zinc-300">{step.name || 'Step'}</span>
                                            <span className="text-[9px] text-zinc-500 font-mono ml-2">Pos: {step.position}</span>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded border ${
                                              stepRun.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                              stepRun.status === 'skipped' ? 'bg-zinc-800 border-zinc-800 text-zinc-500' :
                                              stepRun.status === 'paused' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                                              'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                            }`}>
                                              {stepRun.status === 'paused' ? 'PENDING APPROVAL' : stepRun.status}
                                            </span>
                                            {(stepRun.input || stepRun.output || stepRun.error) && (
                                              <button
                                                onClick={() => setExpandedStepRunId(isStepRunExpanded ? null : stepRun.id)}
                                                className="text-[9px] text-zinc-400 hover:text-zinc-150 transition-colors cursor-pointer"
                                              >
                                                {isStepRunExpanded ? 'Hide Payload' : 'Show Payload'}
                                              </button>
                                            )}
                                          </div>
                                        </div>

                                        {stepRun.status === 'paused' && (
                                          <div className="bg-amber-950/10 border border-amber-900/20 rounded p-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                                            <div className="space-y-0.5">
                                              <span className="block text-[8px] font-semibold text-amber-500 uppercase tracking-wider">Approval Paused</span>
                                              <span className="text-zinc-300 text-[10px]">
                                                {stepRun.output?.message || 'Requires owner/editor approval to resume.'}
                                              </span>
                                            </div>
                                            {canEdit && (
                                              <button
                                                onClick={async (e) => {
                                                  e.stopPropagation()
                                                  await handleApproveRun(run.id)
                                                }}
                                                disabled={approvingRunId === run.id}
                                                className="bg-zinc-100 hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 font-semibold py-1 px-3 rounded text-[10px] transition-colors duration-155 cursor-pointer self-start sm:self-center select-none shadow-sm"
                                              >
                                                {approvingRunId === run.id ? 'Approving...' : 'Approve & Resume'}
                                              </button>
                                            )}
                                          </div>
                                        )}

                                        {stepRun.error && (
                                          <div className="bg-rose-950/10 border border-rose-900/20 rounded p-2.5 text-[10px] font-mono text-rose-400 whitespace-pre-wrap leading-relaxed">
                                            {stepRun.error}
                                          </div>
                                        )}

                                        {isStepRunExpanded && (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
                                            {stepRun.input && (
                                              <div className="space-y-1">
                                                <span className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider">Input</span>
                                                <pre className="text-[9px] font-mono text-zinc-400 bg-black/40 p-2 rounded overflow-x-auto max-h-32 border border-zinc-900">
                                                  {typeof stepRun.input === 'object' ? JSON.stringify(stepRun.input, null, 2) : String(stepRun.input)}
                                                </pre>
                                              </div>
                                            )}
                                            {stepRun.output && (
                                              <div className="space-y-1">
                                                <span className="text-[8px] font-semibold text-zinc-500 uppercase tracking-wider">Output</span>
                                                <pre className="text-[9px] font-mono text-zinc-400 bg-black/40 p-2 rounded overflow-x-auto max-h-32 border border-zinc-900">
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
          <div className="space-y-6 min-w-0">
            
            {/* User Access Rights */}
            <div className="bg-[#131316] border border-zinc-800 rounded-lg p-5 space-y-3 shadow-sm">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Access Control</span>
              <div className="flex items-center justify-between text-xs border-t border-zinc-900 pt-2.5">
                <span className="text-zinc-400">Your Role</span>
                <span className="font-semibold uppercase tracking-wider text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-[10px]">
                  {userRole}
                </span>
              </div>
            </div>

            {/* Manual Run Card */}
            {canEdit && (
              <div className="bg-[#131316] border border-zinc-800 rounded-lg p-5 space-y-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Manual Execution</h3>
                
                {/* Customer Message input area for Demo */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                    Customer Message
                  </label>
                  <textarea
                    value={customerMessage}
                    onChange={(e) => setCustomerMessage(e.target.value)}
                    rows={3}
                    placeholder="Enter support message..."
                    className="w-full px-2.5 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded text-xs text-zinc-300 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 resize-none font-medium leading-relaxed"
                  />
                </div>

                <Button
                  onClick={handleRunWorkflow}
                  disabled={isRunningWorkflow}
                  isLoading={isRunningWorkflow}
                  block
                >
                  {runId ? 'Re-run Workflow' : 'Run Workflow'}
                </Button>
                
                {runId && (
                  <div className="pt-2.5 border-t border-zinc-900 space-y-1.5">
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

            {/* Dangerous Actions Box */}
            {canDelete && (
              <div className="bg-red-950/5 border border-red-900/20 rounded-lg p-5 space-y-3 shadow-sm">
                <div>
                  <h4 className="text-xs font-semibold text-red-400">Danger Zone</h4>
                  <p className="text-[11px] text-zinc-500 leading-normal mt-1">
                    Permanently delete this workflow pipeline. This action is irreversible.
                  </p>
                </div>
                <Button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  isLoading={isDeleting}
                  variant="danger"
                  block
                >
                  Delete Workflow
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Step Modal */}
      {showStepForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px] animate-fade-in">
          <div className="w-full max-w-lg bg-[#131316] border border-zinc-800 rounded-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-semibold text-zinc-100">
              {editingStepId ? 'Configure Step Details' : 'Add New Step'}
            </h3>

            {stepError && (
              <div className="p-3 bg-rose-950/10 border border-rose-900/20 text-rose-300 rounded-lg text-xs font-mono">
                {stepError}
              </div>
            )}

            <form onSubmit={handleStepFormSubmit} className="space-y-4">
              {/* Step Name */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Step Name
                </label>
                <input
                  type="text"
                  value={stepName}
                  onChange={(e) => setStepName(e.target.value)}
                  required
                  disabled={isStepSaving}
                  placeholder="e.g. Run Sentiment Analysis"
                  className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 text-zinc-100 text-xs transition-colors"
                />
              </div>

              {/* Step Type */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
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
                  className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 text-zinc-100 text-xs cursor-pointer transition-colors"
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
                <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
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
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Configuration (JSON)
                </label>
                <textarea
                  value={stepConfigStr}
                  onChange={(e) => setStepConfigStr(e.target.value)}
                  required
                  disabled={isStepSaving}
                  rows={6}
                  className="w-full px-3 py-1.5 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 text-zinc-100 font-mono text-xs resize-none"
                  placeholder={'{\n  "prompt": "Evaluate context..."\n}'}
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end items-center space-x-2.5 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowStepForm(false)}
                  disabled={isStepSaving}
                  className="text-zinc-500 hover:text-zinc-200 text-xs font-semibold px-3 py-1.5 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isStepSaving}
                  isLoading={isStepSaving}
                >
                  Save Configuration
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
