import Link from 'next/link'

type Params = Promise<{ workflowId: string }>

export default async function WorkflowDetailPage({ params }: { params: Params }) {
  const { workflowId } = await params

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Workflow Detail</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">
          Viewing workflow with ID: <strong>{workflowId}</strong>
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
