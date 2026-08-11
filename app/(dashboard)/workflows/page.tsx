'use client'

import { useUserEmail } from '@nhost/react'
import Link from 'next/link'
import { useQuery, gql } from 'urql'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'

const GetWorkflowsQuery = gql`
  query GetWorkflows {
    workflows {
      id
      name
      description
      workflow_steps {
        id
      }
      workflow_runs(order_by: { started_at: desc }, limit: 1) {
        id
        status
        started_at
        completed_at
      }
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
          className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold py-1.5 px-4 rounded-md text-xs transition-colors duration-150 cursor-pointer inline-flex items-center"
        >
          Create Workflow
        </Link>
      </div>

      {/* Query Fetching State */}
      {fetching && (
        <div className="bg-[#131316] border border-zinc-800 rounded-lg p-12 text-center flex flex-col items-center justify-center min-h-[250px]">
          <div className="space-y-4">
            <div className="h-6 w-6 animate-spin border-t border-r border-zinc-400 border-l-transparent border-b-transparent rounded-full mx-auto" />
            <p className="text-zinc-400 text-xs">Loading workflows...</p>
          </div>
        </div>
      )}

      {/* Query Error State */}
      {!fetching && error && (
        <div className="bg-rose-950/10 border border-rose-900/20 text-rose-300 rounded-lg p-5 text-xs flex items-start space-x-3">
          <div className="shrink-0 flex h-10 w-10 items-center justify-center bg-rose-950/20 border border-rose-900/30 rounded-md">
            <span className="text-rose-400 font-bold">⚠️</span>
          </div>
          <div>
            <h4 className="font-semibold text-zinc-100 mb-1">Failed to load workflows</h4>
            <p className="mt-1 text-zinc-400 font-mono text-xs leading-relaxed">{error.message}</p>
          </div>
        </div>
      )}

      {/* Workflows List */}
      {!fetching && !error && workflows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((wf: any) => (
            <Link
              key={wf.id}
              href={`/workflows/${wf.id}`}
              className="block group"
            >
              <Card className="hover:border-zinc-700 hover:bg-[#161619]/40 transition-all duration-200 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Workflow Header */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors">{wf.name}</h3>
                    {wf.description && (
                      <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">
                        {wf.description}
                      </p>
                    )}
                  </div>

                  {/* Workflow Metadata */}
                  <div className="space-y-3 text-xs pt-2">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <span className="text-zinc-500">Steps</span>
                      <span className="text-zinc-300 font-mono font-semibold">{wf.workflow_steps?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                      <span className="text-zinc-500">Last Run</span>
                      <span className="text-zinc-300 font-mono capitalize">
                        {wf.workflow_runs?.[0]?.status || 'Never'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-zinc-500">Updated</span>
                      <span className="text-zinc-300 font-mono">
                        {wf.workflow_runs?.[0]?.started_at ?
                          new Date(wf.workflow_runs[0].started_at).toLocaleDateString() :
                          'Never'}
                      </span>
                    </div>
                  </div>

                  {/* Latest Run Status Indicator */}
                  {wf.workflow_runs?.[0] && (
                    <div className="mt-2 pt-2 border-t border-zinc-900">
                      <div className="flex items-center space-x-2">
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          wf.workflow_runs[0].status === 'completed' ? 'bg-emerald-500' :
                          wf.workflow_runs[0].status === 'running' ? 'bg-blue-500 animate-pulse' :
                          wf.workflow_runs[0].status === 'paused' ? 'bg-amber-500' :
                          'bg-rose-500'
                        }`} />
                        <span className="text-[11px] font-medium text-zinc-300 capitalize">
                          {wf.workflow_runs[0].status}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="mt-4 pt-3 border-t border-zinc-800 flex justify-between items-center">
                  <span className="text-[10px] text-zinc-500 font-mono">ID: {wf.id.slice(0, 8)}</span>
                  <span className="text-xs font-semibold text-zinc-300 group-hover:text-zinc-100 flex items-center gap-1">
                    Configure <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Empty State Card */}
      {!fetching && !error && workflows.length === 0 && (
        <div className="bg-[#131316] border border-zinc-800 rounded-lg p-16 text-center flex flex-col items-center justify-center min-h-[320px]">
          <div className="space-y-6 max-w-md">
            <div className="flex h-12 w-12 items-center justify-center bg-zinc-900/60 rounded-md border border-zinc-800 text-zinc-500 mx-auto">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-zinc-100">No workflows found</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                You haven't created any workflows yet. Get started by building your first automated workflow pipeline.
              </p>
            </div>
            <Link
              href="/workflows/new"
              className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold py-2 px-4 rounded-md text-xs transition-colors duration-150 cursor-pointer inline-block"
            >
              Create Your First Workflow
            </Link>
          </div>
        </div>
      )}

      {/* Logged in Metadata */}
      {email && (
        <div className="text-center text-[10px] text-zinc-500 font-medium pt-2">
          Session Account: <span className="text-zinc-500 font-mono">{email}</span>
        </div>
      )}
    </div>
  )
}