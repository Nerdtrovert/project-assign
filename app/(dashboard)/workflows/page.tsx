'use client'

import { useUserEmail } from '@nhost/react'
import Link from 'next/link'

export default function WorkflowsPage() {
  const email = useUserEmail()

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">My Workflows</h1>
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600">
            This is the workflows page placeholder. Here you will see a list of your workflows.
          </p>
          {email && (
            <span className="text-sm text-gray-500">
              Logged in as: <strong className="text-gray-700">{email}</strong>
            </span>
          )}
        </div>
        <Link href="/workflows/new" className="mt-2 inline-block bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-150 ease-in-out">
          Create New Workflow
        </Link>
      </div>
    </div>
  )
}