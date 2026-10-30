/**
 * Local `npm run dev` shares this value between the server and the host app.
 * A deployed server never falls back to it: an unset HOST_SECRET refuses host login.
 */
export const LOCAL_DEV_HOST_SECRET = 'quizzem-local-host'

export function isDeployedServer(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'production') return true
  if (typeof env.RAILWAY_ENVIRONMENT === 'string' && env.RAILWAY_ENVIRONMENT.trim().length > 0) return true
  if (typeof env.RAILWAY_PROJECT_ID === 'string' && env.RAILWAY_PROJECT_ID.trim().length > 0) return true
  return false
}

/** Secret a host hello must match. Empty means this process is deployed and not configured. */
export function requiredHostSecret(env: NodeJS.ProcessEnv = process.env): string {
  const configured = typeof env.HOST_SECRET === 'string' ? env.HOST_SECRET.trim() : ''
  if (configured) return configured
  if (isDeployedServer(env)) return ''
  return LOCAL_DEV_HOST_SECRET
}

/** Null when the hello may continue. */
export function hostHelloFailureMessage(provided: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const required = requiredHostSecret(env)
  if (!required) return 'Host login is not configured on this server.'
  if (provided.trim() !== required) return 'Invalid host credentials.'
  return null
}
