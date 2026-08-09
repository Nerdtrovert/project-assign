import Link from 'next/link'

export default function Dashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-violet-900/40 via-indigo-900/30 to-slate-900/40 border border-white/10 rounded-2xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-[-50%] right-[-10%] w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[80px]" />
        
        <div className="max-w-2xl relative z-10">
          <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Workspace Dashboard</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-2 mb-4">
            Welcome to AI Agent Workflow Builder
          </h1>
          <p className="text-slate-300 text-base leading-relaxed mb-6">
            Create, manage, and monitor self-correcting multi-agent systems. Connect language models, vector stores, and custom tools to automate complex processes.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/workflows"
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-2.5 px-6 rounded-xl transition duration-150 ease-in-out cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-[0.98] transform text-sm"
            >
              Explore Workflows
            </Link>
            <Link
              href="/workflows/new"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold py-2.5 px-6 rounded-xl transition duration-150 border border-white/5 cursor-pointer text-sm"
            >
              Build New Agent
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { name: 'Total Workflows', value: '0', detail: '0 active systems', icon: '⚡' },
          { name: 'Total Runs Executed', value: '0', detail: '0 successes today', icon: '🔄' },
          { name: 'Connected API Services', value: '1', detail: 'Nhost Client active', icon: '🔌' },
        ].map((metric) => (
          <div key={metric.name} className="bg-slate-900/60 border border-white/5 rounded-2xl p-6 shadow-md hover:border-white/10 transition-all duration-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{metric.name}</p>
                <h3 className="text-3xl font-extrabold text-white mt-2">{metric.value}</h3>
              </div>
              <span className="text-2xl bg-white/5 w-10 h-10 flex items-center justify-center rounded-xl">{metric.icon}</span>
            </div>
            <p className="text-xs text-slate-500 mt-4 font-medium">{metric.detail}</p>
          </div>
        ))}
      </div>

      {/* Quick Start Guidance */}
      <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-8">
        <h2 className="text-lg font-bold text-white mb-4">Quick Start Guide</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-slate-400">
          <div>
            <div className="text-violet-400 font-bold mb-1">01. Create a Workflow</div>
            Define trigger conditions, setup execution nodes, and configure input parameters for your agents.
          </div>
          <div>
            <div className="text-indigo-400 font-bold mb-1">02. Configure Prompt Templates</div>
            Inject system instructions, customize variable placeholders, and hook LLM APIs to drive node logic.
          </div>
          <div>
            <div className="text-blue-400 font-bold mb-1">03. Run and Monitor</div>
            Execute workflows, inspect step-by-step logs, analyze token usage, and manage active session runs.
          </div>
        </div>
      </div>
    </div>
  )
}
