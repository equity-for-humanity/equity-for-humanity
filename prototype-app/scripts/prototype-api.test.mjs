import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createPrototypeServer } from './prototype-api.mjs'

let tempDir
let server

async function startServer() {
  tempDir = await mkdtemp(join(tmpdir(), 'e4h-api-test-'))
  const dataPath = join(tempDir, 'prototype-data.json')
  server = createPrototypeServer({ path: dataPath })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address()
  return `http://127.0.0.1:${port}`
}

afterEach(async () => {
  if (server) await new Promise((resolve) => server.close(resolve))
  server = undefined
  if (tempDir) await rm(tempDir, { recursive: true, force: true })
  tempDir = undefined
})

describe('prototype API security guardrails', () => {
  it('does not expose stored passwords through snapshot or login responses', async () => {
    const base = await startServer()

    const snapshot = await fetch(`${base}/api/snapshot`, {
      headers: { origin: 'http://127.0.0.1:5177' },
    })
    expect(snapshot.status).toBe(200)
    expect(snapshot.headers.get('access-control-allow-origin')).toBe('http://127.0.0.1:5177')
    const snapshotBody = await snapshot.json()
    expect(snapshotBody.users[0]).toEqual(expect.objectContaining({ username: 'David Brown' }))
    expect(snapshotBody.users[0]).not.toHaveProperty('password')
    expect(JSON.stringify(snapshotBody)).not.toContain('Test123#')

    const login = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ username: 'David Brown', password: 'Test123#' }),
    })
    expect(login.status).toBe(200)
    const loginBody = await login.json()
    expect(loginBody.user).toEqual(expect.objectContaining({ username: 'David Brown' }))
    expect(loginBody.user).not.toHaveProperty('password')
    expect(JSON.stringify(loginBody)).not.toContain('Test123#')
  })

  it('rejects disallowed CORS origins and invalid JSON content types', async () => {
    const base = await startServer()

    const disallowed = await fetch(`${base}/api/snapshot`, {
      headers: { origin: 'https://attacker.example' },
    })
    expect(disallowed.status).toBe(200)
    expect(disallowed.headers.get('access-control-allow-origin')).toBeNull()

    const wrongContentType = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', origin: 'http://127.0.0.1:5177' },
      body: 'username=David',
    })
    expect(wrongContentType.status).toBe(415)
    await expect(wrongContentType.json()).resolves.toEqual({ error: 'Request body must be application/json.' })
  })
})
