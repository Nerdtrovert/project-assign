'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import nhostClient from '@/lib/nhost/client'
import { GuestGuard } from '@/components/auth/AuthGuard'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Nhost configuration check
  const url = process.env.NEXT_PUBLIC_NHOST_BACKEND_URL || ''
  const isConfigured = !!url

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg('Email and password are required.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await nhostClient.auth.signIn({ email, password })
      if (res.error) {
        setErrorMsg(res.error.message || 'Login failed. Please check your credentials.')
      } else {
        router.push('/workflows')
      }
    } catch (err: unknown) {
      console.error('Login error:', err)
      setErrorMsg('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <GuestGuard>
      <div className="min-h-screen flex items-center justify-center bg-[#0e0e11] px-4">
        <div className="max-w-sm w-full space-y-6">
          
          {/* Logo & Header */}
          <div className="text-center">
            <div className="inline-flex w-8 h-8 rounded-md bg-zinc-800 border border-zinc-700 items-center justify-center text-zinc-100 font-bold text-sm mb-3">
              ⚙️
            </div>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Workflow Console
            </h1>
            <p className="text-zinc-500 mt-1 text-xs">
              System monitoring and task orchestration dashboard.
            </p>
          </div>

          <div className="bg-[#16161a] border border-zinc-800 rounded-lg p-6 space-y-5">
            {/* Warning for unconfigured Nhost URL */}
            {!isConfigured && (
              <div className="p-3 bg-amber-950/20 border border-amber-800/30 text-amber-300 rounded-md text-xs space-y-1">
                <div className="font-semibold uppercase tracking-wider text-[9px] text-amber-400">Action Required</div>
                <p>Nhost Backend URL is not defined. Please configure local environment variables.</p>
              </div>
            )}

            {/* Error Message Box */}
            {errorMsg && (
              <div className="p-3 bg-rose-950/20 border border-rose-800/30 text-rose-300 rounded-md text-xs flex items-start space-x-2">
                <span className="text-rose-400 font-bold mt-0.5">⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || !isConfigured}
                  className="w-full px-3 py-2 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors disabled:opacity-50 placeholder:text-zinc-700"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400" htmlFor="password">
                    Password
                  </label>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || !isConfigured}
                  className="w-full px-3 py-2 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 text-zinc-100 text-xs transition-colors disabled:opacity-50 placeholder:text-zinc-700"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !isConfigured}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-2 px-3 rounded-md text-xs transition-colors duration-150 disabled:opacity-50 cursor-pointer flex items-center justify-center"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="text-center text-[10px] text-zinc-500 pt-2 border-t border-zinc-800">
              Don&apos;t have an account? <span className="text-zinc-400 font-semibold">Contact Administrator</span>
            </div>
          </div>

        </div>
      </div>
    </GuestGuard>
  )
}