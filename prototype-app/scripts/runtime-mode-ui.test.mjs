import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')

describe('single canonical interactive app runtime', () => {
  it('loads localhost by default and same-origin API in private beta', () => {
    expect(appSource).toContain("const PRIVATE_BETA = import.meta.env.VITE_E4H_PRIVATE_BETA === 'true'")
    expect(appSource).toContain("const API_BASE = import.meta.env.VITE_E4H_API_BASE || (PRIVATE_BETA ? '' : 'http://127.0.0.1:8787')")
    const refreshStart = appSource.indexOf('const refreshSnapshot = useCallback(async () => {')
    const fetchIndex = appSource.indexOf('fetch(`${API_BASE}/api/snapshot`)', refreshStart)
    const refreshSource = appSource.slice(refreshStart, fetchIndex)

    expect(refreshSource).not.toContain('return null')
    expect(appSource).not.toContain("from './runtimeMode'")
    expect(appSource).not.toContain('alternate runtime mode')
  })

  it('always renders the login and create-account controls when logged out', () => {
    expect(appSource).toContain('<h3>Log in</h3>')
    expect(appSource).toContain('Create a new account')
    expect(appSource).not.toContain('alternate runtime mode')
  })
})
