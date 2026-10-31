/**
 * Browser origins allowed to call the server from another site.
 *
 * Off by default: every origin is allowed, as before. The allowlist applies only when
 * ENFORCE_CORS_ALLOWLIST=true AND ALLOWED_ORIGINS lists at least one origin
 * (comma-separated, for example https://quizzem.example.com,https://www.quizzem.example.com).
 * Pages served by this same server are same-origin and are not affected either way.
 */
export function resolveAllowedOrigins(env: NodeJS.ProcessEnv = process.env): '*' | string[] {
  if (env.ENFORCE_CORS_ALLOWLIST?.trim().toLowerCase() !== 'true') return '*'
  const raw = typeof env.ALLOWED_ORIGINS === 'string' ? env.ALLOWED_ORIGINS : ''
  const list = raw
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter((o) => o.length > 0)
  return list.length > 0 ? list : '*'
}
