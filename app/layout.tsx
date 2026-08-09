import './globals.css'
import { type ReactNode } from 'react'
import { AppNhostProvider } from '@/components/auth/NhostProvider'

export const metadata = {
  title: 'AI Agent Workflow Builder',
  description: 'Build and manage AI agent workflows',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppNhostProvider>
          {children}
        </AppNhostProvider>
      </body>
    </html>
  )
}
