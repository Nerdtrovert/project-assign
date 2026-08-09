'use client'

import { NhostProvider } from '@nhost/react'
import nhostClient from '@/lib/nhost/client'
import { ReactNode } from 'react'

export function AppNhostProvider({ children }: { children: ReactNode }) {
  return <NhostProvider nhost={nhostClient}>{children}</NhostProvider>
}