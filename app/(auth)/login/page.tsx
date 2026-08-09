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
      <div className="min-h-screen flex items-center justify-center bg-radial from-slate-900 via-slate-950 to-black px-4 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full z-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-200 to-blue-400 bg-clip-text text-transparent">
              AI Agent Workflow Builder
            </h1>
            <p className="text-gray-400 mt-2 text-sm">
              Design, orchestrate, and deploy autonomous agent workflows
            </p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 transition-all duration-300">

            {/* Warning for unconfigured Nhost URL */}
            {!isConfigured && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-xs space-y-1">
                <div className="font-bold uppercase tracking-wider text-[10px]">Action Required</div>
                <p>Nhost Backend URL is not defined. Please configure the environment variable in your local configuration.</p>
              </div>
            )}

            {/* Error Message Box */}
            {errorMsg && (
              <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-sm flex items-start space-x-2 animate-shake">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{errorMsg.replace(/'/g, "&apos;")}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || !isConfigured}
                  className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-white transition-all duration-200 disabled:opacity-50 placeholder:text-gray-600"
                  placeholder="name@company.com"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400" htmlFor="password">
                    Password
                  </label>
                  <a href="#" className="text-xs text-violet-400 hover:underline">
                    Forgot?
                  </a>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || !isConfigured}
                  className="w-full px-4 py-3 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-white transition-all duration-200 disabled:opacity-50 placeholder:text-gray-600"
                  placeholder="&apos;&apos;&apos;&apos;&apos;&apos;&apos;&apos;"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || !isConfigured}
                className="w-full mt-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl transition duration-200 ease-in-out disabled:opacity-50 cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-[0.98] transform"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Signing in...</span>
                  </span>
                ) : (
                  'Login'
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-xs text-gray-500">
              Don&apos;t have an account?{' '}
              <a href="#" className="text-violet-400 font-semibold hover:underline">
                Contact Administrator
              </a>
            </div>
          </div>
        </div>
      </div>
    </GuestGuard>
  )
}