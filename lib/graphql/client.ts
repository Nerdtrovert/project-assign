import { createClient, cacheExchange, fetchExchange } from 'urql'
import nhostClient, { graphqlUrl } from '@/lib/nhost/client'

// Create urql client with Nhost resolved endpoint
export const gqlClient = createClient({
  url: graphqlUrl,
  exchanges: [cacheExchange, fetchExchange],
  preferGetMethod: false,
  fetchOptions: () => {
    const token = nhostClient.auth.getAccessToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return { headers }
  },
})

export default gqlClient
