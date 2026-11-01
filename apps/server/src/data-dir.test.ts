import path from 'path'
import { describe, expect, it } from 'vitest'
import { dataFile, resolveDataDir } from './data-dir'

describe('resolveDataDir', () => {
  it('defaults to the data folder next to src', () => {
    expect(resolveDataDir({}).endsWith(path.join('apps', 'server', 'data'))).toBe(true)
    expect(resolveDataDir({ QHE_DATA_DIR: '   ' })).toBe(resolveDataDir({}))
  })

  it('uses QHE_DATA_DIR when set', () => {
    expect(resolveDataDir({ QHE_DATA_DIR: '/tmp/qhe-test' })).toBe(path.resolve('/tmp/qhe-test'))
  })
})

describe('dataFile', () => {
  it('puts a file inside the data folder', () => {
    expect(dataFile('x.json', { QHE_DATA_DIR: '/tmp/qhe-test' })).toBe(path.join(path.resolve('/tmp/qhe-test'), 'x.json'))
  })
})
