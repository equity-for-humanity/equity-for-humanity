import { describe, expect, it } from 'vitest'
import {
  createContribution,
  createSession,
  createUser,
  loadSnapshot,
  loginUser,
  mutateSnapshot,
  resolveSession,
  saveSnapshot,
} from '../functions/_shared/cloudflare-store.js'

function createMemoryD1() {
  const state = new Map()
  const sessions = new Map()
  let schemaReady = false

  function normalizeSql(sql) {
    return String(sql).replace(/\s+/g, ' ').trim().toLowerCase()
  }

  function prepare(sql) {
    const normalized = normalizeSql(sql)
    const binds = []
    const statement = {
      bind(...args) {
        binds.push(...args)
        return statement
      },
      async first() {
        if (normalized.startsWith('select snapshot, revision from prototype_state')) {
          const row = state.get(binds[0])
          return row ? { snapshot: row.snapshot, revision: row.revision } : null
        }
        if (normalized.startsWith('select user_id as userid, expires_at as expiresat from prototype_sessions')) {
          const row = sessions.get(binds[0])
          return row ? { userId: row.userId, expiresAt: row.expiresAt } : null
        }
        return null
      },
      async run() {
        if (normalized.startsWith('create table if not exists')) {
          schemaReady = true
          return { success: true, meta: { changes: 0 } }
        }
        if (normalized.startsWith('alter table prototype_state add column revision')) {
          if (!schemaReady) throw new Error('no such table')
          return { success: true, meta: { changes: 0 } }
        }
        if (normalized.startsWith('insert into prototype_state') && normalized.includes('on conflict(key) do nothing')) {
          const [key, snapshot] = binds
          if (state.has(key)) return { success: true, meta: { changes: 0 } }
          state.set(key, { snapshot, revision: 0 })
          return { success: true, meta: { changes: 1 } }
        }
        if (normalized.startsWith('update prototype_state set snapshot')) {
          const [snapshot, key, expectedRevision] = binds
          const row = state.get(key)
          if (!row || Number(row.revision) !== Number(expectedRevision)) {
            return { success: true, meta: { changes: 0 } }
          }
          row.snapshot = snapshot
          row.revision = Number(row.revision) + 1
          return { success: true, meta: { changes: 1 } }
        }
        if (normalized.startsWith('insert into prototype_sessions')) {
          const [token, userId, expiresAt] = binds
          sessions.set(token, { userId, expiresAt })
          return { success: true, meta: { changes: 1 } }
        }
        if (normalized.startsWith('delete from prototype_sessions')) {
          const existed = sessions.delete(binds[0])
          return { success: true, meta: { changes: existed ? 1 : 0 } }
        }
        return { success: true, meta: { changes: 0 } }
      },
    }
    return statement
  }

  return {
    DB: { prepare },
    _state: state,
    _sessions: sessions,
  }
}

describe('cloudflare D1 store durability helpers', () => {
  it('seeds once and login still accepts demo password Test123#', async () => {
    const env = createMemoryD1()
    const snapshot = await loadSnapshot(env)
    expect(snapshot.users.length).toBeGreaterThan(100)
    expect(snapshot.users.some((user) => user.password === 'Test123#')).toBe(true)

    const login = await loginUser(env, { username: 'Mira North', password: 'Test123#' })
    expect(login.ok).toBe(true)
    expect(login.user.id).toBe('user-david-brown')
  })

  it('persists sessions in D1 so isolate restarts keep auth', async () => {
    const env = createMemoryD1()
    await loadSnapshot(env)
    const token = await createSession(env, 'user-david-brown')
    expect(token).toEqual(expect.any(String))
    expect(env._sessions.has(token)).toBe(true)
    await expect(resolveSession(env, token)).resolves.toBe('user-david-brown')
    await expect(resolveSession(env, 'missing-token')).resolves.toBeNull()
  })

  it('rejects expired sessions and deletes them', async () => {
    const env = createMemoryD1()
    await loadSnapshot(env)
    const token = await createSession(env, 'user-david-brown')
    env._sessions.get(token).expiresAt = new Date(Date.now() - 1000).toISOString()
    await expect(resolveSession(env, token)).resolves.toBeNull()
    expect(env._sessions.has(token)).toBe(false)
  })

  it('uses compare-and-swap so a stale writer cannot clobber a newer snapshot', async () => {
    const env = createMemoryD1()
    const winner = await loadSnapshot(env)
    const stale = await loadSnapshot(env)

    winner.users.push({ id: 'user-cas-winner', username: 'Cas Winner', password: 'Test123#', country: 'Canada', ageGroup: '36–40', connector: '', profileId: 'profile-cas-winner' })
    await saveSnapshot(env, winner)

    stale.users.push({ id: 'user-cas-loser', username: 'Cas Loser', password: 'Test123#', country: 'Canada', ageGroup: '36–40', connector: '', profileId: 'profile-cas-loser' })
    await expect(saveSnapshot(env, stale)).rejects.toMatchObject({ code: 'SNAPSHOT_CONFLICT' })

    const reloaded = await loadSnapshot(env)
    expect(reloaded.users.some((user) => user.id === 'user-cas-winner')).toBe(true)
    expect(reloaded.users.some((user) => user.id === 'user-cas-loser')).toBe(false)
  })

  it('retries mutateSnapshot after a concurrent revision bump', async () => {
    const env = createMemoryD1()
    await loadSnapshot(env)
    let attempts = 0
    const result = await mutateSnapshot(env, async (snapshot) => {
      attempts += 1
      if (attempts === 1) {
        const competing = await loadSnapshot(env)
        competing.funds = { ...competing.funds, averageGrowth: 0.11 }
        await saveSnapshot(env, competing)
      }
      snapshot.funds = { ...snapshot.funds, recycleRate: 0.33 }
      return { ok: true, attempts }
    })
    expect(result).toEqual({ ok: true, attempts: 2 })
    const snapshot = await loadSnapshot(env)
    expect(snapshot.funds.recycleRate).toBe(0.33)
    expect(snapshot.funds.averageGrowth).toBe(0.11)
  })

  it('creates users through CAS-backed mutateSnapshot without dropping demo seed logins', async () => {
    const env = createMemoryD1()
    const created = await createUser(env, {
      username: 'Nova Quill',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      country: 'Canada',
      ageGroup: '26–30',
    })
    expect(created.username).toBe('Nova Quill')
    const loginSeed = await loginUser(env, { username: 'Mira North', password: 'Test123#' })
    expect(loginSeed.ok).toBe(true)
    const loginNew = await loginUser(env, { username: 'Nova Quill', password: 'Test123#' })
    expect(loginNew.ok).toBe(true)
  })

  it('records contributions through the durable mutation path', async () => {
    const env = createMemoryD1()
    const snapshot = await loadSnapshot(env)
    const profileId = snapshot.profiles[0].id
    const contribution = await createContribution(env, {
      profileId,
      recognitionName: 'Nova Quill',
      amount: 12,
      allocationMode: 'humanity',
      paymentMethod: 'Prototype payment',
      contributorUserId: 'user-david-brown',
      contributedByName: 'Mira North',
      country: 'Canada',
      ageGroup: '36–50',
    })
    expect(contribution.amount).toBe(12)
    const reloaded = await loadSnapshot(env)
    expect(reloaded.contributions.some((item) => item.id === contribution.id)).toBe(true)
  })
})
