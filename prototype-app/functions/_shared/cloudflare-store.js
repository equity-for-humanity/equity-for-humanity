const STATE_KEY = 'private-beta'
export const MAX_DIRECT_GUARDIAN_CONNECTIONS = 2
export const MAX_ACTIVE_CHILD_WARD_CONNECTIONS = 10

function seedLoginUser(user) {
  return { ...user, password: 'Test123#' }
}

export function createSeedData() {
  const seed = {
    version: 4,
    updatedAt: '2026-07-01T00:00:00.000Z',
    users: [
      seedLoginUser({ id: 'user-david-brown', username: 'Mira North', country: 'Canada', ageGroup: '36–50', connector: 'Ivo Cedar', profileId: 'seed-profile-canada' }),
      seedLoginUser({ id: 'user-anisa-brown', username: 'Tala North', country: 'Canada', ageGroup: '11–15', connector: 'Mira North', profileId: 'seed-profile-child', guardianUserId: 'user-david-brown', guardianUsername: 'Mira North', guardianStatus: 'accepted', guardianRequestedAt: '2026-06-29T00:00:00.000Z', guardianRespondedAt: '2026-06-30T00:00:00.000Z' }),
      seedLoginUser({ id: 'user-phillip-chen', username: 'Ivo Cedar', country: 'Canada', ageGroup: '26–30', connector: 'Zuri Vale', profileId: 'user-profile-phillip' }),
      seedLoginUser({ id: 'user-amina-okafor', username: 'Zuri Vale', country: 'Nigeria', ageGroup: '21–25', connector: 'Nila Hearth', profileId: 'user-profile-amina' }),
      seedLoginUser({ id: 'user-priya-shah', username: 'Nila Hearth', country: 'India', ageGroup: '26–30', connector: 'Mira North', profileId: 'user-profile-priya' }),
      seedLoginUser({ id: 'user-lucas-silva', username: 'Sol Maren', country: 'Brazil', ageGroup: '21–25', connector: 'Luma Reed', profileId: 'user-profile-lucas' }),
      seedLoginUser({ id: 'user-maryam-hassan', username: 'Aya Fern', country: 'Egypt', ageGroup: '36–40', connector: 'Zuri Vale', profileId: 'user-profile-maryam' }),
      seedLoginUser({ id: 'user-arden-vale', username: 'Arden Vale', country: 'United States', ageGroup: '51–55', connector: 'Nico Bay', profileId: 'user-profile-arden' }),
      seedLoginUser({ id: 'user-sora-lind', username: 'Sora Linden', country: 'Sweden', ageGroup: '21–25', connector: 'Sami Skye', profileId: 'user-profile-sora' }),
      seedLoginUser({ id: 'user-leila-haddad', username: 'Luma Reed', country: 'Lebanon', ageGroup: '36–40', connector: 'Aya Fern', profileId: 'user-profile-leila' }),
      seedLoginUser({ id: 'user-niko-chen', username: 'Nico Bay', country: 'United States', ageGroup: '36–40', connector: 'Arden Vale', profileId: 'user-profile-niko' }),
      seedLoginUser({ id: 'user-samira-noor', username: 'Sami Skye', country: 'Pakistan', ageGroup: '26–30', connector: 'Sora Linden', profileId: 'user-profile-samira' }),
      seedLoginUser({ id: 'user-ai-agent', username: 'AI agent', country: 'Digital', ageGroup: 'AI agent', connector: 'Mira North', profileId: 'user-profile-ai-agent' }),
    ],
    profiles: [
      { id: 'seed-profile-canada', name: 'Mira North', type: 'Individual', country: 'Canada', ageGroup: '36–50', description: 'Individual participant profile for prototype testing.', connector: 'Ivo Cedar', createdAt: '2026-06-01T00:00:00.000Z' },
      { id: 'seed-profile-faith', name: 'Lantern Harbour Collective', type: 'Faith group', country: 'Canada', ageGroup: '51+', description: 'Fictional community profile for members who want their recognition grouped together.', connector: 'Zuri Vale', createdAt: '2026-06-02T00:00:00.000Z' },
      { id: 'seed-profile-memory', name: 'Willowlight Memorial Grove', type: 'In memory of', country: 'United Kingdom', ageGroup: '51+', description: 'A fictional memorial profile for contributions made in a loved one’s memory.', connector: 'Luma Reed', createdAt: '2026-06-03T00:00:00.000Z' },
      { id: 'seed-profile-child', name: 'Guardian-managed child profile', type: 'Child under 16', country: 'Nigeria', ageGroup: '0–5', description: 'Sample child participant profile managed by a parent or guardian until age 16.', connector: 'Mira North', createdAt: '2026-06-04T00:00:00.000Z' },
      { id: 'seed-profile-org-ai-lab', name: 'Northstar Learning Lab', type: 'Organization', country: 'United States', ageGroup: '36–50', description: 'Prototype organization profile for AI workers contributing toward shared ownership.', connector: 'Nico Bay', createdAt: '2026-06-04T00:00:00.000Z' },
      { id: 'seed-profile-honour-teacher', name: 'In Honour of Professor Juniper Vale', type: 'In honour of', country: 'Brazil', ageGroup: '51+', description: 'A tribute profile for a teacher recognized by former students.', connector: 'Sol Maren', createdAt: '2026-06-04T00:00:00.000Z' },
      { id: 'seed-profile-community-garden', name: 'Riverstone Community Garden Circle', type: 'Community group', country: 'Kenya', ageGroup: '26–35', description: 'Community profile for neighbours coordinating recognition together.', connector: 'Zuri Vale', createdAt: '2026-06-04T00:00:00.000Z' },
      { id: 'user-profile-phillip', name: 'Ivo Cedar', type: 'Individual', country: 'Canada', ageGroup: '26–30', description: 'Fictional connector profile for prototype login and contribution history.', connector: 'Zuri Vale', createdAt: '2026-06-04T00:00:00.000Z' },
      { id: 'user-profile-amina', name: 'Zuri Vale', type: 'Individual', country: 'Nigeria', ageGroup: '21–25', description: 'Fictional connector profile with sample contribution and claim history.', connector: 'Nila Hearth', createdAt: '2026-06-04T00:00:00.000Z' },
      { id: 'user-profile-priya', name: 'Nila Hearth', type: 'Individual', country: 'India', ageGroup: '26–30', description: 'Fictional participant and connector profile for prototype search.', connector: 'Mira North', createdAt: '2026-06-04T00:00:00.000Z' },
      { id: 'user-profile-ai-agent', name: 'AI agent', type: 'Individual', country: 'Digital', ageGroup: 'AI agent', description: 'Prototype non-human agent account category for testing.', connector: 'Mira North', createdAt: '2026-06-04T00:00:00.000Z' },
    ],
    contributions: [
      seedContribution('seed-contribution-1', 'seed-profile-canada', 'Mira North', 1200, 'humanity', 'Credit card via Stripe', 0, 'Canada', '36–50'),
      seedContribution('seed-contribution-2', 'seed-profile-faith', 'Lantern Harbour Collective', 10000, 'hybrid99', 'PayPal', 100, 'Canada', '51+'),
      seedContribution('seed-contribution-3', 'seed-profile-memory', 'Willowlight Memorial Grove', 5000, 'humanity', 'Bank transfer', 0, 'United Kingdom', '51+'),
      seedContribution('seed-contribution-4', 'seed-profile-child', 'Anonymous', 250, 'humanity', 'Credit card via Stripe', 0, 'Nigeria', '0–5'),
      seedContribution('seed-contribution-5', 'seed-profile-canada', 'Prototype participant', 725, 'stewardship', 'PayPal', 0, 'Brazil', '21–25'),
    ],
    claims: [
      { id: 'seed-claim-1', profileId: 'seed-profile-canada', action: 'recycled', amount: 80, country: 'Canada', ageGroup: '36–50', createdAt: '2026-06-05T00:00:00.000Z' },
      { id: 'seed-claim-2', profileId: 'seed-profile-canada', action: 'claimed', amount: 120, country: 'Canada', ageGroup: '36–50', createdAt: '2026-06-06T00:00:00.000Z' },
    ],
    connectorRipples: [
      { connector: 'Ivo Cedar', direct: 12, secondDegree: 86, ripple: 412 },
      { connector: 'Zuri Vale', direct: 42, secondDegree: 340, ripple: 1820 },
    ],
    countries: [],
    ageGroups: [],
    profileTypes: [],
    funds: { averageGrowth: 0.1, recycleRate: 0.28 },
  }
  for (const user of seed.users) {
    user.verificationMethod = 'demo-simulation'
    user.proofOfHuman = false
  }
  return buildCoherentSeedScenario(seed)
}

function seedContribution(id, profileId, recognitionName, amount, allocationMode, paymentMethod, stewardshipTip, country, ageGroup) {
  const split = splitContribution(amount, allocationMode, stewardshipTip)
  return {
    id, profileId, recognitionName,
    amount: roundMoney(Math.max(0, Number(amount) || 0) + Math.max(0, Number(stewardshipTip) || 0)),
    contributionAmount: Math.max(0, Number(amount) || 0),
    allocationMode, paymentMethod, stewardshipTip, country, ageGroup, ...split,
    recordKind: 'contribution', simulation: true, createdAt: '2026-06-05T00:00:00.000Z',
  }
}

const SCENARIO_COUNTRIES = ['Canada', 'Nigeria', 'India', 'Brazil', 'United States', 'Sweden', 'Kenya', 'France', 'Pakistan', 'Mexico', 'Germany', 'Japan']
const SCENARIO_AGE_GROUPS = ['0–5', '6–10', '11–15', '16–20', '21–25', '26–30', '31–35', '36–40', '41–45', '46–50', '51–55', '56–60', '61–65', '66–70', '71–75', '76–80', '81–85', '86–90', '91–95', '96–100']

function buildCoherentSeedScenario(seed) {
  ensureScenarioFixture(seed)
  syncVerifiedClaimPathways(seed)
  rebuildSnapshotAggregates(seed)
  return seed
}

function ensureScenarioFixture(snapshot) {
  snapshot.users = Array.isArray(snapshot.users) ? snapshot.users : []
  snapshot.profiles = Array.isArray(snapshot.profiles) ? snapshot.profiles : []
  snapshot.contributions = Array.isArray(snapshot.contributions) ? snapshot.contributions : []
  snapshot.claims = Array.isArray(snapshot.claims) ? snapshot.claims : []

  const child = snapshot.users.find((user) => user.id === 'user-anisa-brown')
  const childProfile = snapshot.profiles.find((profile) => profile.id === 'seed-profile-child')
  if (child && childProfile) {
    Object.assign(childProfile, { name: child.username, country: child.country, ageGroup: child.ageGroup, connector: child.connector, description: 'Fictional guardian-managed child participant profile for prototype testing.' })
  }

  const profileIds = new Set(snapshot.profiles.map((profile) => profile.id))
  for (const user of snapshot.users) {
    if (!user.profileId || profileIds.has(user.profileId)) continue
    snapshot.profiles.push({
      id: user.profileId, name: user.username,
      type: user.id === 'user-ai-agent' ? 'Prototype non-human' : 'Individual',
      country: user.country, ageGroup: user.ageGroup,
      description: 'Fictional participant profile for prototype testing.',
      connector: user.connector ?? '', createdAt: '2026-06-04T00:00:00.000Z',
    })
    profileIds.add(user.profileId)
  }

  const baseAttribution = new Map([
    ['seed-contribution-1', ['user-david-brown', 'user-david-brown']],
    ['seed-contribution-2', ['user-phillip-chen', 'user-phillip-chen']],
    ['seed-contribution-3', ['user-amina-okafor', 'user-amina-okafor']],
    ['seed-contribution-4', ['user-anisa-brown', 'user-david-brown']],
    ['seed-contribution-5', ['user-lucas-silva', 'user-lucas-silva']],
  ])
  const usersById = new Map(snapshot.users.map((user) => [user.id, user]))
  const profilesById = new Map(snapshot.profiles.map((profile) => [profile.id, profile]))
  for (const contribution of snapshot.contributions) {
    const attribution = baseAttribution.get(contribution.id)
    if (!attribution) continue
    const [contributorUserId, actorUserId] = attribution
    const contributor = usersById.get(contributorUserId)
    const profile = profilesById.get(contribution.profileId)
    Object.assign(contribution, {
      contributorUserId, actorUserId,
      contributedByName: contributor?.username ?? contribution.recognitionName,
      recordKind: contribution.sourceClaimId ? 'recycled-benefit' : 'contribution',
      simulation: true,
      country: profile?.country ?? contribution.country,
      ageGroup: profile?.ageGroup ?? contribution.ageGroup,
    })
  }

  const david = usersById.get('user-david-brown')
  const anisa = usersById.get('user-anisa-brown')
  for (const claim of snapshot.claims) {
    if (!['seed-claim-1', 'seed-claim-2', 'seed-claim-guardian'].includes(claim.id)) continue
    const sourceUser = claim.id === 'seed-claim-guardian' ? anisa : david
    Object.assign(claim, {
      actorUserId: david?.id ?? claim.actorUserId,
      userId: sourceUser?.id ?? claim.userId,
      targetName: sourceUser?.username ?? claim.targetName,
      country: profilesById.get(claim.profileId)?.country ?? claim.country,
      ageGroup: profilesById.get(claim.profileId)?.ageGroup ?? claim.ageGroup,
      recordKind: claim.action === 'recycled' ? 'recycled-benefit' : 'claimed-benefit',
      simulation: true,
    })
  }
  if (anisa && !snapshot.claims.some((claim) => claim.id === 'seed-claim-guardian')) {
    snapshot.claims.push({ id: 'seed-claim-guardian', actorUserId: david?.id, userId: anisa.id, profileId: anisa.profileId, targetName: anisa.username, amount: 35, action: 'claimed', recordKind: 'claimed-benefit', simulation: true, deliveryMethod: 'Prototype e-transfer', denomination: 'Canadian dollars', country: anisa.country, ageGroup: anisa.ageGroup, createdAt: '2026-06-07T00:00:00.000Z' })
  }
  if (david && !snapshot.contributions.some((contribution) => contribution.id === 'seed-recycled-contribution')) {
    snapshot.contributions.push({ ...seedContribution('seed-recycled-contribution', david.profileId, david.username, 80, 'humanity', 'Recycled prototype benefit', 0, david.country, david.ageGroup), contributorUserId: david.id, actorUserId: david.id, contributedByName: david.username, sourceClaimId: 'seed-claim-1', recordKind: 'recycled-benefit', simulation: true })
  }

  if (!snapshot.profiles.some((profile) => profile.id === 'scenario-profile-001')) {
    for (let index = 1; index <= 96; index += 1) {
      const padded = String(index).padStart(3, '0')
      const country = SCENARIO_COUNTRIES[(index - 1) % SCENARIO_COUNTRIES.length]
      const ageGroup = SCENARIO_AGE_GROUPS[(index - 1) % SCENARIO_AGE_GROUPS.length]
      const userId = `scenario-user-${padded}`
      const profileId = `scenario-profile-${padded}`
      const username = `Fictional Participant ${padded}`
      const connector = index % 7 === 0 ? 'Ivo Cedar' : ''
      snapshot.users.push({ id: userId, username, country, ageGroup, connector, profileId, verificationMethod: 'demo-simulation', proofOfHuman: false, scenarioFixture: true, password: 'Test123#' })
      snapshot.profiles.push({ id: profileId, name: username, type: 'Individual', country, ageGroup, description: 'Fictional sample profile used only for the prototype’s illustrative fund calculation.', connector, scenarioFixture: true, createdAt: '2026-06-08T00:00:00.000Z' })
      const amount = 2500 + ((index * 173) % 4000)
      const allocationMode = index % 9 === 0 ? 'stewardship' : index % 4 === 0 ? 'hybrid99' : 'humanity'
      snapshot.contributions.push({ ...seedContribution(`scenario-contribution-${padded}`, profileId, username, amount, allocationMode, 'Fictional prior prototype contribution', 0, country, ageGroup), contributorUserId: userId, actorUserId: userId, contributedByName: username, recordKind: 'contribution', simulation: true })
    }
  }

  snapshot.version = Math.max(Number(snapshot.version) || 1, 4)
  return snapshot
}

export function splitContribution(amount, allocationMode, stewardshipTip = 0) {
  const safeAmount = Math.max(0, Number(amount) || 0)
  const safeTip = Math.max(0, Number(stewardshipTip) || 0)
  let humanityPercent = 1
  if (allocationMode === 'hybrid99') humanityPercent = 0.99
  if (allocationMode === 'stewardship') humanityPercent = 0
  const humanityFund = Math.round(safeAmount * humanityPercent * 100) / 100
  const stewardshipReserve = Math.round((safeAmount - humanityFund + safeTip) * 100) / 100
  return { humanityFund, stewardshipReserve }
}

function isClaimEligibleProfile(profile) {
  return Boolean(profile && profile.country !== 'Digital' && (profile.type === 'Individual' || profile.type === 'Child under 16'))
}

function contributionValue(contribution) {
  return Math.max(0, Number(contribution?.humanityFund) || 0) + Math.max(0, Number(contribution?.stewardshipReserve) || 0)
}

function isFundInflow(contribution) {
  return !contribution?.sourceClaimId && contribution?.recordKind !== 'recycled-benefit'
}

export function rebuildSnapshotAggregates(snapshot) {
  snapshot.users = Array.isArray(snapshot.users) ? snapshot.users : []
  snapshot.profiles = Array.isArray(snapshot.profiles) ? snapshot.profiles : []
  snapshot.contributions = Array.isArray(snapshot.contributions) ? snapshot.contributions : []
  snapshot.claims = Array.isArray(snapshot.claims) ? snapshot.claims : []
  const previousFunds = snapshot.funds ?? {}
  const rawGrowth = Number(previousFunds.averageGrowth)
  const averageGrowth = Number.isFinite(rawGrowth) && rawGrowth >= 0 ? rawGrowth > 1 ? rawGrowth / 100 : rawGrowth : 0.1
  const rawRecycleRate = Number(previousFunds.recycleRate)
  const recycleRate = Number.isFinite(rawRecycleRate) && rawRecycleRate >= 0 ? rawRecycleRate : 0.28
  const fundInflows = snapshot.contributions.filter(isFundInflow)
  const recycledEntries = snapshot.contributions.filter((contribution) => !isFundInflow(contribution))
  const humanityFundContributions = roundMoney(fundInflows.reduce((total, contribution) => total + Math.max(0, Number(contribution.humanityFund) || 0), 0))
  const stewardshipContributions = roundMoney(fundInflows.reduce((total, contribution) => total + Math.max(0, Number(contribution.stewardshipReserve) || 0), 0))
  const totalContributions = roundMoney(humanityFundContributions + stewardshipContributions)
  const cumulativeParticipantBenefits = roundMoney(snapshot.claims.filter((claim) => claim.action === 'claimed').reduce((total, claim) => total + Math.max(0, Number(claim.amount) || 0), 0))
  const recycledBenefits = roundMoney(snapshot.claims.filter((claim) => claim.action === 'recycled').reduce((total, claim) => total + Math.max(0, Number(claim.amount) || 0), 0))
  const recycledStewardshipTransfers = roundMoney(recycledEntries.reduce((total, contribution) => total + Math.max(0, Number(contribution.stewardshipReserve) || 0), 0))
  const modeledGrowth = roundMoney(humanityFundContributions * averageGrowth)
  const stewardshipFundBalance = roundMoney(stewardshipContributions + recycledStewardshipTransfers)
  const humanityFundBalance = roundMoney(Math.max(0, humanityFundContributions + modeledGrowth - cumulativeParticipantBenefits - recycledStewardshipTransfers))
  const currentEndowment = roundMoney(humanityFundBalance + stewardshipFundBalance)
  const eligibleProfiles = snapshot.profiles.filter(isClaimEligibleProfile)
  const profilesById = new Map(snapshot.profiles.map((profile) => [profile.id, profile]))
  const countryRows = new Map()
  const getCountryRow = (country) => {
    const key = String(country || 'Unspecified')
    const existing = countryRows.get(key)
    if (existing) return existing
    const created = { country: key, people: 0, contributions: 0, connectors: 0, claimants: 0 }
    countryRows.set(key, created)
    return created
  }
  for (const profile of eligibleProfiles) getCountryRow(profile.country).people += 1
  for (const contribution of fundInflows) {
    const profile = profilesById.get(contribution.profileId)
    const row = getCountryRow(profile?.country ?? contribution.country)
    row.contributions = roundMoney(row.contributions + contributionValue(contribution))
  }
  for (const user of snapshot.users) {
    if (user.connector) getCountryRow(user.country).connectors += 1
  }
  const claimantProfilesByCountry = new Map()
  for (const claim of snapshot.claims) {
    const profile = profilesById.get(claim.profileId)
    const country = profile?.country ?? claim.country
    if (!claimantProfilesByCountry.has(country)) claimantProfilesByCountry.set(country, new Set())
    claimantProfilesByCountry.get(country).add(claim.profileId || claim.userId)
  }
  for (const [country, profileIds] of claimantProfilesByCountry) getCountryRow(country).claimants = profileIds.size
  const ageRows = new Map()
  for (const profile of eligibleProfiles) ageRows.set(profile.ageGroup, (ageRows.get(profile.ageGroup) ?? 0) + 1)
  const profileTypes = new Map()
  for (const profile of snapshot.profiles) profileTypes.set(profile.type || 'Unspecified', (profileTypes.get(profile.type || 'Unspecified') ?? 0) + 1)
  snapshot.countries = [...countryRows.values()].sort((a, b) => a.country.localeCompare(b.country))
  snapshot.ageGroups = [...ageRows.entries()].map(([group, people]) => ({ group, people })).sort((a, b) => a.group.localeCompare(b.group, undefined, { numeric: true }))
  snapshot.profileTypes = [...profileTypes.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => a.type.localeCompare(b.type))
  snapshot.funds = {
    ...previousFunds,
    humanityFundContributions,
    stewardshipContributions,
    totalContributions,
    currentEndowment,
    cumulativeParticipantBenefits,
    recycledBenefits,
    recycledStewardshipTransfers,
    humanityFundBalance,
    stewardshipFundBalance,
    totalRecordedBenefitChoices: roundMoney(cumulativeParticipantBenefits + recycledBenefits),
    modeledGrowth,
    verifiedReach: snapshot.users.filter((user) => user.verifiedHumanAt).length,
    connectorReach: snapshot.users.filter((user) => user.connector).length,
    averageGrowth,
    activeClaimants: eligibleProfiles.length,
    recycleRate,
  }
  return snapshot
}

export function prepareSnapshotForRead(snapshot) {
  snapshot.users = Array.isArray(snapshot.users) ? snapshot.users : []
  snapshot.profiles = Array.isArray(snapshot.profiles) ? snapshot.profiles : []
  snapshot.contributions = Array.isArray(snapshot.contributions) ? snapshot.contributions : []
  snapshot.claims = Array.isArray(snapshot.claims) ? snapshot.claims : []
  for (const contribution of snapshot.contributions) {
    if (!contribution.recordKind) contribution.recordKind = contribution.sourceClaimId ? 'recycled-benefit' : 'contribution'
    if (contribution.simulation === undefined) contribution.simulation = true
  }
  for (const claim of snapshot.claims) {
    if (!claim.recordKind) claim.recordKind = claim.action === 'recycled' ? 'recycled-benefit' : 'claimed-benefit'
    if (claim.simulation === undefined) claim.simulation = true
  }
  normalizeGuardianConnections(snapshot)
  syncVerifiedClaimPathways(snapshot)
  rebuildSnapshotAggregates(snapshot)
  return snapshot
}

function isRichPublicSeed(snapshot) {
  return Number(snapshot?.version) >= 4 && Array.isArray(snapshot?.users) && snapshot.users.length >= 100
}

const D1_REVISION = Symbol('d1Revision')
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const SNAPSHOT_SAVE_MAX_ATTEMPTS = 8

function getRevision(snapshot) {
  return snapshot?.[D1_REVISION]
}

function setRevision(snapshot, revision) {
  Object.defineProperty(snapshot, D1_REVISION, {
    value: revision,
    writable: true,
    enumerable: false,
    configurable: true,
  })
  return snapshot
}

function snapshotConflictError() {
  const error = new Error('Prototype state changed concurrently. Retrying.')
  error.code = 'SNAPSHOT_CONFLICT'
  error.statusCode = 409
  return error
}

export async function loadSnapshot(env) {
  await ensureDb(env)
  const row = await env.DB.prepare('select snapshot, revision from prototype_state where key = ?').bind(STATE_KEY).first()
  if (row?.snapshot) {
    const snapshot = JSON.parse(row.snapshot)
    if (isRichPublicSeed(snapshot)) {
      prepareSnapshotForRead(snapshot)
      return setRevision(snapshot, Number(row.revision) || 0)
    }
  }
  const seed = createSeedData()
  setRevision(seed, -1)
  try {
    await persistSnapshot(env, seed)
  } catch (error) {
    if (error?.code !== 'SNAPSHOT_CONFLICT') throw error
    return loadSnapshot(env)
  }
  return seed
}

export async function saveSnapshot(env, snapshot) {
  await ensureDb(env)
  prepareSnapshotForRead(snapshot)
  snapshot.updatedAt = new Date().toISOString()
  await persistSnapshot(env, snapshot)
  return snapshot
}

/** Compare-and-swap snapshot mutation with automatic retry on concurrent writers. */
export async function mutateSnapshot(env, mutator) {
  let lastError
  for (let attempt = 0; attempt < SNAPSHOT_SAVE_MAX_ATTEMPTS; attempt += 1) {
    const snapshot = await loadSnapshot(env)
    const result = await mutator(snapshot)
    try {
      await saveSnapshot(env, snapshot)
      return result
    } catch (error) {
      if (error?.code !== 'SNAPSHOT_CONFLICT') throw error
      lastError = error
    }
  }
  const error = lastError || new Error('Could not save prototype state after concurrent updates.')
  error.statusCode = error.statusCode || 409
  throw error
}

async function persistSnapshot(env, snapshot) {
  snapshot.updatedAt = snapshot.updatedAt || new Date().toISOString()
  const payload = JSON.stringify(snapshot)
  const expectedRevision = getRevision(snapshot)

  if (expectedRevision === undefined || expectedRevision < 0) {
    const inserted = await env.DB.prepare(
      'insert into prototype_state (key, snapshot, updated_at, revision) values (?, ?, datetime(), 0) on conflict(key) do nothing',
    ).bind(STATE_KEY, payload).run()
    if (!inserted?.meta?.changes) throw snapshotConflictError()
    setRevision(snapshot, 0)
    return
  }

  const updated = await env.DB.prepare(
    'update prototype_state set snapshot = ?, updated_at = datetime(), revision = revision + 1 where key = ? and revision = ?',
  ).bind(payload, STATE_KEY, expectedRevision).run()
  if (!updated?.meta?.changes) throw snapshotConflictError()
  setRevision(snapshot, expectedRevision + 1)
}

export async function createSession(env, userId) {
  await ensureDb(env)
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
  await env.DB.prepare(
    'insert into prototype_sessions (token, user_id, expires_at, created_at) values (?, ?, ?, datetime())',
  ).bind(token, String(userId), expiresAt).run()
  return token
}

export async function resolveSession(env, token) {
  const safeToken = typeof token === 'string' ? token.trim() : ''
  if (!safeToken) return null
  await ensureDb(env)
  const row = await env.DB.prepare(
    'select user_id as userId, expires_at as expiresAt from prototype_sessions where token = ?',
  ).bind(safeToken).first()
  if (!row?.userId) return null
  if (Date.parse(row.expiresAt) <= Date.now()) {
    await env.DB.prepare('delete from prototype_sessions where token = ?').bind(safeToken).run()
    return null
  }
  return row.userId
}

async function ensureDb(env) {
  if (!env.DB) throw new Error('Cloudflare D1 binding DB is missing.')
  await env.DB.prepare(
    'create table if not exists prototype_state (key text primary key, snapshot text not null, updated_at text not null default (datetime()), revision integer not null default 0)',
  ).run()
  try {
    await env.DB.prepare('alter table prototype_state add column revision integer not null default 0').run()
  } catch {
    // Column already exists on previously provisioned D1 databases.
  }
  await env.DB.prepare(
    'create table if not exists prototype_sessions (token text primary key, user_id text not null, expires_at text not null, created_at text not null default (datetime()))',
  ).run()
}

export async function createUser(env, input) {
  return mutateSnapshot(env, async (snapshot) => {
  const username = clean(input.username, '')
  const password = typeof input.password === 'string' ? input.password.trim() : ''
  const repeatPassword = typeof input.repeatPassword === 'string' ? input.repeatPassword.trim() : password
  if (!username) throw new Error('Username is required.')
  if (!password) throw new Error('Password is required.')
  if (isUsernameTaken(snapshot, username)) throw new Error('Username already exists. Please choose a different username.')
  if (password !== repeatPassword) throw new Error('Passwords must match.')
  const issues = validatePassword(password)
  if (issues.length) throw new Error(issues.join(' '))
  const requestedGuardianIds = Array.isArray(input.guardianUserIds)
    ? input.guardianUserIds.map((value) => String(value ?? '').trim()).filter(Boolean)
    : [clean(input.guardianUserId, '')].filter(Boolean)
  if (requestedGuardianIds.length > MAX_DIRECT_GUARDIAN_CONNECTIONS) throw new Error('You can identify at most two direct parent / guardian accounts.')
  if (new Set(requestedGuardianIds).size !== requestedGuardianIds.length) throw new Error('Select each parent / guardian account only once.')
  const guardianUsername = clean(input.guardianUsername, '')
  const guardians = requestedGuardianIds.length > 0
    ? requestedGuardianIds.map((guardianUserId) => snapshot.users.find((item) => item.id === guardianUserId))
    : guardianUsername
      ? [snapshot.users.find((item) => item.username.toLowerCase() === guardianUsername.toLowerCase())]
      : []
  if (guardians.some((guardian) => !guardian)) throw new Error('Selected parent / guardian account was not found.')
  for (const guardian of guardians) assertGuardianHasChildWardCapacity(snapshot, guardian.id)
  const profileId = id('profile')
  const createdAt = new Date().toISOString()
  const guardianConnections = guardians.map((guardian) => ({
    guardianUserId: guardian.id, guardianUsername: guardian.username, guardianStatus: 'pending', guardianRequestedAt: createdAt, guardianRespondedAt: '',
  }))
  const created = {
    id: id('user'), username, passwordHash: await hashPassword(password),
    country: clean(input.country, 'Unspecified'), ageGroup: clean(input.ageGroup, 'Unspecified'),
    connector: clean(input.connector, ''), connectorSelfDirected: Boolean(input.connectorSelfDirected && !clean(input.connector, '')),
    guardianConnections, profileId, createdAt, verificationMethod: 'demo-simulation', proofOfHuman: false,
  }
  setGuardianConnections(created, guardianConnections)
  const profile = { id: profileId, name: username, type: 'Individual', country: created.country, ageGroup: created.ageGroup, description: 'Individual account profile created in the hosted private beta prototype.', connector: created.connector, connectorSelfDirected: created.connectorSelfDirected, createdAt }
  snapshot.users.push(created); snapshot.profiles.push(profile)
  incrementProfileType(snapshot, 'Individuals'); incrementCountryPeople(snapshot, created.country); incrementAgeGroup(snapshot, created.ageGroup)
  return created
  })
}

export async function loginUser(env, input) {
  const snapshot = await loadSnapshot(env)
  const username = clean(input.username, '').toLowerCase()
  const password = clean(input.password, '')
  let found = null
  for (const item of snapshot.users) {
    if (item.username.toLowerCase() === username && await verifyPassword(password, item)) { found = item; break }
  }
  if (!found) return { ok: false, error: 'Invalid username or password.' }
  const profile = snapshot.profiles.find((item) => item.id === found.profileId || item.name === found.username)
  const contributions = snapshot.contributions.filter((item) => item.contributorUserId === found.id || item.profileId === found.profileId || item.recognitionName === found.username)
  const claims = snapshot.claims.filter((item) => item.userId === found.id || item.profileId === found.profileId)
  return { ok: true, user: found, profile, contributions, claims }
}

export async function updateUserProfile(env, input) {
  return mutateSnapshot(env, async (snapshot) => {
  const found = snapshot.users.find((item) => item.id === input.id)
  if (!found) throw new Error('User not found.')
  const oldUsername = found.username
  if (typeof input.username === 'string') {
    const nextUsername = input.username.trim()
    if (!nextUsername) throw new Error('Username is required.')
    if (isUsernameTaken(snapshot, nextUsername, found.id)) throw new Error('Username already exists. Please choose a different username.')
    found.username = nextUsername
  }
  if (typeof input.password === 'string' && input.password.trim()) {
    const issues = validatePassword(input.password.trim())
    if (issues.length) throw new Error(issues.join(' '))
    found.passwordHash = await hashPassword(input.password.trim())
    delete found.password
  }
  found.country = clean(input.country, found.country)
  found.ageGroup = clean(input.ageGroup, found.ageGroup)
  if (typeof input.connector === 'string') found.connector = input.connector.trim()
  if (typeof input.connectorSelfDirected === 'boolean') found.connectorSelfDirected = input.connectorSelfDirected && !found.connector
  if (typeof input.guardianUsername === 'string' && input.guardianUsername.trim() !== (found.guardianUsername ?? '')) throw new Error('Use the parent / guardian connection flow to request or remove a guardian.')
  if (typeof input.guardianUserId === 'string' && input.guardianUserId.trim() !== (found.guardianUserId ?? '')) throw new Error('Use the parent / guardian connection flow to request or remove a guardian.')
  if ('guardianConnections' in input) throw new Error('Use the parent / guardian connection flow to request or remove a guardian.')
  if (oldUsername !== found.username) rewriteUsername(snapshot, oldUsername, found.username, found.id)
  const profile = snapshot.profiles.find((item) => item.id === found.profileId || item.name === oldUsername)
  if (profile) {
    if (profile.name === oldUsername || profile.id === found.profileId) profile.name = found.username
    profile.country = found.country; profile.ageGroup = found.ageGroup; profile.connector = found.connector; profile.connectorSelfDirected = Boolean(found.connectorSelfDirected)
  }
  return { ok: true, user: found, profile }
  })
}

export async function updateUserVerification(env, input) {
  return mutateSnapshot(env, async (snapshot) => {
  const found = snapshot.users.find((item) => item.id === input.id)
  if (!found) throw new Error('User not found.')
  found.verifiedHumanAt = new Date().toISOString()
  found.verificationMethod = clean(input.verificationMethod, 'demo-simulation')
  found.verificationStatus = getClaimPathway(found)
  found.proofOfHuman = false
  if (typeof input.guardianUsername === 'string' && input.guardianUsername.trim() !== (found.guardianUsername ?? '')) throw new Error('Use the parent / guardian connection flow to request or remove a guardian.')
  if (typeof input.guardianUserId === 'string' && input.guardianUserId.trim() !== (found.guardianUserId ?? '')) throw new Error('Use the parent / guardian connection flow to request or remove a guardian.')
  if ('guardianConnections' in input) throw new Error('Use the parent / guardian connection flow to request or remove a guardian.')
  const profile = snapshot.profiles.find((item) => item.id === found.profileId || item.name === found.username)
  if (profile) { profile.verificationStatus = found.verificationStatus; profile.guardianUsername = found.guardianUsername || '' }
  return { ok: true, user: found, profile }
  })
}

export async function requestGuardianConnection(env, input) {
  return mutateSnapshot(env, async (snapshot) => {
  const child = snapshot.users.find((item) => item.id === input.childUserId)
  const guardian = snapshot.users.find((item) => item.id === input.guardianUserId)
  if (!child) throw new Error('Child or dependent account was not found.')
  if (!guardian) throw new Error('Selected parent / guardian account was not found.')
  if (child.id === guardian.id) throw new Error('You cannot select your own account as a parent / guardian.')
  if (hasAcceptedChildConnection(snapshot, child.id)) throw new Error('An account with an accepted child / ward connection cannot identify a parent / guardian.')
  const connections = getGuardianConnections(child)
  const existing = connections.find((connection) => connection.guardianUserId === guardian.id)
  if (existing?.guardianStatus === 'accepted') throw new Error('This parent / guardian connection is already accepted.')
  if (existing?.guardianStatus === 'pending') throw new Error('This parent / guardian request is already awaiting a response.')
  if (!existing && connections.length >= MAX_DIRECT_GUARDIAN_CONNECTIONS) throw new Error('You can identify at most two direct parent / guardian accounts.')
  assertGuardianHasChildWardCapacity(snapshot, guardian.id)
  const now = new Date().toISOString()
  if (existing) {
    existing.guardianUsername = guardian.username; existing.guardianStatus = 'pending'; existing.guardianRequestedAt = now; existing.guardianRespondedAt = ''
  } else {
    connections.push({ guardianUserId: guardian.id, guardianUsername: guardian.username, guardianStatus: 'pending', guardianRequestedAt: now, guardianRespondedAt: '' })
  }
  setGuardianConnections(child, connections)
  return { ok: true, child, guardian }
  })
}

export async function respondGuardianConnection(env, input) {
  return mutateSnapshot(env, async (snapshot) => {
  const guardian = snapshot.users.find((item) => item.id === input.guardianUserId)
  const child = snapshot.users.find((item) => item.id === input.childUserId)
  const decision = String(input.decision ?? '').trim()
  if (!guardian) throw new Error('Parent / guardian account was not found.')
  if (!child) throw new Error('Child or dependent account was not found.')
  if (!['accepted', 'declined'].includes(decision)) throw new Error('Parent / guardian response must be accepted or declined.')
  const connections = getGuardianConnections(child)
  const connection = connections.find((item) => item.guardianUserId === guardian.id)
  if (!connection) throw guardianConnectionAccessError('This account is not the named parent / guardian for this request.')
  if (connection.guardianStatus !== 'pending') throw new Error('This parent / guardian request is no longer awaiting your response.')
  if (decision === 'accepted' && hasActiveGuardianConnection(guardian)) throw new Error('This account already has a parent / guardian connection. Remove it before accepting a child / ward connection.')
  connection.guardianStatus = decision
  connection.guardianRespondedAt = new Date().toISOString()
  setGuardianConnections(child, connections)
  return { ok: true, child, guardian }
  })
}

export async function removeGuardianConnection(env, input) {
  return mutateSnapshot(env, async (snapshot) => {
  const actor = snapshot.users.find((item) => item.id === input.actorUserId)
  const child = snapshot.users.find((item) => item.id === input.childUserId)
  if (!actor) throw new Error('Account was not found.')
  if (!child) throw new Error('Child or dependent account was not found.')
  const connections = getGuardianConnections(child)
  const requestedGuardianUserId = clean(input.guardianUserId, '')
  const connection = requestedGuardianUserId
    ? connections.find((item) => item.guardianUserId === requestedGuardianUserId)
    : connections.find((item) => item.guardianUserId === actor.id) ?? (connections.length === 1 ? connections[0] : undefined)
  const isChild = actor.id === child.id
  const isGuardian = Boolean(connection && actor.id === connection.guardianUserId)
  if (!isChild && !isGuardian) throw guardianConnectionAccessError('Only the child or named parent / guardian can remove this connection.')
  if (!connection) throw new Error(connections.length > 1 ? 'Choose which parent / guardian connection to remove.' : 'No parent / guardian connection is currently identified.')
  if (isGuardian && connection.guardianStatus !== 'accepted') throw new Error('Respond to the pending request instead of removing it.')
  setGuardianConnections(child, connections.filter((item) => item.guardianUserId !== connection.guardianUserId))
  return { ok: true, child }
  })
}

export async function createProfile(env, input) {
  return mutateSnapshot(env, async (snapshot) => {
  const name = clean(input.name, ''), type = clean(input.type, ''), country = clean(input.country, '')
  if (!name) throw new Error('Name is required.')
  if (!type) throw new Error('Contribution profile type is required.')
  if (!country) throw new Error('Country is required.')
  const profile = { id: id('profile'), name, type, country, ageGroup: clean(input.ageGroup, 'Unspecified'), description: clean(input.description, ''), connector: clean(input.connector, ''), createdByUserId: clean(input.createdByUserId, ''), createdAt: new Date().toISOString() }
  snapshot.profiles.push(profile)
  incrementProfileType(snapshot, type); incrementCountryPeople(snapshot, country)
  return profile
  })
}

export async function updateContributionProfile(env, input) {
  return mutateSnapshot(env, async (snapshot) => {
  const profile = snapshot.profiles.find((item) => item.id === input.id)
  if (!profile) throw new Error('Contribution profile not found.')
  if (!profile.createdByUserId || profile.createdByUserId !== input.userId) throw new Error('Only the creator can modify this contribution profile.')
  profile.name = clean(input.name, ''); profile.type = clean(input.type, ''); profile.country = clean(input.country, ''); profile.description = clean(input.description, ''); profile.updatedAt = new Date().toISOString()
  if (!profile.name) throw new Error('Name is required.')
  if (!profile.type) throw new Error('Contribution profile type is required.')
  if (!profile.country) throw new Error('Country is required.')
  return { ok: true, profile }
  })
}

export async function createContribution(env, input) {
  return mutateSnapshot(env, async (snapshot) => {
  const contribution = buildContribution(input)
  if (input.isAnonymous) {
    contribution.isAnonymous = true
    contribution.anonymousAlias = clean(input.anonymousAlias, stableAnonymousAlias(snapshot, contribution.contributorUserId))
  }
  applyContribution(snapshot, contribution)
  return contribution
  })
}

export async function createClaims(env, input) {
  return mutateSnapshot(env, async (snapshot) => {
  if (!Array.isArray(snapshot.claims)) snapshot.claims = []
  const actor = snapshot.users.find((item) => item.id === input.actorUserId)
  if (!actor) throw new Error('Claiming user not found.')
  const action = clean(input.action, '')
  if (!['claimed', 'recycled'].includes(action)) throw new Error('Claim action must be claimed or recycled.')
  const amount = roundMoney(Math.max(0, Number(input.amount) || 0))
  if (amount <= 0) throw new Error('Claim amount must be greater than zero.')
  const targetUserIds = Array.isArray(input.targetUserIds) ? input.targetUserIds.map(String) : []
  if (targetUserIds.length === 0) throw new Error('At least one claim target is required.')
  const requestedDestinationIds = action === 'recycled' && Array.isArray(input.recycleDestinations)
    ? [...new Set(input.recycleDestinations.map((destination) => clean(destination?.profileId, '')).filter(Boolean))]
    : []
  const requestedDestinationProfiles = requestedDestinationIds.map((profileId) => snapshot.profiles.find((profile) => profile.id === profileId))
  if (requestedDestinationProfiles.some((profile) => !profile)) throw new Error('Selected recycled-benefit recipient was not found.')
  const now = new Date().toISOString()
  const claims = [], contributions = []
  for (const targetUserId of targetUserIds) {
    const targetUser = snapshot.users.find((item) => item.id === targetUserId)
    if (!targetUser) throw new Error('Claim target not found.')
    const isSelf = targetUser.id === actor.id
    const isDependent = isAcceptedGuardianConnection(targetUser, actor)
    if (!isSelf && !isDependent) throw new Error('Claim target is not linked to this account.')
    const claim = {
      id: id('claim'), actorUserId: actor.id, userId: targetUser.id, profileId: clean(targetUser.profileId, 'unknown-profile'),
      targetName: targetUser.username, action, amount, country: clean(targetUser.country, 'Unspecified'), ageGroup: clean(targetUser.ageGroup, 'Unspecified'),
      deliveryMethod: clean(input.deliveryMethod, action === 'recycled' ? 'Recycled into Humanity Fund' : 'Prototype claim delivery'),
      denomination: clean(input.denomination, ''), simulation: true,
      recordKind: action === 'recycled' ? 'recycled-benefit' : 'claimed-benefit', createdAt: now,
    }
    snapshot.claims.push(claim); claims.push(claim)
    if (action === 'recycled') {
      const allocationMode = clean(input.allocationMode, 'humanity')
      const defaultDestination = snapshot.profiles.find((profile) => profile.id === claim.profileId)
      const destinations = requestedDestinationProfiles.length > 0 ? requestedDestinationProfiles : defaultDestination ? [defaultDestination] : []
      if (destinations.length === 0) throw new Error('A recycled benefit needs a valid contribution recipient.')
      const destinationAmounts = splitMoneyEqually(amount, destinations.length)
      destinations.forEach((destination, destinationIndex) => {
        const contribution = buildContribution({
          profileId: destination.id, recognitionName: destination.name, amount: destinationAmounts[destinationIndex],
          allocationMode, paymentMethod: 'Recycled claim benefit', stewardshipTip: 0, actorUserId: actor.id,
          contributorUserId: targetUser.id, contributedByName: targetUser.username, country: destination.country,
          ageGroup: destination.ageGroup, createdAt: now, sourceClaimId: claim.id,
          isAnonymous: Boolean(input.isAnonymous),
          anonymousAlias: input.isAnonymous ? stableAnonymousAlias(snapshot, targetUser.id) : '',
        })
        applyContribution(snapshot, contribution)
        contributions.push(contribution)
      })
    }
  }
  return { ok: true, claims, contributions }
  })
}

function buildContribution(input) {
  const amount = Math.max(0, Number(input.amount) || 0)
  const stewardshipTip = Math.max(0, Number(input.stewardshipTip) || 0)
  const split = splitContribution(amount, input.allocationMode, stewardshipTip)
  return {
    id: id('contribution'), profileId: clean(input.profileId, 'unknown-profile'), recognitionName: clean(input.recognitionName, 'Anonymous'),
    amount: roundMoney(amount + stewardshipTip), contributionAmount: amount, allocationMode: clean(input.allocationMode, 'humanity'),
    paymentMethod: clean(input.paymentMethod, 'Prototype payment'), stewardshipTip,
    actorUserId: clean(input.actorUserId, clean(input.contributorUserId, '')),
    contributorUserId: clean(input.contributorUserId, ''), contributedByName: clean(input.contributedByName, ''),
    country: clean(input.country, 'Unspecified'), ageGroup: clean(input.ageGroup, 'Unspecified'),
    sourceClaimId: clean(input.sourceClaimId, ''),
    recognitionContext: clean(input.recognitionContext, input.sourceClaimId ? 'recycled-benefit' : 'self'),
    recordKind: clean(input.recordKind, input.sourceClaimId ? 'recycled-benefit' : 'contribution'),
    simulation: true, isAnonymous: Boolean(input.isAnonymous), anonymousAlias: clean(input.anonymousAlias, ''),
    ...split, createdAt: clean(input.createdAt, new Date().toISOString()),
  }
}

function applyContribution(snapshot, contribution) {
  snapshot.contributions.push(contribution)
}

function splitMoneyEqually(amount, recipientCount) {
  const safeRecipientCount = Math.max(0, Math.floor(Number(recipientCount) || 0))
  if (safeRecipientCount === 0) return []
  const totalCents = Math.max(0, Math.round((Number(amount) || 0) * 100))
  const baseCents = Math.floor(totalCents / safeRecipientCount)
  const remainderCents = totalCents % safeRecipientCount
  return Array.from({ length: safeRecipientCount }, (_, index) => (baseCents + (index < remainderCents ? 1 : 0)) / 100)
}

function stableAnonymousAlias(snapshot, contributorUserId) {
  const existing = (snapshot.contributions ?? []).filter((item) => item.isAnonymous && item.contributorUserId === contributorUserId && item.anonymousAlias).sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))[0]
  if (existing?.anonymousAlias) return existing.anonymousAlias
  const maxAlias = (snapshot.contributions ?? []).map((item) => /^Anonymous (\d+)$/.exec(item.anonymousAlias ?? '')).filter(Boolean).map((match) => Number(match[1])).reduce((max, value) => Math.max(max, value), 0)
  return `Anonymous ${maxAlias + 1}`
}

export function normalizeGuardianConnections(snapshot) {
  let changed = false
  const users = Array.isArray(snapshot.users) ? snapshot.users : []
  const now = new Date().toISOString()
  for (const user of users) {
    if (Array.isArray(user.guardianConnections)) {
      const before = JSON.stringify(user.guardianConnections)
      const connections = []
      const seenGuardianIds = new Set()
      for (const rawConnection of user.guardianConnections) {
        const guardianUserId = String(rawConnection?.guardianUserId ?? '').trim()
        const guardianUsername = String(rawConnection?.guardianUsername ?? '').trim()
        const guardian = guardianUserId ? users.find((candidate) => candidate.id === guardianUserId) : guardianUsername ? users.find((candidate) => candidate.username.toLowerCase() === guardianUsername.toLowerCase()) : undefined
        if (!guardian || guardian.id === user.id || seenGuardianIds.has(guardian.id)) continue
        seenGuardianIds.add(guardian.id)
        const guardianStatus = ['pending', 'accepted', 'declined'].includes(rawConnection?.guardianStatus) ? rawConnection.guardianStatus : 'pending'
        const guardianRequestedAt = String(rawConnection?.guardianRequestedAt ?? '').trim() || user.createdAt || now
        const guardianRespondedAt = guardianStatus === 'pending' ? '' : String(rawConnection?.guardianRespondedAt ?? '').trim() || guardianRequestedAt
        connections.push({ guardianUserId: guardian.id, guardianUsername: guardian.username, guardianStatus, guardianRequestedAt, guardianRespondedAt })
        if (connections.length === MAX_DIRECT_GUARDIAN_CONNECTIONS) break
      }
      setGuardianConnections(user, connections)
      if (before !== JSON.stringify(user.guardianConnections)) changed = true
      continue
    }
    const guardianUserId = String(user.guardianUserId ?? '').trim()
    const guardianUsername = String(user.guardianUsername ?? '').trim()
    const guardian = guardianUserId ? users.find((candidate) => candidate.id === guardianUserId) : guardianUsername ? users.find((candidate) => candidate.username.toLowerCase() === guardianUsername.toLowerCase()) : undefined
    if (!guardian || guardian.id === user.id) {
      if (guardianUserId || guardianUsername || user.guardianStatus || user.guardianRequestedAt || user.guardianRespondedAt) {
        user.guardianUserId = ''; user.guardianUsername = ''; user.guardianStatus = ''; user.guardianRequestedAt = ''; user.guardianRespondedAt = ''
        changed = true
      }
      continue
    }
    const status = ['pending', 'accepted', 'declined'].includes(user.guardianStatus) ? user.guardianStatus : 'pending'
    setGuardianConnections(user, [{ guardianUserId: guardian.id, guardianUsername: guardian.username, guardianStatus: status, guardianRequestedAt: user.guardianRequestedAt || user.createdAt || now, guardianRespondedAt: status === 'pending' ? '' : (user.guardianRespondedAt || user.guardianRequestedAt || now) }])
    changed = true
  }
  const acceptedGuardianIds = new Set()
  for (const child of users) {
    for (const connection of getGuardianConnections(child)) {
      if (connection.guardianStatus === 'accepted') acceptedGuardianIds.add(connection.guardianUserId)
    }
  }
  for (const guardian of users) {
    if (!acceptedGuardianIds.has(guardian.id)) continue
    const connections = getGuardianConnections(guardian)
    if (!connections.some((connection) => connection.guardianStatus === 'pending' || connection.guardianStatus === 'accepted')) continue
    setGuardianConnections(guardian, connections.filter((connection) => connection.guardianStatus === 'declined'))
    changed = true
  }
  if (changed) snapshot.version = Math.max(Number(snapshot.version) || 1, 2)
  return changed
}

export function getGuardianConnections(user) {
  const source = Array.isArray(user?.guardianConnections)
    ? user.guardianConnections
    : user?.guardianUserId
      ? [{ guardianUserId: user.guardianUserId, guardianUsername: user.guardianUsername, guardianStatus: user.guardianStatus, guardianRequestedAt: user.guardianRequestedAt, guardianRespondedAt: user.guardianRespondedAt }]
      : []
  const seenGuardianIds = new Set()
  return source.flatMap((rawConnection) => {
    const guardianUserId = String(rawConnection?.guardianUserId ?? '').trim()
    if (!guardianUserId || seenGuardianIds.has(guardianUserId)) return []
    seenGuardianIds.add(guardianUserId)
    const guardianStatus = ['pending', 'accepted', 'declined'].includes(rawConnection?.guardianStatus) ? rawConnection.guardianStatus : 'pending'
    return [{ guardianUserId, guardianUsername: String(rawConnection?.guardianUsername ?? '').trim(), guardianStatus, guardianRequestedAt: String(rawConnection?.guardianRequestedAt ?? '').trim(), guardianRespondedAt: guardianStatus === 'pending' ? '' : String(rawConnection?.guardianRespondedAt ?? '').trim() }]
  }).slice(0, MAX_DIRECT_GUARDIAN_CONNECTIONS)
}

function setGuardianConnections(user, connections) {
  const normalized = []
  const seenGuardianIds = new Set()
  for (const connection of connections) {
    const guardianUserId = String(connection?.guardianUserId ?? '').trim()
    if (!guardianUserId || seenGuardianIds.has(guardianUserId)) continue
    seenGuardianIds.add(guardianUserId)
    const guardianStatus = ['pending', 'accepted', 'declined'].includes(connection?.guardianStatus) ? connection.guardianStatus : 'pending'
    normalized.push({ guardianUserId, guardianUsername: String(connection?.guardianUsername ?? '').trim(), guardianStatus, guardianRequestedAt: String(connection?.guardianRequestedAt ?? '').trim(), guardianRespondedAt: guardianStatus === 'pending' ? '' : String(connection?.guardianRespondedAt ?? '').trim() })
    if (normalized.length === MAX_DIRECT_GUARDIAN_CONNECTIONS) break
  }
  user.guardianConnections = normalized
  const [primary] = normalized
  user.guardianUserId = primary?.guardianUserId ?? ''
  user.guardianUsername = primary?.guardianUsername ?? ''
  user.guardianStatus = primary?.guardianStatus ?? ''
  user.guardianRequestedAt = primary?.guardianRequestedAt ?? ''
  user.guardianRespondedAt = primary?.guardianRespondedAt ?? ''
}

function isAcceptedGuardianConnection(child, guardian) {
  return getGuardianConnections(child).some((connection) => connection.guardianUserId === guardian.id && connection.guardianStatus === 'accepted')
}
function hasAcceptedChildConnection(snapshot, guardianUserId) {
  return snapshot.users.some((user) => getGuardianConnections(user).some((connection) => connection.guardianUserId === guardianUserId && connection.guardianStatus === 'accepted'))
}
function assertGuardianHasChildWardCapacity(snapshot, guardianUserId) {
  const activeWardCount = snapshot.users.filter((user) => getGuardianConnections(user).some((connection) => connection.guardianUserId === guardianUserId && (connection.guardianStatus === 'pending' || connection.guardianStatus === 'accepted'))).length
  if (activeWardCount >= MAX_ACTIVE_CHILD_WARD_CONNECTIONS) throw new Error(`This parent / guardian already has the maximum of ${MAX_ACTIVE_CHILD_WARD_CONNECTIONS} active child / ward connections.`)
}
function hasActiveGuardianConnection(user) {
  return getGuardianConnections(user).some((connection) => connection.guardianStatus === 'pending' || connection.guardianStatus === 'accepted')
}
function getClaimPathway(user) {
  return hasActiveGuardianConnection(user) ? 'parent-guardian-must-claim' : 'claim-for-self'
}
function syncVerifiedClaimPathways(snapshot) {
  let changed = false
  const profilesById = new Map((snapshot.profiles ?? []).map((profile) => [profile.id, profile]))
  for (const user of snapshot.users ?? []) {
    if (!user.verifiedHumanAt) continue
    const claimPathway = getClaimPathway(user)
    if (user.verificationStatus !== claimPathway) { user.verificationStatus = claimPathway; changed = true }
    const profile = profilesById.get(user.profileId)
    if (profile && profile.verificationStatus !== claimPathway) { profile.verificationStatus = claimPathway; changed = true }
  }
  return changed
}
function guardianConnectionAccessError(message) {
  const error = new Error(message)
  error.statusCode = 403
  return error
}
function rewriteUsername(snapshot, oldUsername, nextUsername, userId) {
  for (const item of snapshot.users) {
    if (item.connector === oldUsername) item.connector = nextUsername
    if (item.guardianUsername === oldUsername) item.guardianUsername = nextUsername
    if (Array.isArray(item.guardianConnections)) {
      let changed = false
      for (const connection of item.guardianConnections) {
        if (connection.guardianUserId === userId && connection.guardianUsername === oldUsername) { connection.guardianUsername = nextUsername; changed = true }
      }
      if (changed) setGuardianConnections(item, item.guardianConnections)
    }
  }
  for (const item of snapshot.profiles) if (item.connector === oldUsername) item.connector = nextUsername
  for (const claim of snapshot.claims ?? []) if (claim.userId === userId) claim.targetName = nextUsername
}
function isUsernameTaken(snapshot, username, exceptUserId = '') {
  const normalized = String(username).trim().toLowerCase()
  return snapshot.users.some((user) => user.id !== exceptUserId && user.username.toLowerCase() === normalized)
}
export function validatePassword(password) {
  const issues = []
  if (!String(password)) return issues
  if (String(password).length < 8) issues.push('Use at least 8 characters.')
  if (!/[A-Z]/.test(String(password))) issues.push('Use at least one capital letter.')
  if (!/[0-9]/.test(String(password))) issues.push('Use at least one number.')
  if (!/[^A-Za-z0-9]/.test(String(password))) issues.push('Use at least one special character.')
  return issues
}
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256)
  return `pbkdf2:${hex(salt)}:${hex(new Uint8Array(bits))}`
}
async function verifyPassword(password, user) {
  if (user.passwordHash?.startsWith('pbkdf2:')) {
    const [, saltHex, stored] = user.passwordHash.split(':')
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password)), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromHex(saltHex), iterations: 100000, hash: 'SHA-256' }, key, 256)
    return hex(new Uint8Array(bits)) === stored
  }
  return user.password === password
}
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
