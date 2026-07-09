const STATE_KEY = 'private-beta'

export function createSeedData() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    users: [
      user('user-david-brown', 'David Brown', 'Canada', '36–50', 'Phillip Chen', 'seed-profile-canada', { verifiedHumanAt: '2026-06-30T00:00:00.000Z', verificationMethod: 'government-id-liveness', verificationStatus: '16_plus' }),
      user('user-anisa-brown', 'Anisa Brown', 'Canada', '11–15', 'David Brown', 'seed-profile-child', { guardianUsername: 'David Brown', verifiedHumanAt: '2026-06-30T00:00:00.000Z', verificationMethod: 'government-id-liveness', verificationStatus: '0_15' }),
      user('user-phillip-chen', 'Phillip Chen', 'Canada', '26–30', 'Amina Okafor', 'user-profile-phillip'),
      user('user-amina-okafor', 'Amina Okafor', 'Nigeria', '21–25', 'Priya Shah', 'user-profile-amina'),
      user('user-priya-shah', 'Priya Shah', 'India', '26–30', 'David Brown', 'user-profile-priya'),
      user('user-lucas-silva', 'Lucas Silva', 'Brazil', '21–25', 'Leila Haddad', 'user-profile-lucas'),
      user('user-maryam-hassan', 'Maryam Hassan', 'Egypt', '36–40', 'Amina Okafor', 'user-profile-maryam'),
      user('user-elon-musk', 'Elon Musk', 'United States', '51–55', 'Sam Altman', 'user-profile-elon'),
      user('user-greta-thunberg', 'Greta Thunberg', 'Sweden', '21–25', 'Malala Yousafzai', 'user-profile-greta'),
      user('user-ai-agent', 'AI agent', 'Digital', 'AI agent', 'David Brown', 'user-profile-ai-agent'),
    ],
    profiles: [
      profile('seed-profile-canada', 'David Brown', 'Individual', 'Canada', '36–50', 'Individual participant profile for prototype testing.', 'Phillip Chen'),
      profile('seed-profile-child', 'Guardian-managed child profile', 'Child under 16', 'Canada', '11–15', 'Sample child participant profile managed by a parent or guardian until age 16.', 'David Brown'),
      profile('seed-profile-faith', 'St. Mark’s Community Fund', 'Faith group', 'Canada', '51+', 'Ottawa faith community profile for members who want their recognition grouped together.', 'Amina Okafor'),
      profile('seed-profile-memory', 'Mary Brown Memorial Grove', 'In memory of', 'United Kingdom', '51+', 'A family memorial profile for contributions made in Mary’s memory.', 'Leila Haddad'),
      profile('seed-profile-org-ai-lab', 'Open Horizon AI Lab', 'Organization', 'United States', '36–50', 'Prototype organization profile for AI workers contributing toward shared ownership.', 'Sam Altman'),
      profile('user-profile-phillip', 'Phillip Chen', 'Individual', 'Canada', '26–30', 'Connector profile for prototype login and contribution history.', 'Amina Okafor'),
      profile('user-profile-amina', 'Amina Okafor', 'Individual', 'Nigeria', '21–25', 'Connector profile with sample contribution and claim history.', 'Priya Shah'),
      profile('user-profile-priya', 'Priya Shah', 'Individual', 'India', '26–30', 'Participant and connector profile for prototype search.', 'David Brown'),
      profile('user-profile-ai-agent', 'AI agent', 'Individual', 'Digital', 'AI agent', 'Prototype non-human agent account category for testing.', 'David Brown'),
    ],
    contributions: [
      seedContribution('seed-contribution-1', 'seed-profile-canada', 'David Brown', 1200, 'humanity', 'Credit card via Stripe', 0, 'Canada', '36–50', 'user-david-brown'),
      seedContribution('seed-contribution-2', 'seed-profile-faith', 'St. Mark’s Community Fund', 10000, 'hybrid99', 'PayPal', 100, 'Canada', '51+'),
      seedContribution('seed-contribution-3', 'seed-profile-memory', 'Mary Brown Memorial Grove', 5000, 'humanity', 'Bank transfer', 0, 'United Kingdom', '51+'),
      seedContribution('seed-contribution-4', 'seed-profile-child', 'Anisa Brown', 250, 'humanity', 'Credit card via Stripe', 0, 'Canada', '11–15', 'user-anisa-brown'),
    ],
    claims: [
      { id: 'seed-claim-1', actorUserId: 'user-david-brown', userId: 'user-david-brown', profileId: 'seed-profile-canada', targetName: 'David Brown', action: 'recycled', amount: 80, country: 'Canada', ageGroup: '36–50', createdAt: '2026-06-05T00:00:00.000Z' },
      { id: 'seed-claim-2', actorUserId: 'user-david-brown', userId: 'user-david-brown', profileId: 'seed-profile-canada', targetName: 'David Brown', action: 'claimed', amount: 120, country: 'Canada', ageGroup: '36–50', createdAt: '2026-06-06T00:00:00.000Z' },
    ],
    countries: ['Canada','United States','India','Nigeria','Brazil','United Kingdom','Sweden','Egypt','Digital'].map((country, index) => ({ country, people: 74000 + index * 12000, contributions: 11800000 + index * 3200000, connectors: 9000 + index * 700, claimants: 16000 + index * 1800 })),
    ageGroups: ['AI agent','0–5','6–10','11–15','16–20','21–25','26–30','31–35','36–40','41–45','46–50','51–55','56–60','61–65','66–70','71–75','76–80','81–85','86–90','91–95','96–100','100+'].map((group, index) => ({ group, people: 32000 + index * 7000 })),
    profileTypes: [
      { type: 'Individuals', count: 820000 },
      { type: 'Children / guardian-linked', count: 94000 },
      { type: 'Faith groups', count: 3200 },
      { type: 'Organizations', count: 1800 },
      { type: 'In memory / in honour', count: 12600 },
    ],
    funds: { humanityFundContributions: 711800000, stewardshipContributions: 13200000, totalContributions: 725000000, currentEndowment: 812400000, cumulativeParticipantBenefits: 18600000, recycledBenefits: 7450000, verifiedReach: 1240000, connectorReach: 186000, averageGrowth: 0.1, activeClaimants: 420000, recycleRate: 0.28 },
  }
}

function user(id, username, country, ageGroup, connector, profileId, extra = {}) { return { id, username, password: 'Test123#', country, ageGroup, connector, profileId, ...extra } }
function profile(id, name, type, country, ageGroup, description, connector) { return { id, name, type, country, ageGroup, description, connector, createdAt: '2026-06-04T00:00:00.000Z' } }
function seedContribution(id, profileId, recognitionName, amount, allocationMode, paymentMethod, stewardshipTip, country, ageGroup, contributorUserId = '') { return { id, profileId, recognitionName, amount, allocationMode, paymentMethod, stewardshipTip, contributorUserId, country, ageGroup, ...splitContribution(amount, allocationMode, stewardshipTip), createdAt: '2026-06-05T00:00:00.000Z' } }

export async function loadSnapshot(env) {
  await ensureDb(env)
  const row = await env.DB.prepare('select snapshot from prototype_state where key = ?').bind(STATE_KEY).first()
  if (row?.snapshot) return JSON.parse(row.snapshot)
  const seed = createSeedData()
  await saveSnapshot(env, seed)
  return seed
}

export async function saveSnapshot(env, snapshot) {
  await ensureDb(env)
  snapshot.updatedAt = new Date().toISOString()
  await env.DB.prepare('insert into prototype_state (key, snapshot, updated_at) values (?, ?, datetime()) on conflict(key) do update set snapshot = excluded.snapshot, updated_at = datetime()').bind(STATE_KEY, JSON.stringify(snapshot)).run()
  return snapshot
}

async function ensureDb(env) {
  if (!env.DB) throw new Error('Cloudflare D1 binding DB is missing.')
  await env.DB.prepare('create table if not exists prototype_state (key text primary key, snapshot text not null, updated_at text not null default (datetime()))').run()
}

export async function createUser(env, input) {
  const snapshot = await loadSnapshot(env)
  const username = clean(input.username, '')
  const password = clean(input.password, 'Test123#')
  const repeatPassword = clean(input.repeatPassword, password)
  if (!username) throw new Error('Username is required.')
  if (isUsernameTaken(snapshot, username)) throw new Error('Username already exists. Please choose a different username.')
  if (password !== repeatPassword) throw new Error('Passwords must match.')
  const issues = validatePassword(password)
  if (issues.length) throw new Error(issues.join(' '))
  const profileId = id('profile')
  const createdAt = new Date().toISOString()
  const user = { id: id('user'), username, passwordHash: await hashPassword(password), country: clean(input.country, 'Unspecified'), ageGroup: clean(input.ageGroup, 'Unspecified'), connector: clean(input.connector, ''), guardianUsername: clean(input.guardianUsername, ''), profileId, createdAt }
  const profile = { id: profileId, name: username, type: 'Individual', country: user.country, ageGroup: user.ageGroup, description: 'Individual account profile created in the hosted private beta prototype.', connector: user.connector, createdAt }
  snapshot.users.push(user); snapshot.profiles.push(profile); incrementProfileType(snapshot, 'Individuals'); incrementCountryPeople(snapshot, user.country); incrementAgeGroup(snapshot, user.ageGroup)
  await saveSnapshot(env, snapshot)
  return user
}

export async function loginUser(env, input) {
  const snapshot = await loadSnapshot(env)
  const username = clean(input.username, '').toLowerCase()
  const password = clean(input.password, '')
  let user = null
  for (const item of snapshot.users) {
    if (item.username.toLowerCase() === username && await verifyPassword(password, item)) {
      user = item
      break
    }
  }
  if (!user) return { ok: false, error: 'Invalid username or password.' }
  const profile = snapshot.profiles.find((item) => item.id === user.profileId || item.name === user.username)
  const contributions = snapshot.contributions.filter((item) => item.contributorUserId === user.id || item.profileId === user.profileId || item.recognitionName === user.username)
  const claims = snapshot.claims.filter((item) => item.userId === user.id || item.profileId === user.profileId)
  return { ok: true, user, profile, contributions, claims }
}

export async function updateUserProfile(env, input) {
  const snapshot = await loadSnapshot(env)
  const user = snapshot.users.find((item) => item.id === input.id)
  if (!user) throw new Error('User not found.')
  const oldUsername = user.username
  if (typeof input.username === 'string') {
    const nextUsername = input.username.trim()
    if (!nextUsername) throw new Error('Username is required.')
    if (isUsernameTaken(snapshot, nextUsername, user.id)) throw new Error('Username already exists. Please choose a different username.')
    user.username = nextUsername
  }
  if (typeof input.password === 'string' && input.password.trim()) { const issues = validatePassword(input.password.trim()); if (issues.length) throw new Error(issues.join(' ')); user.passwordHash = await hashPassword(input.password.trim()); delete user.password }
  user.country = clean(input.country, user.country); user.ageGroup = clean(input.ageGroup, user.ageGroup)
  if (typeof input.connector === 'string') user.connector = input.connector.trim()
  if (typeof input.guardianUsername === 'string') user.guardianUsername = input.guardianUsername.trim()
  if (oldUsername !== user.username) rewriteUsername(snapshot, oldUsername, user.username, user.id)
  const profile = snapshot.profiles.find((item) => item.id === user.profileId || item.name === oldUsername)
  if (profile) { profile.name = user.username; profile.country = user.country; profile.ageGroup = user.ageGroup; profile.connector = user.connector }
  await saveSnapshot(env, snapshot)
  return { ok: true, user, profile }
}

export async function updateUserVerification(env, input) {
  const snapshot = await loadSnapshot(env)
  const user = snapshot.users.find((item) => item.id === input.id)
  if (!user) throw new Error('User not found.')
  user.verifiedHumanAt = new Date().toISOString(); user.verificationMethod = clean(input.verificationMethod, 'government-id-liveness'); user.verificationStatus = clean(input.verificationStatus, '16_plus')
  if (typeof input.guardianUsername === 'string') user.guardianUsername = input.guardianUsername.trim()
  const profile = snapshot.profiles.find((item) => item.id === user.profileId || item.name === user.username)
  if (profile) { profile.verificationStatus = user.verificationStatus; profile.guardianUsername = user.guardianUsername || '' }
  await saveSnapshot(env, snapshot)
  return { ok: true, user, profile }
}

export async function createProfile(env, input) {
  const snapshot = await loadSnapshot(env)
  const name = clean(input.name, ''), type = clean(input.type, ''), country = clean(input.country, '')
  if (!name) throw new Error('Name is required.'); if (!type) throw new Error('Contribution profile type is required.'); if (!country) throw new Error('Country is required.')
  const profile = { id: id('profile'), name, type, country, ageGroup: clean(input.ageGroup, 'Unspecified'), description: clean(input.description, ''), connector: clean(input.connector, ''), createdByUserId: clean(input.createdByUserId, ''), createdAt: new Date().toISOString() }
  snapshot.profiles.push(profile); incrementProfileType(snapshot, type); incrementCountryPeople(snapshot, country)
  await saveSnapshot(env, snapshot)
  return profile
}

export async function updateContributionProfile(env, input) {
  const snapshot = await loadSnapshot(env)
  const profile = snapshot.profiles.find((item) => item.id === input.id)
  if (!profile) throw new Error('Contribution profile not found.')
  if (!profile.createdByUserId || profile.createdByUserId !== input.userId) throw new Error('Only the creator can modify this contribution profile.')
  profile.name = clean(input.name, ''); profile.type = clean(input.type, ''); profile.country = clean(input.country, ''); profile.description = clean(input.description, ''); profile.updatedAt = new Date().toISOString()
  if (!profile.name) throw new Error('Name is required.'); if (!profile.type) throw new Error('Contribution profile type is required.'); if (!profile.country) throw new Error('Country is required.')
  await saveSnapshot(env, snapshot)
  return { ok: true, profile }
}

export async function createContribution(env, input) {
  const snapshot = await loadSnapshot(env)
  const contribution = buildContribution(snapshot, input)
  applyContribution(snapshot, contribution)
  await saveSnapshot(env, snapshot)
  return contribution
}

export async function createClaims(env, input) {
  const snapshot = await loadSnapshot(env)
  if (!Array.isArray(snapshot.claims)) snapshot.claims = []
  const actor = snapshot.users.find((item) => item.id === input.actorUserId)
  if (!actor) throw new Error('Claiming user not found.')
  const action = clean(input.action, '')
  if (!['claimed','recycled'].includes(action)) throw new Error('Claim action must be claimed or recycled.')
  const amount = roundMoney(Math.max(0, Number(input.amount) || 0)); if (amount <= 0) throw new Error('Claim amount must be greater than zero.')
  const targetUserIds = Array.isArray(input.targetUserIds) ? input.targetUserIds.map(String) : []
  if (!targetUserIds.length) throw new Error('At least one claim target is required.')
  const claims = [], contributions = [], now = new Date().toISOString()
  for (const targetUserId of targetUserIds) {
    const targetUser = snapshot.users.find((item) => item.id === targetUserId); if (!targetUser) throw new Error('Claim target not found.')
    const isSelf = targetUser.id === actor.id
    const isDependent = targetUser.guardianUsername === actor.username || (!targetUser.guardianUsername && targetUser.connector === actor.username && ['0–5','6–10','11–15'].includes(targetUser.ageGroup))
    if (!isSelf && !isDependent) throw new Error('Claim target is not linked to this account.')
    const claim = { id: id('claim'), actorUserId: actor.id, userId: targetUser.id, profileId: clean(targetUser.profileId, 'unknown-profile'), targetName: targetUser.username, action, amount, country: clean(targetUser.country, 'Unspecified'), ageGroup: clean(targetUser.ageGroup, 'Unspecified'), deliveryMethod: clean(input.deliveryMethod, action === 'recycled' ? 'Recycled into Humanity Fund' : 'Prototype claim delivery'), denomination: clean(input.denomination, ''), createdAt: now }
    snapshot.claims.push(claim); claims.push(claim)
    if (action === 'recycled') { const contribution = buildContribution(snapshot, { profileId: claim.profileId, recognitionName: targetUser.username, amount, allocationMode: clean(input.allocationMode, 'humanity'), paymentMethod: 'Recycled claim benefit', contributorUserId: targetUser.id, country: claim.country, ageGroup: claim.ageGroup, sourceClaimId: claim.id, isAnonymous: Boolean(input.isAnonymous), createdAt: now }); applyContribution(snapshot, contribution); contributions.push(contribution); snapshot.funds.recycledBenefits = roundMoney(snapshot.funds.recycledBenefits + amount) }
    else { snapshot.funds.cumulativeParticipantBenefits = roundMoney(snapshot.funds.cumulativeParticipantBenefits + amount); incrementCountryClaimant(snapshot, claim.country) }
  }
  await saveSnapshot(env, snapshot)
  return { ok: true, claims, contributions }
}

function buildContribution(snapshot, input) { const amount = Math.max(0, Number(input.amount) || 0); const stewardshipTip = Math.max(0, Number(input.stewardshipTip) || 0); const anonymousAlias = input.isAnonymous ? stableAnonymousAlias(snapshot, clean(input.contributorUserId, '')) : ''; return { id: id('contribution'), profileId: clean(input.profileId, 'unknown-profile'), recognitionName: clean(input.recognitionName, 'Anonymous'), amount, allocationMode: clean(input.allocationMode, 'humanity'), paymentMethod: clean(input.paymentMethod, 'Prototype payment'), stewardshipTip, contributorUserId: clean(input.contributorUserId, ''), country: clean(input.country, 'Unspecified'), ageGroup: clean(input.ageGroup, 'Unspecified'), sourceClaimId: clean(input.sourceClaimId, ''), isAnonymous: Boolean(input.isAnonymous), anonymousAlias, ...splitContribution(amount, input.allocationMode, stewardshipTip), createdAt: clean(input.createdAt, new Date().toISOString()) } }
export function splitContribution(amount, allocationMode, stewardshipTip = 0) { const safeAmount = Math.max(0, Number(amount) || 0), safeTip = Math.max(0, Number(stewardshipTip) || 0); let humanityPercent = 1; if (allocationMode === 'hybrid99') humanityPercent = 0.99; if (allocationMode === 'stewardship') humanityPercent = 0; const humanityFund = roundMoney(safeAmount * humanityPercent); return { humanityFund, stewardshipReserve: roundMoney(safeAmount - humanityFund + safeTip) } }
function applyContribution(snapshot, contribution) { snapshot.contributions.push(contribution); snapshot.funds.humanityFundContributions = roundMoney(snapshot.funds.humanityFundContributions + contribution.humanityFund); snapshot.funds.stewardshipContributions = roundMoney(snapshot.funds.stewardshipContributions + contribution.stewardshipReserve); snapshot.funds.totalContributions = roundMoney(snapshot.funds.humanityFundContributions + snapshot.funds.stewardshipContributions); snapshot.funds.currentEndowment = roundMoney(snapshot.funds.currentEndowment + contribution.humanityFund); incrementCountryContribution(snapshot, contribution.country, contribution.amount); incrementAgeGroup(snapshot, contribution.ageGroup) }
function stableAnonymousAlias(snapshot, contributorUserId) { return (snapshot.contributions ?? []).find((item) => item.isAnonymous && item.contributorUserId === contributorUserId && item.anonymousAlias)?.anonymousAlias || `Anonymous ${((snapshot.contributions ?? []).map((item) => /^Anonymous (\d+)$/.exec(item.anonymousAlias ?? '')).filter(Boolean).map((m) => Number(m[1])).reduce((max, n) => Math.max(max, n), 0)) + 1}` }
function rewriteUsername(snapshot, oldUsername, nextUsername, userId) { for (const item of snapshot.users) { if (item.connector === oldUsername) item.connector = nextUsername; if (item.guardianUsername === oldUsername) item.guardianUsername = nextUsername } for (const item of snapshot.profiles) if (item.connector === oldUsername) item.connector = nextUsername; for (const claim of snapshot.claims ?? []) if (claim.userId === userId) claim.targetName = nextUsername }
function isUsernameTaken(snapshot, username, exceptUserId = '') { const normalized = String(username).trim().toLowerCase(); return snapshot.users.some((user) => user.id !== exceptUserId && user.username.toLowerCase() === normalized) }
export function validatePassword(password) { const issues = []; if (!String(password)) return issues; if (String(password).length < 8) issues.push('Use at least 8 characters.'); if (!/[A-Z]/.test(String(password))) issues.push('Use at least one capital letter.'); if (!/[0-9]/.test(String(password))) issues.push('Use at least one number.'); if (!/[^A-Za-z0-9]/.test(String(password))) issues.push('Use at least one special character.'); return issues }
async function hashPassword(password) { const salt = crypto.getRandomValues(new Uint8Array(16)); const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits']); const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256); return `pbkdf2:${hex(salt)}:${hex(new Uint8Array(bits))}` }
async function verifyPassword(password, user) { if (user.passwordHash?.startsWith('pbkdf2:')) { const [, saltHex, stored] = user.passwordHash.split(':'); const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits']); const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromHex(saltHex), iterations: 100000, hash: 'SHA-256' }, key, 256); return hex(new Uint8Array(bits)) === stored } return user.password === password }
function hex(bytes) { return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('') }
function fromHex(value) { return new Uint8Array(String(value).match(/.{1,2}/g).map((byte) => parseInt(byte, 16))) }
function id(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}` }
function clean(value, fallback) { if (typeof value !== 'string') return fallback; const trimmed = value.trim(); return trimmed || fallback }
function roundMoney(value) { return Math.round(value * 100) / 100 }
function getOrCreateCountry(snapshot, country) { let row = snapshot.countries.find((item) => item.country === country); if (!row) { row = { country, people: 0, contributions: 0, connectors: 0, claimants: 0 }; snapshot.countries.push(row) } return row }
function incrementCountryPeople(snapshot, country) { getOrCreateCountry(snapshot, country).people += 1 }
function incrementCountryContribution(snapshot, country, amount) { const row = getOrCreateCountry(snapshot, country); row.contributions = roundMoney(row.contributions + amount) }
function incrementCountryClaimant(snapshot, country) { getOrCreateCountry(snapshot, country).claimants += 1 }
function incrementAgeGroup(snapshot, group) { let row = snapshot.ageGroups.find((item) => item.group === group); if (!row) { row = { group, people: 0 }; snapshot.ageGroups.push(row) } row.people += 1 }
function incrementProfileType(snapshot, type) { let row = snapshot.profileTypes.find((item) => item.type === type || item.type === `${type}s`); if (!row) { row = { type, count: 0 }; snapshot.profileTypes.push(row) } row.count += 1 }
