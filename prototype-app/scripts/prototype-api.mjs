import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClaims, createContribution, createProfile, createUser, loginUser, loadSnapshot, updateContributionProfile, updateUserProfile, updateUserVerification } from './prototype-store-adapter.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultDataPath = join(__dirname, '..', 'data', 'prototype-data.json')
const dataPath = process.env.E4H_DATA_PATH || defaultDataPath
const port = Number(process.env.E4H_API_PORT || process.env.PORT || 8787)
const host = process.env.E4H_API_HOST || '127.0.0.1'
const maxBodyBytes = Number(process.env.E4H_MAX_BODY_BYTES || 100_000)
const betaAccessCode = String(process.env.E4H_BETA_ACCESS_CODE || '').trim()
const allowedOrigins = (process.env.E4H_ALLOWED_ORIGINS || 'http://127.0.0.1:5177,http://localhost:5177')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
const sessions = new Map()

function sanitizeForClient(body) {
  return JSON.parse(JSON.stringify(body, (key, value) => ['password', 'passwordHash'].includes(key) ? undefined : value))
}

function corsOrigin(request) {
  const origin = request.headers.origin
  if (!origin) return undefined
  return allowedOrigins.includes(origin) ? origin : undefined
}

function sendJson(request, response, status, body) {
  const origin = corsOrigin(request)
  const headers = {
    'content-type': 'application/json',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,x-e4h-session-token,x-e4h-beta-code',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cache-control': 'no-store',
  }
  if (origin) headers['access-control-allow-origin'] = origin
  response.writeHead(status, {
    ...headers,
  })
  response.end(status === 204 ? '' : JSON.stringify(sanitizeForClient(body)))
}

async function readJson(request) {
  const contentType = request.headers['content-type'] || ''
  if (!String(contentType).includes('application/json')) {
    const error = new Error('Request body must be application/json.')
    error.statusCode = 415
    throw error
  }
  const chunks = []
  let totalBytes = 0
  for await (const chunk of request) {
    totalBytes += chunk.length
    if (totalBytes > maxBodyBytes) {
      const error = new Error('Request body is too large.')
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }
  if (chunks.length === 0) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    const error = new Error('Request body must be valid JSON.')
    error.statusCode = 400
    throw error
  }
}

function sendError(request, response, error) {
  const status = Number(error?.statusCode) || 400
  const safeStatus = status >= 400 && status < 500 ? status : 500
  const message = safeStatus === 500 ? 'Internal prototype API error.' : error.message
  return sendJson(request, response, safeStatus, { error: message })
}

function createSession(userId) {
  const token = randomUUID()
  sessions.set(token, userId)
  return token
}

function requireSession(request) {
  const token = request.headers['x-e4h-session-token']
  const userId = typeof token === 'string' ? sessions.get(token) : undefined
  if (!userId) {
    const error = new Error('Please log in again before changing prototype data.')
    error.statusCode = 401
    throw error
  }
  return userId
}

function requireSameUser(request, bodyUserId) {
  const sessionUserId = requireSession(request)
  if (sessionUserId !== bodyUserId) {
    const error = new Error('This session cannot change another account.')
    error.statusCode = 403
    throw error
  }
  return sessionUserId
}

function requireBetaAccess(request) {
  if (!betaAccessCode) return
  const submittedCode = String(request.headers['x-e4h-beta-code'] || '').trim()
  if (submittedCode !== betaAccessCode) {
    const error = new Error('Private beta access code is required.')
    error.statusCode = 403
    throw error
  }
}

export function createPrototypeServer({ path = dataPath } = {}) {
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url || '/', 'http://localhost')
      if (request.method === 'OPTIONS') return sendJson(request, response, 204, {})

      if (request.method === 'GET' && url.pathname === '/api/snapshot') {
        return sendJson(request, response, 200, await loadSnapshot(path))
      }

      if (request.method === 'POST' && url.pathname === '/api/profiles') {
        const body = await readJson(request)
        if (body.createdByUserId) requireSameUser(request, body.createdByUserId)
        else requireSession(request)
        return sendJson(request, response, 201, await createProfile(path, body))
      }

      if (request.method === 'POST' && url.pathname === '/api/profiles/update') {
        const body = await readJson(request)
        requireSameUser(request, body.userId)
        return sendJson(request, response, 200, await updateContributionProfile(path, body))
      }

      if (request.method === 'POST' && url.pathname === '/api/users') {
        requireBetaAccess(request)
        const body = await readJson(request)
        return sendJson(request, response, 201, await createUser(path, body))
      }

      if (request.method === 'POST' && url.pathname === '/api/login') {
        const body = await readJson(request)
        const result = await loginUser(path, body)
        if (result.ok && result.user?.id) result.sessionToken = createSession(result.user.id)
        return sendJson(request, response, result.ok ? 200 : 401, result)
      }

      if (request.method === 'POST' && url.pathname === '/api/users/profile') {
        const body = await readJson(request)
        requireSameUser(request, body.id)
        return sendJson(request, response, 200, await updateUserProfile(path, body))
      }

      if (request.method === 'POST' && url.pathname === '/api/users/verification') {
        const body = await readJson(request)
        requireSameUser(request, body.id)
        return sendJson(request, response, 200, await updateUserVerification(path, body))
      }

      if (request.method === 'POST' && url.pathname === '/api/contributions') {
        const body = await readJson(request)
        requireSession(request)
        return sendJson(request, response, 201, await createContribution(path, body))
      }

      if (request.method === 'POST' && url.pathname === '/api/claims') {
        const body = await readJson(request)
        requireSameUser(request, body.actorUserId)
        return sendJson(request, response, 201, await createClaims(path, body))
      }

      return sendJson(request, response, 404, { error: 'Not found' })
    } catch (error) {
      return sendError(request, response, error)
    }
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createPrototypeServer()
  server.listen(port, host, () => {
    console.log(`E4H prototype API listening on http://${host}:${port}`)
    console.log(`Data file: ${dataPath}`)
  })
}
