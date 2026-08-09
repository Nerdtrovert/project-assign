'use client'

import { NhostProvider } from '@nhost/react'
import nhostClient from '@/lib/nhost/client'
import { ReactNode } from 'react'
import { Provider as UrqlProvider } from 'urql'
import { gqlClient } from '@/lib/graphql/client'

export function AppNhostProvider({ children }: { children: ReactNode }) {
  return (
    <NhostProvider nhost={nhostClient}>
      <UrqlProvider value={gqlClient}>
        {children}
      </UrqlProvider>
    </NhostProvider>
  )
}