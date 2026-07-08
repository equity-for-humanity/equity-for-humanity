import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export function createSeedData() {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    users: [
      { id: 'user-david-brown', username: 'David Brown', password: 'Test123#', country: 'Canada', ageGroup: '36–50', connector: 'Phillip Chen', profileId: 'seed-profile-canada', verifiedHumanAt: '2026-06-30T00:00:00.000Z', verificationMethod: 'government-id-liveness', verificationStatus: '16_plus' },
      { id: 'user-anisa-brown', username: 'Anisa Brown', password: 'Test123#', country: 'Canada', ageGroup: '11–15', connector: 'David Brown', profileId: 'seed-profile-child', guardianUsername: 'David Brown', verifiedHumanAt: '2026-06-30T00:00:00.000Z', verificationMethod: 'government-id-liveness', verificationStatus: '0_15' },
      { id: 'user-phillip-chen', username: 'Phillip Chen', password: 'Test123#', country: 'Canada', ageGroup: '26–30', connector: 'Amina Okafor', profileId: 'user-profile-phillip' },
      { id: 'user-amina-okafor', username: 'Amina Okafor', password: 'Test123#', country: 'Nigeria', ageGroup: '21–25', connector: 'Priya Shah', profileId: 'user-profile-amina' },
      { id: 'user-priya-shah', username: 'Priya Shah', password: 'Test123#', country: 'India', ageGroup: '26–30', connector: 'David Brown', profileId: 'user-profile-priya' },
      { id: 'user-lucas-silva', username: 'Lucas Silva', password: 'Test123#', country: 'Brazil', ageGroup: '21–25', connector: 'Leila Haddad', profileId: 'user-profile-lucas' },
      { id: 'user-maryam-hassan', username: 'Maryam Hassan', password: 'Test123#', country: 'Egypt', ageGroup: '36–40', connector: 'Amina Okafor', profileId: 'user-profile-maryam' },
      { id: 'user-elon-musk', username: 'Elon Musk', password: 'Test123#', country: 'United States', ageGroup: '51–55', connector: 'Sam Altman', profileId: 'user-profile-elon' },
      { id: 'user-greta-thunberg', username: 'Greta Thunberg', password: 'Test123#', country: 'Sweden', ageGroup: '21–25', connector: 'Malala Yousafzai', profileId: 'user-profile-greta' },
      { id: 'user-leila-haddad', username: 'Leila Haddad', password: 'Test123#', country: 'Lebanon', ageGroup: '36–40', connector: 'Maryam Hassan', profileId: 'user-profile-leila' },
      { id: 'user-sam-altman', username: 'Sam Altman', password: 'Test123#', country: 'United States', ageGroup: '36–40', connector: 'Elon Musk', profileId: 'user-profile-sam' },
      { id: 'user-malala-yousafzai', username: 'Malala Yousafzai', password: 'Test123#', country: 'Pakistan', ageGroup: '26–30', connector: 'Greta Thunberg', profileId: 'user-profile-malala' },
      { id: 'user-ai-agent', username: 'AI agent', password: 'Test123#', country: 'Digital', ageGroup: 'AI agent', connector: 'David Brown', profileId: 'user-profile-ai-agent' },
    ],
    profiles: [
      {
        id: 'seed-profile-canada',
        name: 'David Brown',
        type: 'Individual',
        country: 'Canada',
        ageGroup: '36–50',
        description: 'Individual participant profile for prototype testing.',
        connector: 'Phillip Chen',
        createdAt: '2026-06-01T00:00:00.000Z',
      },
      {
        id: 'seed-profile-faith',
        name: 'St. Mark’s Community Fund',
        type: 'Faith group',
        country: 'Canada',
        ageGroup: '51+',
        description: 'Ottawa faith community profile for members who want their recognition grouped together.',
        connector: 'Amina Okafor',
        createdAt: '2026-06-02T00:00:00.000Z',
      },
      {
        id: 'seed-profile-memory',
        name: 'Mary Brown Memorial Grove',
        type: 'In memory of',
        country: 'United Kingdom',
        ageGroup: '51+',
        description: 'A family memorial profile for contributions made in Mary’s memory.',
        connector: 'Leila Haddad',
        createdAt: '2026-06-03T00:00:00.000Z',
      },
      {
        id: 'seed-profile-child',
        name: 'Guardian-managed child profile',
        type: 'Child under 16',
        country: 'Nigeria',
        ageGroup: '0–5',
        description: 'Sample child participant profile managed by a parent or guardian until age 16.',
        connector: 'David Brown',
        createdAt: '2026-06-04T00:00:00.000Z',
      },
      {
        id: 'seed-profile-org-ai-lab',
        name: 'Open Horizon AI Lab',
        type: 'Organization',
        country: 'United States',
        ageGroup: '36–50',
        description: 'Prototype organization profile for AI workers contributing toward shared ownership.',
        connector: 'Sam Altman',
        createdAt: '2026-06-04T00:00:00.000Z',
      },
      {
        id: 'seed-profile-honour-teacher',
        name: 'In Honour of Ms. Elena Rivera',
        type: 'In honour of',
        country: 'Brazil',
        ageGroup: '51+',
        description: 'A tribute profile for a teacher recognized by former students.',
        connector: 'Lucas Silva',
        createdAt: '2026-06-04T00:00:00.000Z',
      },
      {
        id: 'seed-profile-community-garden',
        name: 'Kibera Community Garden Circle',
        type: 'Community group',
        country: 'Kenya',
        ageGroup: '26–35',
        description: 'Community profile for neighbours coordinating recognition together.',
        connector: 'Amina Okafor',
        createdAt: '2026-06-04T00:00:00.000Z',
      },

      { id: 'user-profile-phillip', name: 'Phillip Chen', type: 'Individual', country: 'Canada', ageGroup: '26–30', description: 'Connector profile for prototype login and contribution history.', connector: 'Amina Okafor', createdAt: '2026-06-04T00:00:00.000Z' },
      { id: 'user-profile-amina', name: 'Amina Okafor', type: 'Individual', country: 'Nigeria', ageGroup: '21–25', description: 'Connector profile with sample contribution and claim history.', connector: 'Priya Shah', createdAt: '2026-06-04T00:00:00.000Z' },
      { id: 'user-profile-priya', name: 'Priya Shah', type: 'Individual', country: 'India', ageGroup: '26–30', description: 'Participant and connector profile for prototype search.', connector: 'David Brown', createdAt: '2026-06-04T00:00:00.000Z' },
      { id: 'user-profile-ai-agent', name: 'AI agent', type: 'Individual', country: 'Digital', ageGroup: 'AI agent', description: 'Prototype non-human agent account category for testing.', connector: 'David Brown', createdAt: '2026-06-04T00:00:00.000Z' },
    ],
    contributions: [
      seedContribution('seed-contribution-1', 'seed-profile-canada', 'David Brown', 1200, 'humanity', 'Credit card via Stripe', 0, 'Canada', '36–50'),
      seedContribution('seed-contribution-2', 'seed-profile-faith', 'St. Mark’s Community Fund', 10000, 'hybrid99', 'PayPal', 100, 'Canada', '51+'),
      seedContribution('seed-contribution-3', 'seed-profile-memory', 'Mary Brown Memorial Grove', 5000, 'humanity', 'Bank transfer', 0, 'United Kingdom', '51+'),
      seedContribution('seed-contribution-4', 'seed-profile-child', 'Anonymous', 250, 'humanity', 'Credit card via Stripe', 0, 'Nigeria', '0–5'),
      seedContribution('seed-contribution-5', 'seed-profile-canada', 'Prototype participant', 725, 'stewardship', 'PayPal', 0, 'Brazil', '21–25'),
    ],
    claims: [
      { id: 'seed-claim-1', profileId: 'seed-profile-canada', action: 'recycled', amount: 80, country: 'Canada', ageGroup: '36–50', createdAt: '2026-06-05T00:00:00.000Z' },
      { id: 'seed-claim-2', profileId: 'seed-profile-canada', action: 'claimed', amount: 120, country: 'Canada', ageGroup: '36–50', createdAt: '2026-06-06T00:00:00.000Z' },
    ],
    connectorRipples: [
      { connector: 'Phillip Chen', direct: 12, secondDegree: 86, ripple: 412 },
      { connector: 'Amina Okafor', direct: 42, secondDegree: 340, ripple: 1820 },
    ],
    countries: [
      { country: 'Canada', people: 74000, contributions: 11800000, connectors: 9000, claimants: 16000 },
      { country: 'United States', people: 86000, contributions: 15000000, connectors: 9700, claimants: 17800 },
      { country: 'India', people: 98000, contributions: 18200000, connectors: 10400, claimants: 19600 },
      { country: 'Nigeria', people: 110000, contributions: 21400000, connectors: 11100, claimants: 21400 },
      { country: 'Brazil', people: 122000, contributions: 24600000, connectors: 11800, claimants: 23200 },
      { country: 'United Kingdom', people: 134000, contributions: 27800000, connectors: 12500, claimants: 25000 },
      { country: 'Pakistan', people: 146000, contributions: 31000000, connectors: 13200, claimants: 26800 },
      { country: 'Sweden', people: 158000, contributions: 34200000, connectors: 13900, claimants: 28600 },
      { country: 'Lebanon', people: 170000, contributions: 37400000, connectors: 14600, claimants: 30400 },
      { country: 'Egypt', people: 182000, contributions: 40600000, connectors: 15300, claimants: 32200 },
      { country: 'Kenya', people: 194000, contributions: 43800000, connectors: 16000, claimants: 34000 },
      { country: 'France', people: 206000, contributions: 47000000, connectors: 16700, claimants: 35800 },
      { country: 'Germany', people: 218000, contributions: 50200000, connectors: 17400, claimants: 37600 },
      { country: 'Japan', people: 230000, contributions: 53400000, connectors: 18100, claimants: 39400 },
      { country: 'Mexico', people: 242000, contributions: 56600000, connectors: 18800, claimants: 41200 },
      { country: 'Australia', people: 254000, contributions: 59800000, connectors: 19500, claimants: 43000 },
      { country: 'South Africa', people: 266000, contributions: 63000000, connectors: 20200, claimants: 44800 },
      { country: 'Digital', people: 278000, contributions: 66200000, connectors: 20900, claimants: 46600 },
    ],
    ageGroups: [
      { group: '0–5', people: 32000 },
      { group: '6–10', people: 39000 },
      { group: '11–15', people: 46000 },
      { group: '16–20', people: 53000 },
      { group: '21–25', people: 60000 },
      { group: '26–30', people: 67000 },
      { group: '31–35', people: 74000 },
      { group: '36–40', people: 81000 },
      { group: '41–45', people: 88000 },
      { group: '46–50', people: 95000 },
      { group: '51–55', people: 102000 },
      { group: '56–60', people: 109000 },
      { group: '61–65', people: 116000 },
      { group: '66–70', people: 123000 },
      { group: '71–75', people: 130000 },
      { group: '76–80', people: 137000 },
      { group: '81–85', people: 144000 },
      { group: '86–90', people: 151000 },
      { group: '91–95', people: 158000 },
      { group: '96–100', people: 165000 },
      { group: '101+', people: 172000 },
      { group: 'AI agent', people: 179000 },
    ],
    profileTypes: [
      { type: 'Individuals', count: 820000 },
      { type: 'Children / guardian-linked', count: 94000 },
      { type: 'Faith groups', count: 3200 },
      { type: 'Organizations', count: 1800 },
      { type: 'In memory / in honour', count: 12600 },
    ],
    funds: {
      humanityFundContributions: 711_800_000,
      stewardshipContributions: 13_200_000,
      totalContributions: 725_000_000,
      currentEndowment: 812_400_000,
      cumulativeParticipantBenefits: 18_600_000,
      recycledBenefits: 7_450_000,
      verifiedReach: 1_240_000,
      connectorReach: 186_000,
      averageGrowth: 0.1,
      activeClaimants: 420_000,
      recycleRate: 0.28,
    },
  }
}

function seedContribution(id, profileId, recognitionName, amount, allocationMode, paymentMethod, stewardshipTip, country, ageGroup) {
  const split = splitContribution(amount, allocationMode, stewardshipTip)
  return {
    id,
    profileId,
    recognitionName,
    amount,
    allocationMode,
    paymentMethod,
    stewardshipTip,
    country,
    ageGroup,
    ...split,
    createdAt: '2026-06-05T00:00:00.000Z',
  }
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

export async function loadSnapshot(dataPath) {
  await ensureDataFile(dataPath)
  const raw = await readFile(dataPath, 'utf8')
  return JSON.parse(raw)
}

export async function saveSnapshot(dataPath, snapshot) {
  await mkdir(dirname(dataPath), { recursive: true })
  snapshot.updatedAt = new Date().toISOString()
  await writeFile(dataPath, `${JSON.stringify(snapshot, null, 2)}\n`)
  return snapshot
}

export async function ensureDataFile(dataPath) {
  try {
    await readFile(dataPath, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    await saveSnapshot(dataPath, createSeedData())
  }
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

export async function createUser(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const username = clean(input.username, '')
  const password = clean(input.password, 'Test123#')
  const repeatPassword = clean(input.repeatPassword, password)
  if (!username) throw new Error('Username is required.')
  if (isUsernameTaken(snapshot, username)) throw new Error('Username already exists. Please choose a different username.')
  if (password !== repeatPassword) throw new Error('Passwords must match.')
  const passwordIssues = validatePassword(password)
  if (passwordIssues.length > 0) throw new Error(passwordIssues.join(' '))
  const profileId = `profile-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  const user = {
    id: `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    username,
    password,
    country: clean(input.country, 'Unspecified'),
    ageGroup: clean(input.ageGroup, 'Unspecified'),
    connector: clean(input.connector, ''),
    guardianUsername: clean(input.guardianUsername, ''),
    profileId,
    createdAt: new Date().toISOString(),
  }
  const profile = {
    id: profileId,
    name: username,
    type: 'Individual',
    country: user.country,
    ageGroup: user.ageGroup,
    description: 'Individual account profile created in the local prototype.',
    connector: user.connector,
    createdAt: user.createdAt,
  }
  snapshot.users.push(user)
  snapshot.profiles.push(profile)
  incrementProfileType(snapshot, 'Individuals')
  incrementCountryPeople(snapshot, user.country)
  incrementAgeGroup(snapshot, user.ageGroup)
  await saveSnapshot(dataPath, snapshot)
  return user
}

export async function loginUser(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const username = clean(input.username, '')
  const password = clean(input.password, '')
  const user = snapshot.users.find((item) => item.username.toLowerCase() === username.toLowerCase() && item.password === password)
  if (!user) return { ok: false, error: 'Invalid username or password.' }
  const profile = snapshot.profiles.find((item) => item.id === user.profileId || item.name === user.username)
  const contributions = snapshot.contributions.filter((item) => item.contributorUserId === user.id || item.profileId === user.profileId || item.recognitionName === user.username)
  const claims = snapshot.claims.filter((item) => item.profileId === user.profileId)
  return { ok: true, user, profile, contributions, claims }
}

export async function updateUserProfile(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const user = snapshot.users.find((item) => item.id === input.id)
  if (!user) throw new Error('User not found.')
  const oldUsername = user.username

  if (typeof input.username === 'string') {
    const nextUsername = input.username.trim()
    if (!nextUsername) throw new Error('Username is required.')
    const usernameTaken = isUsernameTaken(snapshot, nextUsername, user.id)
    if (usernameTaken) throw new Error('Username already exists. Please choose a different username.')
    user.username = nextUsername
  }

  if (typeof input.password === 'string' && input.password.trim()) {
    const password = input.password.trim()
    const passwordIssues = validatePassword(password)
    if (passwordIssues.length > 0) throw new Error(passwordIssues.join(' '))
    user.password = password
  }

  user.country = clean(input.country, user.country)
  user.ageGroup = clean(input.ageGroup, user.ageGroup)
  if (typeof input.connector === 'string') user.connector = input.connector.trim()
  if (typeof input.guardianUsername === 'string') user.guardianUsername = input.guardianUsername.trim()

  if (oldUsername !== user.username) {
    for (const item of snapshot.users) {
      if (item.connector === oldUsername) item.connector = user.username
      if (item.guardianUsername === oldUsername) item.guardianUsername = user.username
    }
    for (const item of snapshot.profiles) {
      if (item.connector === oldUsername) item.connector = user.username
    }
    for (const claim of snapshot.claims ?? []) {
      if (claim.userId === user.id) claim.targetName = user.username
    }
  }

  const profile = snapshot.profiles.find((item) => item.id === user.profileId || item.name === oldUsername)
  if (profile) {
    if (profile.name === oldUsername || profile.id === user.profileId) profile.name = user.username
    profile.country = user.country
    profile.ageGroup = user.ageGroup
    profile.connector = user.connector
  }

  await saveSnapshot(dataPath, snapshot)
  return { ok: true, user, profile }
}


export async function updateUserVerification(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const user = snapshot.users.find((item) => item.id === input.id)
  if (!user) throw new Error('User not found.')

  user.verifiedHumanAt = new Date().toISOString()
  user.verificationMethod = clean(input.verificationMethod, 'government-id-liveness')
  user.verificationStatus = clean(input.verificationStatus, '16_plus')
  if (typeof input.guardianUsername === 'string') user.guardianUsername = input.guardianUsername.trim()

  const profile = snapshot.profiles.find((item) => item.id === user.profileId || item.name === user.username)
  if (profile) {
    profile.verificationStatus = user.verificationStatus
    profile.guardianUsername = user.guardianUsername || ''
  }

  await saveSnapshot(dataPath, snapshot)
  return { ok: true, user, profile }
}

export async function createProfile(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const name = clean(input.name, '')
  const type = clean(input.type, '')
  const country = clean(input.country, '')
  if (!name) throw new Error('Name is required.')
  if (!type) throw new Error('Contribution profile type is required.')
  if (!country) throw new Error('Country is required.')
  const profile = {
    id: `profile-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name,
    type,
    country,
    ageGroup: clean(input.ageGroup, 'Unspecified'),
    description: clean(input.description, ''),
    connector: clean(input.connector, ''),
    createdByUserId: clean(input.createdByUserId, ''),
    createdAt: new Date().toISOString(),
  }
  snapshot.profiles.push(profile)
  incrementProfileType(snapshot, profile.type)
  incrementCountryPeople(snapshot, profile.country)
  await saveSnapshot(dataPath, snapshot)
  return profile
}

export async function updateContributionProfile(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const profile = snapshot.profiles.find((item) => item.id === input.id)
  if (!profile) throw new Error('Contribution profile not found.')
  if (!profile.createdByUserId || profile.createdByUserId !== input.userId) throw new Error('Only the creator can modify this contribution profile.')
  const name = clean(input.name, '')
  const type = clean(input.type, '')
  const country = clean(input.country, '')
  if (!name) throw new Error('Name is required.')
  if (!type) throw new Error('Contribution profile type is required.')
  if (!country) throw new Error('Country is required.')
  profile.name = name
  profile.type = type
  profile.country = country
  profile.description = clean(input.description, '')
  profile.updatedAt = new Date().toISOString()
  await saveSnapshot(dataPath, snapshot)
  return { ok: true, profile }
}

export async function createContribution(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const contribution = buildContribution(input)
  if (input.isAnonymous) {
    contribution.isAnonymous = true
    contribution.anonymousAlias = clean(input.anonymousAlias, stableAnonymousAlias(snapshot, contribution.contributorUserId))
  }
  applyContribution(snapshot, contribution)
  await saveSnapshot(dataPath, snapshot)
  return contribution
}

export async function createClaims(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  if (!Array.isArray(snapshot.claims)) snapshot.claims = []
  const actor = snapshot.users.find((item) => item.id === input.actorUserId)
  if (!actor) throw new Error('Claiming user not found.')

  const action = clean(input.action, '')
  if (!['claimed', 'recycled'].includes(action)) throw new Error('Claim action must be claimed or recycled.')

  const amount = roundMoney(Math.max(0, Number(input.amount) || 0))
  if (amount <= 0) throw new Error('Claim amount must be greater than zero.')

  const targetUserIds = Array.isArray(input.targetUserIds) ? input.targetUserIds.map(String) : []
  if (targetUserIds.length === 0) throw new Error('At least one claim target is required.')

  const now = new Date().toISOString()
  const claims = []
  const contributions = []
  for (const targetUserId of targetUserIds) {
    const targetUser = snapshot.users.find((item) => item.id === targetUserId)
    if (!targetUser) throw new Error('Claim target not found.')
    const isSelf = targetUser.id === actor.id
    const isDependent = targetUser.guardianUsername === actor.username || (!targetUser.guardianUsername && targetUser.connector === actor.username && isChildAgeGroup(targetUser.ageGroup))
    if (!isSelf && !isDependent) throw new Error('Claim target is not linked to this account.')

    const claim = {
      id: `claim-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      actorUserId: actor.id,
      userId: targetUser.id,
      profileId: clean(targetUser.profileId, 'unknown-profile'),
      targetName: targetUser.username,
      action,
      amount,
      country: clean(targetUser.country, 'Unspecified'),
      ageGroup: clean(targetUser.ageGroup, 'Unspecified'),
      deliveryMethod: clean(input.deliveryMethod, action === 'recycled' ? 'Recycled into Humanity Fund' : 'Prototype claim delivery'),
      denomination: clean(input.denomination, ''),
      createdAt: now,
    }
    snapshot.claims.push(claim)
    claims.push(claim)

    if (action === 'recycled') {
      const allocationMode = clean(input.allocationMode, 'humanity')
      const contribution = buildContribution({
        profileId: claim.profileId,
        recognitionName: targetUser.username,
        amount,
        allocationMode,
        paymentMethod: 'Recycled claim benefit',
        stewardshipTip: 0,
        contributorUserId: targetUser.id,
        country: claim.country,
        ageGroup: claim.ageGroup,
        createdAt: now,
        sourceClaimId: claim.id,
        isAnonymous: Boolean(input.isAnonymous),
        anonymousAlias: input.isAnonymous ? stableAnonymousAlias(snapshot, targetUser.id) : '',
      })
      applyContribution(snapshot, contribution)
      contributions.push(contribution)
      snapshot.funds.recycledBenefits = roundMoney(snapshot.funds.recycledBenefits + amount)
    } else {
      snapshot.funds.cumulativeParticipantBenefits = roundMoney(snapshot.funds.cumulativeParticipantBenefits + amount)
      incrementCountryClaimant(snapshot, claim.country)
    }
  }

  await saveSnapshot(dataPath, snapshot)
  return { ok: true, claims, contributions }
}

function buildContribution(input) {
  const amount = Math.max(0, Number(input.amount) || 0)
  const stewardshipTip = Math.max(0, Number(input.stewardshipTip) || 0)
  const split = splitContribution(amount, input.allocationMode, stewardshipTip)
  return {
    id: `contribution-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    profileId: clean(input.profileId, 'unknown-profile'),
    recognitionName: clean(input.recognitionName, 'Anonymous'),
    amount,
    allocationMode: clean(input.allocationMode, 'humanity'),
    paymentMethod: clean(input.paymentMethod, 'Prototype payment'),
    stewardshipTip,
    contributorUserId: clean(input.contributorUserId, ''),
    country: clean(input.country, 'Unspecified'),
    ageGroup: clean(input.ageGroup, 'Unspecified'),
    sourceClaimId: clean(input.sourceClaimId, ''),
    isAnonymous: Boolean(input.isAnonymous),
    anonymousAlias: clean(input.anonymousAlias, ''),
    ...split,
    createdAt: clean(input.createdAt, new Date().toISOString()),
  }
}

function stableAnonymousAlias(snapshot, contributorUserId) {
  const existing = (snapshot.contributions ?? [])
    .filter((item) => item.isAnonymous && item.contributorUserId === contributorUserId && item.anonymousAlias)
    .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))[0]
  if (existing?.anonymousAlias) return existing.anonymousAlias
  return nextAnonymousAlias(snapshot)
}

function nextAnonymousAlias(snapshot) {
  const maxAlias = (snapshot.contributions ?? [])
    .map((item) => /^Anonymous (\d+)$/.exec(item.anonymousAlias ?? ''))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .reduce((max, value) => Math.max(max, value), 0)
  return `Anonymous ${maxAlias + 1}`
}

function applyContribution(snapshot, contribution) {
  snapshot.contributions.push(contribution)
  snapshot.funds.humanityFundContributions = roundMoney(snapshot.funds.humanityFundContributions + contribution.humanityFund)
  snapshot.funds.stewardshipContributions = roundMoney(snapshot.funds.stewardshipContributions + contribution.stewardshipReserve)
  snapshot.funds.totalContributions = roundMoney(snapshot.funds.humanityFundContributions + snapshot.funds.stewardshipContributions)
  snapshot.funds.currentEndowment = roundMoney(snapshot.funds.currentEndowment + contribution.humanityFund)
  incrementCountryContribution(snapshot, contribution.country, contribution.amount)
  incrementAgeGroup(snapshot, contribution.ageGroup)
}

function isUsernameTaken(snapshot, username, exceptUserId = '') {
  const normalized = String(username).trim().toLowerCase()
  return snapshot.users.some((user) => user.id !== exceptUserId && user.username.toLowerCase() === normalized)
}

function clean(value, fallback) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function roundMoney(value) {
  return Math.round(value * 100) / 100
}

function isChildAgeGroup(ageGroup) {
  return ['0–5', '6–10', '11–15'].includes(ageGroup)
}

function incrementCountryPeople(snapshot, country) {
  const row = getOrCreateCountry(snapshot, country)
  row.people += 1
}

function incrementCountryContribution(snapshot, country, amount) {
  const row = getOrCreateCountry(snapshot, country)
  row.contributions = roundMoney(row.contributions + amount)
}

function incrementCountryClaimant(snapshot, country) {
  const row = getOrCreateCountry(snapshot, country)
  row.claimants += 1
}

function getOrCreateCountry(snapshot, country) {
  let row = snapshot.countries.find((item) => item.country === country)
  if (!row) {
    row = { country, people: 0, contributions: 0, connectors: 0, claimants: 0 }
    snapshot.countries.push(row)
  }
  return row
}

function incrementAgeGroup(snapshot, group) {
  let row = snapshot.ageGroups.find((item) => item.group === group)
  if (!row) {
    row = { group, people: 0 }
    snapshot.ageGroups.push(row)
  }
  row.people += 1
}

function incrementProfileType(snapshot, type) {
  let row = snapshot.profileTypes.find((item) => item.type === type || item.type === `${type}s`)
  if (!row) {
    row = { type, count: 0 }
    snapshot.profileTypes.push(row)
  }
  row.count += 1
}
