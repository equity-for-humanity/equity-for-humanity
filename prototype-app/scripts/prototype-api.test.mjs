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
    expect(snapshotBody.users[0]).toEqual(expect.objectContaining({ username: 'Mira North' }))
    expect(snapshotBody.users[0]).not.toHaveProperty('password')
    expect(JSON.stringify(snapshotBody)).not.toContain('Test123#')

    const login = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ username: 'Mira North', password: 'Test123#' }),
    })
    expect(login.status).toBe(200)
    const loginBody = await login.json()
    expect(loginBody.user).toEqual(expect.objectContaining({ username: 'Mira North' }))
    expect(loginBody.sessionToken).toEqual(expect.any(String))
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

  it('requires a valid login session before changing account-owned data', async () => {
    const base = await startServer()

    const unauthenticated = await fetch(`${base}/api/users/profile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ id: 'user-david-brown', username: 'Mallory', country: 'Canada', ageGroup: '36–50' }),
    })
    expect(unauthenticated.status).toBe(401)

    const login = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ username: 'Mira North', password: 'Test123#' }),
    })
    const loginBody = await login.json()

    const forbidden = await fetch(`${base}/api/users/profile`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-e4h-session-token': loginBody.sessionToken, origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ id: 'user-anisa-brown', username: 'Mallory', country: 'Canada', ageGroup: '11–15' }),
    })
    expect(forbidden.status).toBe(403)
  })

  it('requires a guardian session to explicitly accept a child request', async () => {
    const base = await startServer()
    const created = await fetch(`${base}/api/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ username: 'API Pending Child', password: 'Test123#', repeatPassword: 'Test123#', country: 'Canada', ageGroup: '11–15', connector: '' }),
    })
    const child = await created.json()
    const childLogin = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ username: 'API Pending Child', password: 'Test123#' }),
    })
    const childSession = await childLogin.json()
    const guardianLogin = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ username: 'Mira North', password: 'Test123#' }),
    })
    const guardianSession = await guardianLogin.json()

    const snapshot = await fetch(`${base}/api/snapshot`, {
      headers: { origin: 'http://127.0.0.1:5177' },
    })
    const snapshotBody = await snapshot.json()
    const acceptedChild = snapshotBody.users.find((user) => user.username === 'Tala North')
    expect(acceptedChild).toBeTruthy()

    const circularRequest = await fetch(`${base}/api/guardian-connections/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-e4h-session-token': guardianSession.sessionToken, origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ guardianUserId: acceptedChild.id }),
    })
    expect(circularRequest.status).toBe(400)
    await expect(circularRequest.json()).resolves.toEqual({ error: expect.stringContaining('accepted child / ward') })

    const unauthenticated = await fetch(`${base}/api/guardian-connections/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ guardianUserId: guardianSession.user.id }),
    })
    expect(unauthenticated.status).toBe(401)

    const requested = await fetch(`${base}/api/guardian-connections/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-e4h-session-token': childSession.sessionToken, origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ guardianUserId: guardianSession.user.id }),
    })
    expect(requested.status).toBe(200)
    await expect(requested.json()).resolves.toEqual(expect.objectContaining({ ok: true, child: expect.objectContaining({ id: child.id, guardianUserId: guardianSession.user.id, guardianStatus: 'pending' }) }))

    const otherLogin = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ username: 'Ivo Cedar', password: 'Test123#' }),
    })
    const otherSession = await otherLogin.json()
    const forbiddenResponse = await fetch(`${base}/api/guardian-connections/respond`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-e4h-session-token': otherSession.sessionToken, origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ childUserId: child.id, decision: 'accepted' }),
    })
    expect(forbiddenResponse.status).toBe(403)

    const accepted = await fetch(`${base}/api/guardian-connections/respond`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-e4h-session-token': guardianSession.sessionToken, origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ childUserId: child.id, decision: 'accepted' }),
    })
    expect(accepted.status).toBe(200)
    await expect(accepted.json()).resolves.toEqual(expect.objectContaining({ ok: true, child: expect.objectContaining({ id: child.id, guardianStatus: 'accepted' }) }))

    const secondRequest = await fetch(`${base}/api/guardian-connections/request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-e4h-session-token': childSession.sessionToken, origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ guardianUserId: otherSession.user.id }),
    })
    expect(secondRequest.status).toBe(200)

    const cancelledPendingRequest = await fetch(`${base}/api/guardian-connections/remove`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-e4h-session-token': childSession.sessionToken, origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ childUserId: child.id, guardianUserId: otherSession.user.id }),
    })
    expect(cancelledPendingRequest.status).toBe(200)
    await expect(cancelledPendingRequest.json()).resolves.toEqual(expect.objectContaining({
      ok: true,
      child: expect.objectContaining({ guardianConnections: [expect.objectContaining({ guardianUserId: guardianSession.user.id, guardianStatus: 'accepted' })] }),
    }))

    const removed = await fetch(`${base}/api/guardian-connections/remove`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-e4h-session-token': guardianSession.sessionToken, origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ childUserId: child.id }),
    })
    expect(removed.status).toBe(200)
    await expect(removed.json()).resolves.toEqual(expect.objectContaining({
      ok: true,
      child: expect.objectContaining({ id: child.id, guardianUserId: '', guardianUsername: '', guardianStatus: '' }),
    }))
  })

  it('derives a claim actor from the logged-in session rather than the request body', async () => {
    const base = await startServer()
    const login = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ username: 'Mira North', password: 'Test123#' }),
    })
    const session = await login.json()

    const saved = await fetch(`${base}/api/claims`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-e4h-session-token': session.sessionToken, origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ actorUserId: 'user-anisa-brown', action: 'claimed', amount: 4, targetUserIds: [session.user.id], deliveryMethod: 'E-transfer', denomination: 'Canadian dollars' }),
    })

    expect(saved.status).toBe(201)
    await expect(saved.json()).resolves.toEqual(expect.objectContaining({ ok: true, claims: [expect.objectContaining({ actorUserId: session.user.id, userId: session.user.id, amount: 4 })] }))
  })

  it('derives a contribution contributor from the logged-in session rather than the request body', async () => {
    const base = await startServer()
    const login = await fetch(`${base}/api/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ username: 'Mira North', password: 'Test123#' }),
    })
    const session = await login.json()

    const saved = await fetch(`${base}/api/contributions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-e4h-session-token': session.sessionToken, origin: 'http://127.0.0.1:5177' },
      body: JSON.stringify({ profileId: 'seed-profile-canada', recognitionName: 'Tala North', amount: 4, allocationMode: 'humanity', paymentMethod: 'Credit card', contributorUserId: 'user-anisa-brown', country: 'Canada', ageGroup: '11–15' }),
    })

    expect(saved.status).toBe(201)
    await expect(saved.json()).resolves.toEqual(expect.objectContaining({ contributorUserId: session.user.id, recognitionName: 'Tala North', amount: 4 }))
  })
})
