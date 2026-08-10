'use client'

import Link from 'next/link'
import { type ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
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
  const pathname = usePathname()

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
  }

  const navItems = [
    { name: 'Overview', href: '/' },
    { name: 'Workflows', href: '/workflows' },
    { name: 'Build Workflow', href: '/workflows/new' },
  ]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#0e0e11] text-zinc-100 flex flex-col font-sans">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-40 bg-[#16161a] border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex justify-between items-center">
            
            {/* Logo */}
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-2.5 group">
                <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-100 font-bold text-xs">
                  ⚙️
                </div>
                <span className="font-semibold tracking-tight text-zinc-100 text-sm">
                  Workflow Console
                </span>
              </Link>
              <div className="h-4 w-[1px] bg-zinc-800 hidden md:block" />

              {/* Navigation items */}
              <nav className="hidden md:flex space-x-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 ${
                        isActive
                          ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40'
                      }`}
                    >
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* User Session Info / Logout */}
            <div className="flex items-center space-x-4">
              {email && (
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Session User</span>
                  <span className="text-xs text-zinc-300 font-mono">{email}</span>
                </div>
              )}
              
              <button
                onClick={handleLogout}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium py-1.5 px-3 rounded-md border border-zinc-800 transition-colors duration-150 cursor-pointer"
              >
                Sign Out
              </button>
            </div>

          </div>
        </header>

        {/* Main Content Space */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="relative">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}