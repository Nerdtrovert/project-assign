'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, gql } from 'urql'

const GetMyOrgsQuery = gql`
  query GetMyOrgs {
    org_members {
      org_id
      role
      organization {
        id
        name
      }
    }
  }
`

const InsertWorkflowMutation = gql`
  mutation InsertWorkflow($name: String!, $description: String!, $orgId: uuid!) {
    insert_workflows_one(object: {
      name: $name,
      description: $description,
      org_id: $orgId
    }) {
      id
      name
    }
  }
`

export default function NewWorkflowPage() {
  const router = useRouter()

  // State management
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // GraphQL query & mutation
  const [orgsResult] = useQuery({ query: GetMyOrgsQuery })
  const [, insertWorkflow] = useMutation(InsertWorkflowMutation)

  interface OrgMember {
    org_id: string
    role: string
    organization: {
      id: string
      name: string
    }
  }

  const { data, fetching, error } = orgsResult
  const members = data?.org_members || []

  // Filter organizations where user is owner or editor (can create)
  const editableOrgs = members.filter((m: any) => m.role === 'owner' || m.role === 'editor')
  const hasEditRights = editableOrgs.length > 0

  // Set default selected organization
  useEffect(() => {
    if (editableOrgs.length > 0 && !selectedOrgId) {
      setSelectedOrgId(editableOrgs[0].org_id)
    }
  }, [editableOrgs])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasEditRights || !selectedOrgId) {
      setSaveError('You do not have permission to create workflows in any organization.')
      return
    }
    if (!name.trim()) {
      setSaveError('Workflow name is required.')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const res = await insertWorkflow({
        name,
        description,
        orgId: selectedOrgId
      })

      if (res.error) {
        throw new Error(res.error.message)
      }

      const newId = res.data?.insert_workflows_one?.id
      if (newId) {
        router.push(`/workflows/${newId}`)
      } else {
        throw new Error('Failed to retrieve new workflow ID')
      }
    } catch (err: any) {
      setSaveError(err.message || 'An error occurred while creating the workflow')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Navigation Breadcrumb */}
      <div className="border-b border-white/5 pb-5">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          <Link href="/workflows" className="hover:text-white transition-colors duration-150">
            Workflows
          </Link>
          <span>/</span>
          <span className="text-violet-400">New Workflow</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Create New Workflow</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure a new autonomous pipeline with triggers, nodes, and tool integrations
        </p>
      </div>

      {/* Loading state */}
      {fetching && (
        <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-violet-500 mb-4"></div>
          <p className="text-slate-400 text-sm">Loading your organizations...</p>
        </div>
      )}

      {/* Error state */}
      {!fetching && error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl p-6 text-sm flex items-start space-x-2">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="font-bold">Failed to load organizations</h4>
            <p className="mt-1 text-xs text-rose-400">{error.message}</p>
          </div>
        </div>
      )}

      {/* Workflow Builder Form */}
      {!fetching && !error && (
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-8 space-y-6">
          {!hasEditRights ? (
            /* Viewer message */
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-sm flex items-start space-x-2">
              <span className="text-lg">��⚠��️</span>
              <div>
                <h4 className="font-bold uppercase tracking-wider text-[10px]">Permission Denied</h4>
                <p className="mt-1 text-xs text-amber-400">
                  Your current account role (Viewer) does not permit creating new workflows in any organization. Please contact your organization owner or administrator to request an upgrade to Editor or Owner.
                </p>
              </div>
            </div>
          ) : (
            /* Sandbox banner */
            <div className="flex items-center space-x-4 p-4 bg-violet-600/10 border border-violet-500/20 rounded-xl">
              <span className="text-2xl">���🏗��️</span>
              <span className="text-2xl">🏗️</span>
              <div>
                <h4 className="text-sm font-bold text-white">Workflow Builder Sandbox</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Input details below to register your workflow definition. Once registered, you will be able to construct node parameters.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 pt-4 border-t border-white/5">
            {saveError && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs">
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Workflow Name */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="name">
                  Workflow Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving || !hasEditRights}
                  required
                  className="w-full px-4 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white font-medium text-sm transition-all placeholder:text-gray-600"
                  placeholder="E.g., Customer Analyzer Pipeline"
                />
              </div>

              {/* Organization selection */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="organization">
                  Target Organization
                </label>
                {editableOrgs.length > 1 ? (
                  <select
                    id="organization"
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    disabled={isSaving || !hasEditRights}
                    className="w-full px-4 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white font-medium text-sm transition-all"
                  >
                    {editableOrgs.map((m: any) => (
                      <option key={m.org_id} value={m.org_id}>
                        {m.organization?.name || `Org ID: ${m.org_id.substring(0, 8)}...`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="organization"
                    type="text"
                    value={editableOrgs[0]?.organization?.name || 'Selected Organization'}
                    disabled
                    className="w-full px-4 py-2.5 bg-slate-950/20 border border-white/5 rounded-xl text-slate-500 font-medium text-sm select-none"
                  />
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving || !hasEditRights}
                rows={4}
                className="w-full px-4 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-white text-sm transition-all resize-none placeholder:text-gray-600"
                placeholder="Briefly describe what this agent workflow does..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-white/5">
              <Link
                href="/workflows"
                className="text-xs font-semibold text-slate-400 hover:text-white transition-colors duration-150"
              >
                ← Cancel and go back
              </Link>
              <button
                type="submit"
                disabled={isSaving || !hasEditRights || !selectedOrgId}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl text-sm transition-all duration-150 shadow-md shadow-indigo-600/20 active:scale-[0.98] transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Workflow'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}