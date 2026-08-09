'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useUserEmail, useSignOut } from '@nhost/react'
import { AuthGuard } from '@/components/auth/AuthGuard'

export default function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const email = useUserEmail()
  const { signOut } = useSignOut()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <AuthGuard>
      <nav className="bg-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-white font-bold text-lg">
              AI Agent Workflow Builder
            </Link>
            <div className="flex space-x-4">
              <Link href="/" className="text-gray-300 hover:text-white transition-colors duration-150">
                Dashboard
              </Link>
              <Link href="/workflows" className="text-gray-300 hover:text-white transition-colors duration-150">
                Workflows
              </Link>
              <Link href="/workflows/new" className="text-gray-300 hover:text-white transition-colors duration-150">
                New Workflow
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {email && (
              <span className="text-gray-300 text-sm bg-gray-700 px-3 py-1.5 rounded-full border border-gray-600">
                {email}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-1.5 px-4 rounded text-sm transition-colors duration-150 ease-in-out cursor-pointer"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="min-h-screen bg-gray-50 p-6">{children}</main>
    </AuthGuard>
  )
}