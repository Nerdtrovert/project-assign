import { createClient, cacheExchange, fetchExchange } from 'urql'

const backendUrl = process.env.NEXT_PUBLIC_NHOST_BACKEND_URL || process.env.NHOST_BACKEND_URL || ''
const cleanBackendUrl = backendUrl.replace(/\/+$/, '')

// Create urql client with Nhost endpoint
export const gqlClient = createClient({
  url: `${cleanBackendUrl}/v1/graphql`,
  exchanges: [cacheExchange, fetchExchange],
})

export default gqlClient
