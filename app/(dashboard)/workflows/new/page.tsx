'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, gql } from 'urql'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

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
  const [isSavingSuccess, setIsSavingSuccess] = useState(false)

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
    setIsSavingSuccess(false)

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
        setIsSavingSuccess(true)
        // Small delay to show success state before redirecting
        setTimeout(() => {
          router.push(`/workflows/${newId}`)
        }, 1500)
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
        <div className="bg-[#131316] border border-zinc-800 rounded-lg p-12 text-center flex flex-col items-center justify-center min-h-[250px]">
          <div className="space-y-4">
            <div className="h-6 w-6 animate-spin border-t border-r border-zinc-400 border-l-transparent border-b-transparent rounded-full mx-auto" />
            <p className="text-zinc-400 text-xs">Loading tenant organizations...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {!fetching && error && (
        <div className="bg-rose-950/10 border border-rose-900/20 text-rose-300 rounded-lg p-5 text-xs flex items-start space-x-3">
          <div className="shrink-0 flex h-10 w-10 items-center justify-center bg-rose-950/20 border border-rose-900/30 rounded-md">
            <span className="text-rose-400 font-bold">⚠️</span>
          </div>
          <div>
            <h4 className="font-semibold text-zinc-100 mb-1">Failed to load organizations</h4>
            <p className="mt-1 text-zinc-400 font-mono text-xs">{error.message}</p>
          </div>
        </div>
      )}

      {/* Success state */}
      {isSavingSuccess && (
        <div className="bg-[#131316] border border-zinc-800 rounded-lg p-16 text-center flex flex-col items-center justify-center">
          <div className="space-y-6 max-w-sm">
            <div className="flex h-12 w-12 items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-md mx-auto">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-zinc-100">Workflow Created Successfully</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Redirecting to workflow builder...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Workflow Builder Form */}
      {!fetching && !error && !isSavingSuccess && (
        <div className="bg-[#131316] border border-zinc-800 rounded-lg p-6 space-y-6">
          {!hasEditRights ? (
            /* Viewer message */
            <div className="p-4 bg-amber-950/10 border border-amber-900/20 text-amber-305 rounded-lg text-xs">
              <h4 className="font-semibold uppercase tracking-wider text-[10px] text-amber-450">Permission Required</h4>
              <p className="mt-1 text-zinc-400 leading-relaxed">
                Your current account role (Viewer) does not permit creating new workflows in any organization. Please contact your administrator.
              </p>
            </div>
          ) : (
            /* Form content */
            <>
              <div className="p-4 bg-zinc-950/40 border border-zinc-800 rounded-lg">
                <h4 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">Workflow Configuration</h4>
                <p className="text-[11px] text-zinc-400 mt-1 leading-normal">
                  Register the workflow properties. Once created, you will be redirected to configure the builder nodes and execution parameters.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6 pt-4 border-t border-zinc-800">
                {saveError && (
                  <div className="p-4 bg-rose-950/10 border border-rose-900/20 text-rose-300 rounded-lg text-xs">
                    {saveError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Workflow Name */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500" htmlFor="name">
                      Workflow Name
                    </label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isSaving || !hasEditRights}
                      required
                      placeholder="E.g., Customer Analyzer Pipeline"
                    />
                  </div>

                  {/* Organization selection */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500" htmlFor="organization">
                      Target Organization
                    </label>
                    {editableOrgs.length > 1 ? (
                      <Select
                        id="organization"
                        value={selectedOrgId}
                        onChange={(e) => setSelectedOrgId(e.target.value)}
                        disabled={isSaving || !hasEditRights}
                      >
                        {editableOrgs.map((m: any) => (
                          <option key={m.org_id} value={m.org_id}>
                            {m.organization?.name || `Org ID: ${m.org_id.substring(0, 8)}...`}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <input
                        id="organization"
                        type="text"
                        value={editableOrgs[0]?.organization?.name || 'Selected Organization'}
                        readOnly
                        className="w-full px-3 py-2 bg-[#0e0e11]/60 border border-zinc-800 rounded-md text-zinc-500 text-xs select-none focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500" htmlFor="description">
                    Description
                  </label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSaving || !hasEditRights}
                    rows={5}
                    placeholder="Briefly describe the task automation logic..."
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
                  <Link
                    href="/workflows"
                    className="text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors duration-150"
                  >
                    ← Cancel
                  </Link>
                  <Button
                    type="submit"
                    disabled={isSaving || !hasEditRights || !selectedOrgId}
                    isLoading={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Workflow'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  )
}