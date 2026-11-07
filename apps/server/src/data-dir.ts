import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))

/**
 * Folder for the server's settings and local database files.
 * Defaults to apps/server/data. QHE_DATA_DIR overrides it (tests use a temporary folder).
 */
export function resolveDataDir(env: NodeJS.ProcessEnv = process.env): string {
  const override = typeof env.QHE_DATA_DIR === 'string' ? env.QHE_DATA_DIR.trim() : ''
  return override ? path.resolve(override) : path.join(here, '..', 'data')
}

export function dataFile(name: string, env: NodeJS.ProcessEnv = process.env): string {
  return path.join(resolveDataDir(env), name)
}
