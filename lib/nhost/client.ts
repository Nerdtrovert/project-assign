import { NhostClient } from '@nhost/react'

const backendUrl = process.env.NEXT_PUBLIC_NHOST_BACKEND_URL || process.env.NHOST_BACKEND_URL || ''
const region = process.env.NEXT_PUBLIC_NHOST_REGION || process.env.NHOST_REGION || 'ap-south-1'

// If backendUrl is of the form https://<subdomain>.nhost.run or nhost.app,
// we resolve the service subdomains (e.g. <subdomain>.auth.<region>.nhost.run)
// required by Nhost v2 backend architecture.
let authUrl = ''
let storageUrl = ''
let graphqlUrl = ''
let functionsUrl = ''
let subdomain = ''

if (backendUrl) {
  const cleanUrl = backendUrl.replace(/\/+$/, '')
  const match = cleanUrl.match(/https?:\/\/([^.]+)\.nhost\.(run|app)/)
  if (match) {
    subdomain = match[1]
    const tld = match[2]
    authUrl = `https://${subdomain}.auth.${region}.nhost.${tld}/v1`
    graphqlUrl = `https://${subdomain}.graphql.${region}.nhost.${tld}/v1`
    storageUrl = `https://${subdomain}.storage.${region}.nhost.${tld}/v1`
    functionsUrl = `https://${subdomain}.functions.${region}.nhost.${tld}/v1`
  } else {
    // Local development or custom domains
    authUrl = `${cleanUrl}/auth`
    graphqlUrl = `${cleanUrl}/v1/graphql`
    storageUrl = `${cleanUrl}/storage`
    functionsUrl = `${cleanUrl}/functions`
  }
}

interface ExtendedAuth {
  signInEmailPassword(body: { email: string; password: string }): Promise<{ status: number; body: any }>;
}

type ExtendedNhostClient = Omit<NhostClient, 'auth'> & {
  auth: NhostClient['auth'] & ExtendedAuth;
}

// Pass subdomain and region to ensure internal auth broadcast channel and token management are configured correctly
const baseClient = new NhostClient({
  subdomain,
  region,
  authUrl,
  storageUrl,
  graphqlUrl,
  functionsUrl,
})

const clientInstance = baseClient as ExtendedNhostClient

;(clientInstance.auth as any).signInEmailPassword = async (body: { email: string; password: string }) => {
  const res = await baseClient.auth.signIn({ email: body.email, password: body.password })
  if (res.error) {
    const err = new Error(res.error.message) as any
    err.body = res.error
    throw err
  }
  return { status: 200, body: res }
}

export const nhostClient = clientInstance
export { authUrl, storageUrl, graphqlUrl, functionsUrl, subdomain, region }
export default nhostClient