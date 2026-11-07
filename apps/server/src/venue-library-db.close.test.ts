import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { closeSqliteDatabase, loadVenueLibraries } from './venue-library-db'

describe('closeSqliteDatabase', () => {
  const prevPath = process.env.VENUE_DATABASE_PATH
  const prevUrl = process.env.DATABASE_URL
  let dir = ''

  afterEach(() => {
    closeSqliteDatabase()
    if (prevPath === undefined) delete process.env.VENUE_DATABASE_PATH
    else process.env.VENUE_DATABASE_PATH = prevPath
    if (prevUrl === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = prevUrl
    if (dir) fs.rmSync(dir, { recursive: true, force: true })
  })

  it('lets the test folder be deleted while the server just had the database open', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qhe-sqlite-close-'))
    delete process.env.DATABASE_URL
    process.env.VENUE_DATABASE_PATH = path.join(dir, 'venues.sqlite')
    await loadVenueLibraries()
    closeSqliteDatabase()
    fs.rmSync(dir, { recursive: true, force: true })
    dir = ''
    expect(fs.existsSync(process.env.VENUE_DATABASE_PATH)).toBe(false)
  })
})
