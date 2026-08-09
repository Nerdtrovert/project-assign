import Link from 'next/link'

export default function NewWorkflowPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Create New Workflow</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">
          This is the workflow builder page placeholder. Here you will be able to create and edit workflows.
        </p>
        <div className="mt-6">
          <Link href="/workflows" className="text-blue-500 hover:underline">
            ← Back to workflows
          </Link>
        </div>
      </div>
    </div>
  )
}
