'use client'

import { useAuthenticationStatus } from '@nhost/react'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode, useRef } from 'react'
import nhostClient from '@/lib/nhost/client'

export function AuthGuard({ children }: { children: ReactNode }) {
  const isConfigured = !!(process.env.NEXT_PUBLIC_NHOST_BACKEND_URL || process.env.NHOST_BACKEND_URL)
  const { isAuthenticated, isLoading, isError } = useAuthenticationStatus()
  const router = useRouter()
  const handledAuthErrorRef = useRef(false)

  useEffect(() => {
    if (!isConfigured) return

    if (!isLoading && isError && !handledAuthErrorRef.current) {
      handledAuthErrorRef.current = true
      void nhostClient.auth.signOut()
      router.push('/login')
      return
    }

    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, isError, router, isConfigured])

  if (!isConfigured) {
    // If not configured, let it render so pages can show config warnings
    return <>{children}</>
  }

  if (isLoading) {
    // Silent dark background to prevent flashing loaders during session checks
    return <div className="min-h-screen bg-[#0e0f14]" />
  }

  if (!isAuthenticated) {
    return null // Redirecting in useEffect
  }

  return <>{children}</>
}

export function GuestGuard({ children }: { children: ReactNode }) {
  const isConfigured = !!(process.env.NEXT_PUBLIC_NHOST_BACKEND_URL || process.env.NHOST_BACKEND_URL)
  const { isAuthenticated, isLoading, isError } = useAuthenticationStatus()
  const router = useRouter()
  const handledAuthErrorRef = useRef(false)

  useEffect(() => {
    if (!isConfigured) return

    if (!isLoading && isError && !handledAuthErrorRef.current) {
      handledAuthErrorRef.current = true
      void nhostClient.auth.signOut()
      return
    }

    if (!isLoading && isAuthenticated) {
      router.push('/')
    }
  }, [isLoading, isAuthenticated, isError, router, isConfigured])

  if (!isConfigured) {
    // Render the login page directly if unconfigured to display the warnings
    return <>{children}</>
  }

  if (isLoading) {
    // Silent dark background to prevent flashing loaders during session checks
    return <div className="min-h-screen bg-[#0e0f14]" />
  }

  if (isAuthenticated) {
    return null // Redirecting in useEffect
  }

  return <>{children}</>
}