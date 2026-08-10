'use client'

import { useUserEmail } from '@nhost/react'
import Link from 'next/link'
import { useQuery, gql } from 'urql'

const GetWorkflowsQuery = gql`
  query GetWorkflows {
    workflows {
      id
      name
    }
  }
`

export default function WorkflowsPage() {
  const email = useUserEmail()

  const [result] = useQuery({
    query: GetWorkflowsQuery,
  })

  const { data, fetching, error } = result
  const workflows = data?.workflows || []

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Workflows</h1>
          <p className="text-xs text-zinc-400 mt-1">
            Build and manage automated task processing pipelines.
          </p>
        </div>
        <Link
          href="/workflows/new"
          className="bg-violet-600 hover:bg-violet-700 text-white font-medium py-1.5 px-4 rounded-md text-xs transition-colors duration-150 cursor-pointer inline-flex items-center"
        >
          Create Workflow
        </Link>
      </div>

      {/* Query Fetching State */}
      {fetching && (
        <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-12 text-center flex flex-col items-center justify-center min-h-[250px]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-zinc-600 mb-3"></div>
          <p className="text-zinc-400 text-xs">Loading system workflows...</p>
        </div>
      )}

      {/* Query Error State */}
      {!fetching && error && (
        <div className="bg-rose-950/20 border border-rose-800/30 text-rose-300 rounded-lg p-5 text-xs flex items-start space-x-3">
          <div className="shrink-0 text-rose-400 font-bold mt-0.5">⚠️</div>
          <div>
            <h4 className="font-semibold">Failed to load workflows</h4>
            <p className="mt-1 text-zinc-400 font-mono">{error.message}</p>
          </div>
        </div>
      )}

      {/* Workflows List */}
      {!fetching && !error && workflows.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {workflows.map((wf: { id: string; name: string }) => (
            <div
              key={wf.id}
              className="bg-[#16161a] border border-zinc-800 rounded-lg p-5 flex justify-between items-center hover:border-zinc-700 hover:bg-[#1f1f23] transition-colors duration-150"
            >
              <div>
                <h3 className="text-sm font-semibold text-zinc-100">{wf.name}</h3>
                <p className="text-[11px] text-zinc-500 font-mono mt-1 select-all">ID: {wf.id}</p>
              </div>
              <Link
                href={`/workflows/${wf.id}`}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 text-xs font-medium py-1.5 px-3 rounded-md transition-colors duration-150 cursor-pointer"
              >
                View Console
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Empty State Card */}
      {!fetching && !error && workflows.length === 0 && (
        <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-12 text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-10 h-10 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-sm mb-4">
            Ø
          </div>

          <h3 className="text-sm font-semibold text-zinc-100 mb-1.5">No active workflows found</h3>
          <p className="text-zinc-400 text-xs max-w-sm mb-5 leading-relaxed">
            No workflows are configured for this organization context. Start by creating a workflow pipeline to define triggers and agent steps.
          </p>

          <Link
            href="/workflows/new"
            className="bg-violet-600 hover:bg-violet-700 text-white font-medium py-1.5 px-4 rounded-md text-xs transition-colors duration-150 cursor-pointer"
          >
            Build Your First Workflow
          </Link>
        </div>
      )}

      {/* Logged in Metadata */}
      {email && (
        <div className="text-center text-[10px] text-zinc-500 font-medium pt-2">
          Session Account: <span className="text-zinc-400 font-mono">{email}</span>
        </div>
      )}
    </div>
  )
}