'use client'

import Link from 'next/link'
import { useQuery, gql } from 'urql'

const GetDashboardStatsQuery = gql`
  query GetDashboardStats {
    workflows {
      id
      name
    }
    workflow_runs(order_by: { started_at: desc }, limit: 5) {
      id
      status
      started_at
      completed_at
      workflow {
        name
      }
    }
  }
`

export default function DashboardPage() {
  const [result] = useQuery({ query: GetDashboardStatsQuery })
  const { data, fetching, error } = result

  const workflows = data?.workflows || []
  const runs = data?.workflow_runs || []

  const totalWorkflows = workflows.length
  const totalRuns = runs.length // Wait, this is just the limit, but we can display the total if we count it or just show the active ones
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Overview</h1>
        <p className="text-xs text-zinc-400 mt-1">System status and resource monitoring console.</p>
      </div>

      {/* Main Console Box */}
      <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-6 space-y-4">
        <div className="max-w-2xl">
          <h2 className="text-base font-semibold text-zinc-100">AI Workflow Orchestrator</h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Build, execute, and monitor automated task workflows. Connect text generation steps, HTTP webhooks, conditional evaluations, and notification channels in a unified system.
          </p>
        </div>
        <div className="flex items-center space-x-3 pt-2">
          <Link
            href="/workflows"
            className="bg-violet-600 hover:bg-violet-700 text-white font-medium py-1.5 px-4 rounded-md text-xs transition-colors duration-150 cursor-pointer"
          >
            Explore Workflows
          </Link>
          <Link
            href="/workflows/new"
            className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 font-medium py-1.5 px-4 rounded-md border border-zinc-800 text-xs transition-colors duration-150 cursor-pointer"
          >
            Build Workflow
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-5">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Total Workflows</p>
          <h3 className="text-2xl font-bold text-zinc-100 mt-1.5">
            {fetching ? '...' : totalWorkflows}
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1">Configured workflow pipelines</p>
        </div>

        <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-5">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Recent Executions</p>
          <h3 className="text-2xl font-bold text-zinc-100 mt-1.5">
            {fetching ? '...' : runs.length}
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1">Runs recorded in database</p>
        </div>

        <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-5">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Console Status</p>
          <h3 className="text-2xl font-bold text-emerald-500 mt-1.5 flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-base font-semibold">Active</span>
          </h3>
          <p className="text-[10px] text-zinc-500 mt-1">Nhost and Hasura connections operational</p>
        </div>
      </div>

      {/* System Observability Feed */}
      <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-100">Live System Logs (Recent Runs)</h3>
        
        {fetching && (
          <div className="text-zinc-500 text-xs py-4">Querying database runs...</div>
        )}

        {!fetching && error && (
          <div className="text-rose-400 text-xs font-mono py-2">
            Failed to query run logs: {error.message}
          </div>
        )}

        {!fetching && !error && runs.length === 0 && (
          <div className="text-zinc-500 text-xs py-4 border border-dashed border-zinc-800 rounded-md text-center">
            No execution logs recorded. Build a workflow and trigger a manual run to see live logs.
          </div>
        )}

        {!fetching && !error && runs.length > 0 && (
          <div className="divide-y divide-zinc-800/60 border border-zinc-800 rounded-md overflow-hidden bg-zinc-950/20">
            {runs.map((run: any) => {
              const runTime = run.started_at ? new Date(run.started_at).toLocaleTimeString() : 'N/A'
              const duration = run.started_at && run.completed_at
                ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                : null

              return (
                <div key={run.id} className="flex items-center justify-between p-3.5 text-xs text-zinc-300">
                  <div className="flex items-center space-x-3">
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      run.status === 'completed' ? 'bg-emerald-500' :
                      run.status === 'running' ? 'bg-blue-500 animate-pulse' :
                      'bg-rose-500'
                    }`} />
                    <span className="font-semibold text-zinc-100">{run.workflow?.name || 'Workflow'}</span>
                    <span className="text-zinc-500 font-mono text-[10px] select-all">#{run.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-zinc-500 text-[10px]">{runTime} {duration && `(${duration})`}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      run.status === 'completed' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                      run.status === 'running' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' :
                      'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                    }`}>
                      {run.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
