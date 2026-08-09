import { NhostClient } from '@nhost/react'

const backendUrl = process.env.NEXT_PUBLIC_NHOST_BACKEND_URL || process.env.NHOST_BACKEND_URL || ''

// Ensure no trailing slash
const cleanBackendUrl = backendUrl.replace(/\/+$/, '')

export const nhostClient = new NhostClient({
  authUrl: `${cleanBackendUrl}/auth`,
  storageUrl: `${cleanBackendUrl}/storage`,
  graphqlUrl: `${cleanBackendUrl}/v1/graphql`,
  functionsUrl: `${cleanBackendUrl}/functions`,
})

export default nhostClient