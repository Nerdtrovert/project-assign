import Link from 'next/link'

export default function Dashboard() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Welcome to AI Agent Workflow Builder</h1>
      <p className="mb-6">
        This is the dashboard placeholder. Here you will be able to view and manage your workflows.
      </p>
      <Link href="/workflows" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        View Workflows
      </Link>
    </div>
  )
}
