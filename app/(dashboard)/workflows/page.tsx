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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Workflows</h1>
          <p className="text-sm text-slate-400 mt-1">
            Build, test, and manage your autonomous AI agent pipelines
          </p>
        </div>
        <Link
          href="/workflows/new"
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-2 px-5 rounded-xl text-sm transition-all duration-150 ease-in-out cursor-pointer shadow-md shadow-indigo-600/10 active:scale-[0.98] transform inline-flex items-center space-x-2"
        >
          <span>Create New Workflow</span>
        </Link>
      </div>

      {/* Query Fetching State */}
      {fetching && (
        <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-violet-500 mb-4"></div>
          <p className="text-slate-400 text-sm">Loading workflows...</p>
        </div>
      )}

      {/* Query Error State */}
      {!fetching && error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-2xl p-6 text-sm flex items-start space-x-2">
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <h4 className="font-bold">Failed to load workflows</h4>
            <p className="mt-1 text-xs text-rose-400">{error.message.replace(/'/g, "&apos;")}</p>
          </div>
        </div>
      )}

      {/* Workflows List */}
      {!fetching && !error && workflows.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {workflows.map((wf: { id: string; name: string }) => (
            <div
              key={wf.id}
              className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 flex justify-between items-center hover:border-white/10 hover:bg-slate-900/80 transition-all duration-200"
            >
              <div>
                <h3 className="text-lg font-bold text-white">{wf.name}</h3>
                <p className="text-xs text-slate-500 font-mono mt-1.5 select-all">ID: {wf.id}</p>
              </div>
              <Link
                href={`/workflows/${wf.id}`}
                className="bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white border border-white/5 text-xs font-semibold py-2.5 px-4 rounded-lg transition-all duration-150 active:scale-95 transform cursor-pointer"
              >
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Empty State Card */}
      {!fetching && !error && workflows.length === 0 && (
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[350px]">
          <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-3xl mb-6">
            ���� �� �� 💫 ���� �� �� ⚡
          </div>

          <h3 className="text-lg font-bold text-white mb-2">No active workflows found</h3>
          <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
            It looks like you don&apos;t have access to any workflows or haven&apos;t created any yet. Start by building your first automated pipeline with AI agent nodes.
          </p>

          <Link
            href="/workflows/new"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold py-2 px-6 rounded-xl text-sm border border-white/5 transition duration-150 cursor-pointer"
          >
            Build Your First Workflow
          </Link>
        </div>
      )}

      {/* Logged in Metadata */}
      {email && (
        <div className="text-center text-xs text-slate-500 font-medium pt-4">
          Session Owner:{' '}
          <span className="text-slate-400 bg-slate-800/50 px-2 py-1 rounded border border-white/5 ml-1">
            {email}
          </span>
        </div>
      )}
    </div>
  )
}