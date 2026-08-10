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
      <div className="border-b border-zinc-800 pb-4">
        <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">
          <Link href="/workflows" className="hover:text-zinc-300 transition-colors duration-150">
            Workflows
          </Link>
          <span>/</span>
          <span className="text-zinc-400">New Workflow</span>
        </div>
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Create Workflow</h1>
        <p className="text-xs text-zinc-400 mt-1">
          Configure properties to build a new automated processing pipeline.
        </p>
      </div>

      {/* Loading state */}
      {fetching && (
        <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-12 text-center flex flex-col items-center justify-center min-h-[250px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-600 mb-3"></div>
          <p className="text-zinc-400 text-xs">Querying tenant organizations...</p>
        </div>
      )}

      {/* Error state */}
      {!fetching && error && (
        <div className="bg-rose-950/20 border border-rose-800/30 text-rose-300 rounded-lg p-5 text-xs flex items-start space-x-3">
          <div className="shrink-0 text-rose-400 font-bold mt-0.5">⚠️</div>
          <div>
            <h4 className="font-semibold">Failed to load organizations</h4>
            <p className="mt-1 text-zinc-400 font-mono">{error.message}</p>
          </div>
        </div>
      )}

      {/* Workflow Builder Form */}
      {!fetching && !error && (
        <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-6 space-y-6">
          {!hasEditRights ? (
            /* Viewer message */
            <div className="p-4 bg-amber-950/20 border border-amber-800/30 text-amber-300 rounded-lg text-xs">
              <h4 className="font-semibold uppercase tracking-wider text-[10px] text-amber-400">Permission Required</h4>
              <p className="mt-1 text-zinc-400 leading-normal">
                Your current account role (Viewer) does not permit creating new workflows in any organization. Please contact your administrator.
              </p>
            </div>
          ) : (
            /* Sandbox banner */
            <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-lg">
              <h4 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">Workflow Configuration</h4>
              <p className="text-[11px] text-zinc-400 mt-1 leading-normal">
                Register the workflow properties. Once created, you will be redirected to configure the builder nodes and execution parameters.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-zinc-800">
            {saveError && (
              <div className="p-3.5 bg-rose-950/20 border border-rose-800/30 text-rose-300 rounded-lg text-xs">
                {saveError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Workflow Name */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400" htmlFor="name">
                  Workflow Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSaving || !hasEditRights}
                  required
                  className="w-full px-3 py-2 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors placeholder:text-zinc-700"
                  placeholder="E.g., Customer Analyzer Pipeline"
                />
              </div>

              {/* Organization selection */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400" htmlFor="organization">
                  Target Organization
                </label>
                {editableOrgs.length > 1 ? (
                  <select
                    id="organization"
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    disabled={isSaving || !hasEditRights}
                    className="w-full px-3 py-2 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors"
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
                    className="w-full px-3 py-2 bg-[#0e0e11]/60 border border-zinc-800 rounded-md text-zinc-500 text-xs select-none"
                  />
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSaving || !hasEditRights}
                rows={4}
                className="w-full px-3 py-2 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors resize-none placeholder:text-zinc-700"
                placeholder="Briefly describe the task automation logic..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
              <Link
                href="/workflows"
                className="text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors duration-150"
              >
                ← Cancel
              </Link>
              <button
                type="submit"
                disabled={isSaving || !hasEditRights || !selectedOrgId}
                className="bg-violet-600 hover:bg-violet-700 text-white font-medium py-1.5 px-4 rounded-md text-xs transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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