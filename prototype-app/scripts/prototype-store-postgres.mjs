import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import pg from 'pg'
import * as jsonStore from './prototype-store.mjs'

const { Pool } = pg
const databaseUrl = process.env.DATABASE_URL
const stateKey = process.env.E4H_POSTGRES_STATE_KEY || 'canonical-prototype'

let pool

function getPool() {
  if (!databaseUrl) throw new Error('DATABASE_URL is required when E4H_STORE=postgres.')
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: process.env.E4H_POSTGRES_SSL === 'false' ? false : { rejectUnauthorized: false },
    })
  }
  return pool
}

async function ensureTable() {
  await getPool().query(`
    create table if not exists prototype_state (
      key text primary key,
      snapshot jsonb not null,
      updated_at timestamptz not null default now()
    )
  `)
}

export function createSeedData() {
  return jsonStore.createSeedData()
}

export async function loadSnapshot() {
  await ensureTable()
  const result = await getPool().query('select snapshot from prototype_state where key = $1', [stateKey])
  if (result.rows[0]?.snapshot) {
    const snapshot = result.rows[0].snapshot
    return jsonStore.prepareSnapshotForRead(snapshot)
  }
  const seed = createSeedData()
  await saveSnapshot(undefined, seed)
  return seed
}

export async function saveSnapshot(_unusedPath, snapshot) {
  await ensureTable()
  jsonStore.prepareSnapshotForRead(snapshot)
  snapshot.updatedAt = new Date().toISOString()
  await getPool().query(
    `insert into prototype_state (key, snapshot, updated_at)
     values ($1, $2::jsonb, now())
     on conflict (key) do update set snapshot = excluded.snapshot, updated_at = now()`,
    [stateKey, JSON.stringify(snapshot)],
  )
  return snapshot
}

async function runJsonStoreMutation(fnName, ...args) {
  const dir = await mkdtemp(join(tmpdir(), 'e4h-canonical-prototype-'))
  const dataPath = join(dir, 'prototype-data.json')
  try {
    const snapshot = await loadSnapshot()
    await writeFile(dataPath, `${JSON.stringify(snapshot, null, 2)}\n`)
    const result = await jsonStore[fnName](dataPath, ...args)
    const updatedSnapshot = JSON.parse(await readFile(dataPath, 'utf8'))
    await saveSnapshot(undefined, updatedSnapshot)
    return result
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

export const validatePassword = jsonStore.validatePassword
export const hashPassword = jsonStore.hashPassword
export const verifyPassword = jsonStore.verifyPassword
export const splitContribution = jsonStore.splitContribution

export async function createUser(_unusedPath, input) {
  return runJsonStoreMutation('createUser', input)
}

export async function requestGuardianConnection(_unusedPath, input) {
  return runJsonStoreMutation('requestGuardianConnection', input)
}

export async function respondGuardianConnection(_unusedPath, input) {
  return runJsonStoreMutation('respondGuardianConnection', input)
}

export async function removeGuardianConnection(_unusedPath, input) {
  return runJsonStoreMutation('removeGuardianConnection', input)
}

export async function loginUser(_unusedPath, input) {
  const snapshot = await loadSnapshot()
  const username = String(input.username || '').trim().toLowerCase()
  const password = String(input.password || '').trim()
  const user = snapshot.users.find((item) => item.username.toLowerCase() === username && jsonStore.verifyPassword(password, item))
  if (!user) return { ok: false, error: 'Invalid username or password.' }
  const profile = snapshot.profiles.find((item) => item.id === user.profileId || item.name === user.username)
  const contributions = snapshot.contributions.filter((item) => item.contributorUserId === user.id || item.profileId === user.profileId || item.recognitionName === user.username)
  const claims = snapshot.claims.filter((item) => item.profileId === user.profileId)
  return { ok: true, user, profile, contributions, claims }
}

export async function updateUserProfile(_unusedPath, input) {
  return runJsonStoreMutation('updateUserProfile', input)
}

export async function updateUserVerification(_unusedPath, input) {
  return runJsonStoreMutation('updateUserVerification', input)
}

export async function createProfile(_unusedPath, input) {
  return runJsonStoreMutation('createProfile', input)
}

export async function updateContributionProfile(_unusedPath, input) {
  return runJsonStoreMutation('updateContributionProfile', input)
}

export async function createContribution(_unusedPath, input) {
  return runJsonStoreMutation('createContribution', input)
}

export async function createClaims(_unusedPath, input) {
  return runJsonStoreMutation('createClaims', input)
}
