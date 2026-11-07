import fs from 'node:fs'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

export const TEST_HOST_SECRET = 'integration-test-secret'

export interface TestServer {
  url: string
  hostSecret: string
  close(): Promise<void>
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = net.createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address() as net.AddressInfo
      probe.close(() => resolve(port))
    })
  })
}

/**
 * Starts the real server inside the test process: real sockets, real game logic,
 * a throwaway data folder and SQLite file, and no Postgres (so table snapshots stay off).
 * One server per test file: the server is a module, and each file gets its own copy.
 */
export async function startTestServer(): Promise<TestServer> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qhe-integration-'))
  const port = await freePort()
  Object.assign(process.env, {
    PORT: String(port),
    HOST: '127.0.0.1',
    QHE_DATA_DIR: dir,
    VENUE_DATABASE_PATH: path.join(dir, 'venues.sqlite'),
    HOST_SECRET: TEST_HOST_SECRET,
  })
  delete process.env.DATABASE_URL
  delete process.env.RAILWAY_ENVIRONMENT
  delete process.env.RAILWAY_PROJECT_ID

  const entry = await import('../index')
  const { io } = await entry.serverReady
  return {
    url: `http://127.0.0.1:${port}`,
    hostSecret: TEST_HOST_SECRET,
    close: async () => {
      await new Promise<void>((resolve) => void io.close(() => resolve()))
      fs.rmSync(dir, { recursive: true, force: true })
    },
  }
}
