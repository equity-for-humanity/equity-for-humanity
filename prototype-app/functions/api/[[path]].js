import { createClaims, createContribution, createProfile, createUser, loadSnapshot, loginUser, updateContributionProfile, updateUserProfile, updateUserVerification } from '../_shared/cloudflare-store.js'

const sessions = new Map()

export async function onRequest(context) {
  const { request, env } = context
  try {
    if (request.method === 'OPTIONS') return json(request, env, {}, 204)
    const url = new URL(request.url)
    const path = url.pathname.replace(/^\/api/, '') || '/'

    if (request.method === 'GET' && path === '/snapshot') return json(request, env, await loadSnapshot(env))

    if (request.method === 'POST' && path === '/users') {
      requireBetaAccess(request, env)
      return json(request, env, await createUser(env, await readJson(request)), 201)
    }

    if (request.method === 'POST' && path === '/login') {
      const result = await loginUser(env, await readJson(request))
      if (result.ok && result.user?.id) result.sessionToken = createSession(result.user.id)
      return json(request, env, result, result.ok ? 200 : 401)
    }

    if (request.method === 'POST' && path === '/users/profile') {
      const body = await readJson(request)
      requireSameUser(request, body.id)
      return json(request, env, await updateUserProfile(env, body))
    }

    if (request.method === 'POST' && path === '/users/verification') {
      const body = await readJson(request)
      requireSameUser(request, body.id)
      return json(request, env, await updateUserVerification(env, body))
    }

    if (request.method === 'POST' && path === '/profiles') {
      const body = await readJson(request)
      if (body.createdByUserId) requireSameUser(request, body.createdByUserId)
      else requireSession(request)
      return json(request, env, await createProfile(env, body), 201)
    }

    if (request.method === 'POST' && path === '/profiles/update') {
      const body = await readJson(request)
      requireSameUser(request, body.userId)
      return json(request, env, await updateContributionProfile(env, body))
    }

    if (request.method === 'POST' && path === '/contributions') {
      requireSession(request)
      return json(request, env, await createContribution(env, await readJson(request)), 201)
    }

    if (request.method === 'POST' && path === '/claims') {
      const body = await readJson(request)
      requireSameUser(request, body.actorUserId)
      return json(request, env, await createClaims(env, body), 201)
    }

    return json(request, env, { error: 'Not found' }, 404)
  } catch (error) {
    const status = Number(error?.statusCode) || 400
    return json(request, env, { error: status >= 500 ? 'Internal prototype API error.' : error.message }, status >= 400 && status < 500 ? status : 500)
  }
}

function createSession(userId) {
  const token = crypto.randomUUID()
  sessions.set(token, userId)
  return token
}

function requireSession(request) {
  const token = request.headers.get('x-e4h-session-token') || ''
  const userId = sessions.get(token)
  if (!userId) throw statusError('Please log in again before changing prototype data.', 401)
  return userId
}

function requireSameUser(request, bodyUserId) {
  const sessionUserId = requireSession(request)
  if (sessionUserId !== bodyUserId) throw statusError('This session cannot change another account.', 403)
  return sessionUserId
}

function requireBetaAccess(request, env) {
  const requiredCode = String(env.E4H_BETA_ACCESS_CODE || '').trim()
  if (!requiredCode) return
  const submittedCode = String(request.headers.get('x-e4h-beta-code') || '').trim()
  if (submittedCode !== requiredCode) throw statusError('Private beta access code is required.', 403)
}

async function readJson(request) {
  const type = request.headers.get('content-type') || ''
  if (!type.includes('application/json')) throw statusError('Request body must be application/json.', 415)
  const text = await request.text()
  if (text.length > 100000) throw statusError('Request body is too large.', 413)
  try { return text ? JSON.parse(text) : {} } catch { throw statusError('Request body must be valid JSON.', 400) }
}

function json(request, env, body, status = 200) {
  const origin = request.headers.get('origin') || ''
  const allowedOrigins = String(env.E4H_ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean)
  const headers = new Headers({
    'content-type': 'application/json',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type,x-e4h-session-token,x-e4h-beta-code',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'cache-control': 'no-store',
  })
  if (origin && allowedOrigins.includes(origin)) headers.set('access-control-allow-origin', origin)
  return new Response(status === 204 ? null : JSON.stringify(sanitize(body)), { status, headers })
}

function sanitize(body) {
  return JSON.parse(JSON.stringify(body, (key, value) => ['password', 'passwordHash'].includes(key) ? undefined : value))
}

function statusError(message, statusCode) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}
