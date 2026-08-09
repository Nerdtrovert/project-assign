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
    { name: 'Dashboard', href: '/' },
    { name: 'Workflows', href: '/workflows' },
    { name: 'New Workflow', href: '/workflows/new' },
  ]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
            
            {/* Logo */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform duration-200">
                  AI
                </div>
                <span className="font-extrabold tracking-tight text-white group-hover:text-violet-400 transition-colors duration-200">
                  Workflow Builder
                </span>
              </Link>

              {/* Navigation items */}
              <nav className="hidden md:flex space-x-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-white/10 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
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
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">User session</span>
                  <span className="text-xs text-slate-300 font-semibold">{email}</span>
                </div>
              )}
              
              <button
                onClick={handleLogout}
                className="bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 hover:text-white text-xs font-semibold py-2 px-4 rounded-lg border border-white/5 transition-all duration-150 ease-in-out cursor-pointer active:scale-95 transform"
              >
                Sign Out
              </button>
            </div>

          </div>
        </header>

        {/* Main Content Space */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
          {/* Subtle background blur blobs */}
          <div className="absolute top-1/4 left-1/3 w-96 h-96 rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-600/5 blur-[120px] pointer-events-none" />
          
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}