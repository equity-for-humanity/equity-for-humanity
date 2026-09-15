import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const launcherSource = await readFile(new URL('./dev-with-api.mjs', import.meta.url), 'utf8')

describe('local development launcher', () => {
  it('watches the local API source so new routes do not leave the Vite UI talking to stale backend code', () => {
    expect(launcherSource).toContain("run('api', process.execPath, ['--watch', 'scripts/prototype-api.mjs'])")
  })
})
