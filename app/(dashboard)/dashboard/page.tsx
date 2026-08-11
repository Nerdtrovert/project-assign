'use client'

import Link from 'next/link'
import { useQuery, gql } from 'urql'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'

const GetDashboardStatsQuery = gql`
  query GetDashboardStats {
    workflows {
      id
      name
    }
    workflow_runs(order_by: { started_at: desc }, limit: 50) {
      id
      status
      started_at
      completed_at
      workflow {
        id
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

  // Count workflows and runs on the client side to avoid restricted Hasura aggregate field errors
  const totalWorkflows = workflows.length
  const totalRuns = runs.length

  // Calculate success rate
  const successfulRuns = runs.filter((run: any) => run.status === 'completed').length
  const successRate = runs.length > 0 ? Math.round((successfulRuns / runs.length) * 100) : 0

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Overview</h1>
        <p className="text-xs text-zinc-400 mt-1">System status and resource monitoring console.</p>
      </div>

      {/* Main Console Box */}
      <div className="bg-[#131316] border border-zinc-800 rounded-lg p-6 space-y-4">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold text-zinc-100">AI Workflow Orchestrator</h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Build, execute, and monitor automated task workflows. Connect text generation steps, HTTP webhooks, conditional evaluations, and approval gates in a unified system.
          </p>
        </div>
        <div className="flex items-center space-x-3 pt-2">
          <Link
            href="/workflows"
            className="bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold py-1.5 px-4 rounded-md text-xs transition-colors duration-150 cursor-pointer"
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Workflows */}
        <Card>
          <Card.Header className="mb-2">
            <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total Workflows</h3>
          </Card.Header>
          <Card.Content>
            <div className="text-2xl font-bold text-zinc-100 mt-1">
              {fetching ? <Skeleton className="h-7 w-16" /> : totalWorkflows}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">Configured pipelines</p>
          </Card.Content>
        </Card>

        {/* Total Runs */}
        <Card>
          <Card.Header className="mb-2">
            <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Total Executions</h3>
          </Card.Header>
          <Card.Content>
            <div className="text-2xl font-bold text-zinc-100 mt-1">
              {fetching ? <Skeleton className="h-7 w-16" /> : totalRuns}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">All recorded runs</p>
          </Card.Content>
        </Card>

        {/* Success Rate */}
        <Card>
          <Card.Header className="mb-2">
            <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Success Rate</h3>
          </Card.Header>
          <Card.Content>
            <div className="text-2xl font-bold text-zinc-100 mt-1">
              {fetching ? <Skeleton className="h-7 w-16" /> : `${successRate}%`}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">Successful completions</p>
          </Card.Content>
        </Card>

        {/* System Status */}
        <Card>
          <Card.Header className="mb-2">
            <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">System Status</h3>
          </Card.Header>
          <Card.Content>
            <div className="space-y-2 mt-1">
              <div className="flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-semibold w-fit">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active</span>
              </div>
              <p className="text-xs text-zinc-300 font-medium">All Systems Operational</p>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Recent Executions */}
      <div className="bg-[#131316] border border-zinc-800 rounded-lg p-6">
        <div className="flex justify-between items-start gap-4 mb-4">
          <h3 className="text-sm font-semibold text-zinc-100">Recent Executions</h3>
          <Link href="/workflows" className="text-xs text-zinc-400 hover:text-zinc-100 transition-colors">
            View All Runs
          </Link>
        </div>

        {fetching && (
          <div className="grid grid-cols-1 gap-3">
            {[1, 2, 3, 4, 5].map((_, i) => (
              <div key={i} className="border border-zinc-800 rounded-md overflow-hidden bg-zinc-950/10">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-2 w-2 rounded-full bg-zinc-700 animate-pulse" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!fetching && error && (
          <div className="text-rose-400 text-xs font-mono py-2 bg-rose-950/10 border border-rose-900/20 rounded p-3">
            Failed to query execution logs: {error.message}
          </div>
        )}

        {!fetching && !error && runs.length === 0 && (
          <div className="text-center py-10 border border-dashed border-zinc-800 rounded-lg bg-zinc-950/15">
            <div className="flex items-center justify-center h-10 w-10 mx-auto mb-3 bg-zinc-900/60 rounded-md border border-zinc-800 text-zinc-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-zinc-400 text-xs font-medium">No execution logs recorded</p>
            <p className="text-zinc-500 text-[11px] mt-1">Build a workflow and trigger a manual run to see live execution status.</p>
          </div>
        )}

        {!fetching && !error && runs.length > 0 && (
          <div className="space-y-3">
            {runs.slice(0, 10).map((run: any) => {
              const runTime = run.started_at
                ? new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '--:--'

              const duration = run.started_at && run.completed_at
                ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
                : null

              return (
                <div key={run.id} className="border border-zinc-800 bg-zinc-950/10 rounded-md overflow-hidden hover:border-zinc-800 transition-colors">
                  <div className="flex items-center justify-between p-4">
                    {/* Left side: workflow info */}
                    <div className="flex items-center space-x-4">
                      {/* Status indicator dot */}
                      <span className={`h-2 w-2 rounded-full ${
                        run.status === 'completed' ? 'bg-emerald-500' :
                        run.status === 'running' ? 'bg-blue-500 animate-pulse' :
                        run.status === 'paused' ? 'bg-amber-500' :
                        'bg-rose-500'
                      }`} />

                      {/* Workflow details */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-semibold text-zinc-150">{run.workflow?.name || 'Unnamed Workflow'}</h4>
                        <p className="text-[10px] text-zinc-500 font-mono select-all">
                          #{run.id.slice(0, 8)}
                        </p>
                      </div>
                    </div>

                    {/* Right side: timing and status */}
                    <div className="flex items-center space-x-4 text-xs">
                      <div className="flex items-center space-x-2 text-[11px]">
                        <span className="text-zinc-500">{runTime}</span>
                        {duration && (
                          <>
                            <span className="text-zinc-700">|</span>
                            <span className="text-zinc-400">{duration}</span>
                          </>
                        )}
                      </div>
                      <Badge
                        variant={run.status === 'completed' ? 'success' :
                                 run.status === 'running' ? 'secondary' :
                                 run.status === 'paused' ? 'warning' : 'error'
                        }
                      >
                        {run.status === 'paused' ? 'WAITING APPROVAL' :
                         run.status.charAt(0).toUpperCase() + run.status.slice(1).toLowerCase()}
                      </Badge>
                    </div>
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