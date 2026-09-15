import { createClaims, createContribution, createProfile, createSession, createUser, loadSnapshot, loginUser, removeGuardianConnection, requestGuardianConnection, resolveSession, respondGuardianConnection, updateContributionProfile, updateUserProfile, updateUserVerification } from '../_shared/cloudflare-store.js'

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
      if (result.ok && result.user?.id) result.sessionToken = await createSession(env, result.user.id)
      return json(request, env, result, result.ok ? 200 : 401)
    }

    if (request.method === 'POST' && path === '/users/profile') {
      const body = await readJson(request)
      await requireSameUser(request, env, body.id)
      return json(request, env, await updateUserProfile(env, body))
    }

    if (request.method === 'POST' && path === '/guardian-connections/request') {
      const body = await readJson(request)
      const childUserId = await requireSession(request, env)
      return json(request, env, await requestGuardianConnection(env, { childUserId, guardianUserId: body.guardianUserId }))
    }

    if (request.method === 'POST' && path === '/guardian-connections/respond') {
      const body = await readJson(request)
      const guardianUserId = await requireSession(request, env)
      return json(request, env, await respondGuardianConnection(env, { guardianUserId, childUserId: body.childUserId, decision: body.decision }))
    }

    if (request.method === 'POST' && path === '/guardian-connections/remove') {
      const body = await readJson(request)
      const actorUserId = await requireSession(request, env)
      return json(request, env, await removeGuardianConnection(env, { actorUserId, childUserId: body.childUserId, guardianUserId: body.guardianUserId }))
    }

    if (request.method === 'POST' && path === '/users/verification') {
      const body = await readJson(request)
      const userId = await requireSession(request, env)
      return json(request, env, await updateUserVerification(env, { ...body, id: userId }))
    }

    if (request.method === 'POST' && path === '/profiles') {
      const body = await readJson(request)
      if (body.createdByUserId) await requireSameUser(request, env, body.createdByUserId)
      else await requireSession(request, env)
      return json(request, env, await createProfile(env, body), 201)
    }

    if (request.method === 'POST' && path === '/profiles/update') {
      const body = await readJson(request)
      await requireSameUser(request, env, body.userId)
      return json(request, env, await updateContributionProfile(env, body))
    }

    if (request.method === 'POST' && path === '/contributions') {
      const contributorUserId = await requireSession(request, env)
      const body = await readJson(request)
      return json(request, env, await createContribution(env, { ...body, contributorUserId }), 201)
    }

    if (request.method === 'POST' && path === '/claims') {
      const actorUserId = await requireSession(request, env)
      const body = await readJson(request)
      return json(request, env, await createClaims(env, { ...body, actorUserId }), 201)
    }

    return json(request, env, { error: 'Not found' }, 404)
  } catch (error) {
    const status = Number(error?.statusCode) || 400
    return json(request, env, { error: status >= 500 ? 'Internal prototype API error.' : error.message }, status >= 400 && status < 500 ? status : 500)
  }
}

async function requireSession(request, env) {
  const token = request.headers.get('x-e4h-session-token') || ''
  const userId = await resolveSession(env, token)
  if (!userId) throw statusError('Please log in again before changing prototype data.', 401)
  return userId
}

async function requireSameUser(request, env, bodyUserId) {
  const sessionUserId = await requireSession(request, env)
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
