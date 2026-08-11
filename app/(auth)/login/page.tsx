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

  const [copiedId, setCopiedId] = useState<string | null>(null)

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
        router.replace('/dashboard')
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0e0e11] px-4 py-12">
        <div className="max-w-3xl w-full space-y-6">
          
          {/* Logo & Header */}
          <div className="text-center flex flex-col items-center mb-2">
            <div className="w-8 h-8 rounded-md bg-[#131316] border border-zinc-800 flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-zinc-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h4v4H4zm12 0h4v4h-4zM4 16h4v4H4zm12 0h4v4h-4zM8 6h8M8 18h8M6 8v8m12-8v8" />
              </svg>
            </div>
            <h1 className="text-base font-semibold text-zinc-100 tracking-tight">
              Workflow Console
            </h1>
            <p className="text-zinc-500 mt-1 text-xs">
              System monitoring and task orchestration dashboard.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-start justify-center">
            {/* Login Card */}
            <div className="w-full md:w-1/2 bg-[#131316] border border-zinc-800 rounded-lg p-6 space-y-5 shadow-xl">
              {/* Warning for unconfigured Nhost URL */}
              {!isConfigured && (
                <div className="p-3 bg-amber-950/15 border border-amber-900/20 text-amber-300 rounded-md text-xs space-y-1">
                  <div className="font-semibold uppercase tracking-wider text-[9px] text-amber-400">Action Required</div>
                  <p>Nhost Backend URL is not defined. Please configure local environment variables.</p>
                </div>
              )}

              {/* Error Message Box */}
              {errorMsg && (
                <div className="p-3 bg-rose-950/15 border border-rose-900/20 text-rose-300 rounded-md text-xs flex items-start space-x-2">
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
                    className="w-full px-3 py-2 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 text-zinc-100 text-xs transition-colors disabled:opacity-50 placeholder:text-zinc-700"
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
                    className="w-full px-3 py-2 bg-[#0e0e11] border border-zinc-800 rounded-md focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 text-zinc-100 text-xs transition-colors disabled:opacity-50 placeholder:text-zinc-700"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isConfigured}
                  className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold py-2 px-3 rounded-md text-xs transition-colors duration-150 disabled:opacity-50 cursor-pointer flex items-center justify-center"
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="text-center text-[10px] text-zinc-500 pt-2 border-t border-zinc-800">
                Don&apos;t have an account? <span className="text-zinc-400 font-semibold">Contact Administrator</span>
              </div>
            </div>

            {/* Demo Access Card */}
            <div className="w-full md:w-1/2 bg-[#131316] border border-zinc-800 rounded-lg p-6 space-y-4 shadow-xl">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">Demo Access</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">Sandbox accounts for reviewers</p>
              </div>

              <div className="space-y-3 pt-1">
                {[
                  { org: 'ORG A', role: 'Owner', email: 'ownerA@test.com', pass: 'Owner@123', id: 'a_owner' },
                  { org: 'ORG A', role: 'Viewer', email: 'viewerA@test.com', pass: 'Viewer@123', id: 'a_viewer' },
                  { org: 'ORG B', role: 'Owner', email: 'ownerB@test.com', pass: 'Owner@1234', id: 'b_owner' }
                ].map((account) => (
                  <div key={account.id} className="p-2.5 bg-[#0e0e11] border border-zinc-800 rounded-md space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{account.org}</span>
                      <span className="text-[9px] font-semibold text-zinc-400 uppercase tracking-wider bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">{account.role}</span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-zinc-300 select-all truncate">{account.email}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(account.email)
                            setCopiedId(`${account.id}_email`)
                            setTimeout(() => setCopiedId(null), 1500)
                          }}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                        >
                          {copiedId === `${account.id}_email` ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-zinc-400 select-all truncate">{account.pass}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(account.pass)
                            setCopiedId(`${account.id}_pass`)
                            setTimeout(() => setCopiedId(null), 1500)
                          }}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                        >
                          {copiedId === `${account.id}_pass` ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEmail(account.email)
                        setPassword(account.pass)
                      }}
                      className="w-full text-center text-[10px] text-zinc-400 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 py-1.5 rounded transition-all cursor-pointer font-medium"
                    >
                      Use Account
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </GuestGuard>
  )
}
