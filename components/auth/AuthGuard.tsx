'use client'

import { useAuthenticationStatus } from '@nhost/react'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode, useRef } from 'react'
import nhostClient from '@/lib/nhost/client'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, isError } = useAuthenticationStatus()
  const router = useRouter()
  const handledAuthErrorRef = useRef(false)

  useEffect(() => {
    if (!isLoading && isError && !handledAuthErrorRef.current) {
      handledAuthErrorRef.current = true
      void nhostClient.auth.signOut()
      router.push('/login')
      return
    }

    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, isError, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Redirecting in useEffect
  }

  return <>{children}</>
}

export function GuestGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, isError } = useAuthenticationStatus()
  const router = useRouter()
  const handledAuthErrorRef = useRef(false)

  useEffect(() => {
    if (!isLoading && isError && !handledAuthErrorRef.current) {
      handledAuthErrorRef.current = true
      void nhostClient.auth.signOut()
      return
    }

    if (!isLoading && isAuthenticated) {
      router.push('/workflows')
    }
  }, [isLoading, isAuthenticated, isError, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (isAuthenticated) {
    return null // Redirecting in useEffect
  }

  return <>{children}</>
}