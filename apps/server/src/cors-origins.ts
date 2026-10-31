/**
 * Browser origins allowed to call the server from another site.
 * Unset keeps today's behavior ("*"). Set ALLOWED_ORIGINS to a comma-separated list
 * (for example https://quizzem.example.com,https://www.quizzem.example.com) to restrict it.
 * Pages served by this same server are same-origin and are not affected either way.
 */
export function resolveAllowedOrigins(env: NodeJS.ProcessEnv = process.env): '*' | string[] {
  const raw = typeof env.ALLOWED_ORIGINS === 'string' ? env.ALLOWED_ORIGINS : ''
  const list = raw
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter((o) => o.length > 0)
  return list.length > 0 ? list : '*'
}
