import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const source = await readFile(new URL('./prototype-store-postgres.mjs', import.meta.url), 'utf8')

describe('Postgres store parity', () => {
  it('uses the JSON store read preparer without persisting a read-only migration', () => {
    expect(source).toContain('jsonStore.prepareSnapshotForRead(snapshot)')
    expect(source).not.toContain('normalizeGuardianConnections(snapshot)) await saveSnapshot')
  })
})
