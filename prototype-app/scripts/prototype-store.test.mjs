import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createClaims,
  createUser,
  createContribution,
  createProfile,
  createSeedData,
  loginUser,
  loadSnapshot,
  removeGuardianConnection,
  requestGuardianConnection,
  respondGuardianConnection,
  updateContributionProfile,
  updateUserProfile,
  updateUserVerification,
  validatePassword,
  verifyPassword,
} from './prototype-store.mjs'

let tempDir

afterEach(async () => {
  if (tempDir) await rm(tempDir, { recursive: true, force: true })
  tempDir = undefined
})

async function tempDataPath() {
  tempDir = await mkdtemp(join(tmpdir(), 'e4h-store-test-'))
  return join(tempDir, 'prototype-data.json')
}

describe('prototype JSON store', () => {
  it('creates seed data with country, age, fund, and profile aggregates', () => {
    const seed = createSeedData()

    expect(seed.profiles.length).toBeGreaterThan(3)
    expect(seed.contributions.length).toBeGreaterThan(3)
    expect(seed.users.length).toBeGreaterThan(8)
    expect(seed.users).toContainEqual(expect.objectContaining({ username: 'Mira North', passwordHash: expect.stringMatching(/^scrypt:/), country: 'Canada', ageGroup: '36–50' }))
    expect(seed.users.every((user) => !Object.hasOwn(user, 'password'))).toBe(true)
    expect(seed.users.filter((user) => user.passwordHash)).toHaveLength(13)
    expect(seed.users.filter((user) => user.passwordHash).every((user) => verifyPassword('Test123#', user))).toBe(true)
    expect(seed.users).toContainEqual(expect.objectContaining({ username: 'AI agent', ageGroup: 'AI agent' }))
    expect(seed.profiles).toContainEqual(expect.objectContaining({ type: 'Faith group', name: 'Lantern Harbour Collective' }))
    expect(seed.profiles).toContainEqual(expect.objectContaining({ type: 'In memory of', country: 'United Kingdom' }))
    expect(seed.countries.some((row) => row.country === 'Canada')).toBe(true)
    expect(seed.ageGroups.some((row) => row.group === '0–5')).toBe(true)
    expect(seed.ageGroups.some((row) => row.group === '6–10')).toBe(true)
    expect(seed.ageGroups.some((row) => row.group === '96–100')).toBe(true)
    expect(seed.ageGroups.some((row) => row.group === 'AI agent')).toBe(false)
    expect(seed.countries).toContainEqual(expect.objectContaining({ country: 'Canada' }))
    expect(seed.countries).toContainEqual(expect.objectContaining({ country: 'United States' }))
    expect(seed.funds.humanityFundContributions).toBeGreaterThan(seed.funds.stewardshipContributions)

    const peopleWithProfiles = seed.profiles.filter((profile) => (profile.type === 'Individual' || profile.type === 'Child under 16') && profile.country !== 'Digital')
    const totalRecordedContributions = seed.contributions
      .filter((contribution) => !contribution.sourceClaimId && contribution.recordKind !== 'recycled-benefit')
      .reduce((total, contribution) => total + contribution.humanityFund + contribution.stewardshipReserve, 0)
    const humanityFundContributions = seed.contributions
      .filter((contribution) => !contribution.sourceClaimId && contribution.recordKind !== 'recycled-benefit')
      .reduce((total, contribution) => total + contribution.humanityFund, 0)
    const paidBenefits = seed.claims.filter((claim) => claim.action === 'claimed').reduce((total, claim) => total + claim.amount, 0)
    expect(peopleWithProfiles.length).toBeGreaterThanOrEqual(100)
    expect(seed.funds.activeClaimants).toBe(peopleWithProfiles.length)
    expect(seed.funds.totalContributions).toBe(totalRecordedContributions)
    expect(seed.funds.modeledGrowth).toBeCloseTo(humanityFundContributions * 0.1)
    expect(seed.funds.currentEndowment).toBeCloseTo(totalRecordedContributions + seed.funds.modeledGrowth - paidBenefits)
    expect(seed.funds.stewardshipFundBalance).toBeCloseTo(seed.funds.stewardshipContributions + seed.funds.recycledStewardshipTransfers)
    expect(seed.funds.humanityFundBalance).toBeCloseTo(humanityFundContributions + seed.funds.modeledGrowth - paidBenefits - seed.funds.recycledStewardshipTransfers)
  })

  it('does not inject the fictional scenario or persist aggregate changes when loading an existing snapshot', async () => {
    const dataPath = await tempDataPath()
    const existingSnapshot = {
      version: 1,
      updatedAt: '2026-01-01T00:00:00.000Z',
      users: [{ id: 'existing-user', username: 'Existing Fictional User', country: 'Canada', ageGroup: '26–30', profileId: 'existing-profile' }],
      profiles: [{ id: 'existing-profile', name: 'Existing Fictional User', type: 'Individual', country: 'Canada', ageGroup: '26–30', description: 'Existing local prototype profile.', connector: '' }],
      contributions: [],
      claims: [],
      countries: [],
      ageGroups: [],
      profileTypes: [],
      funds: { averageGrowth: 0.1, recycleRate: 0.28 },
    }
    await writeFile(dataPath, `${JSON.stringify(existingSnapshot, null, 2)}\n`)
    const before = await readFile(dataPath, 'utf8')

    const loaded = await loadSnapshot(dataPath)
    const after = await readFile(dataPath, 'utf8')

    expect(loaded.profiles).toHaveLength(1)
    expect(loaded.profiles).not.toContainEqual(expect.objectContaining({ id: 'scenario-profile-001' }))
    expect(after).toBe(before)
  })

  it('migrates legacy plaintext local credentials without resetting saved prototype records', async () => {
    const dataPath = await tempDataPath()
    const snapshot = createSeedData()
    const user = snapshot.users.find((item) => item.username === 'Mira North')
    delete user.passwordHash
    user.password = 'Legacy123#'
    const contributionIdsBefore = snapshot.contributions.map((item) => item.id)
    await writeFile(dataPath, `${JSON.stringify(snapshot, null, 2)}\n`)

    await loadSnapshot(dataPath)
    const persisted = JSON.parse(await readFile(dataPath, 'utf8'))
    const migratedUser = persisted.users.find((item) => item.id === user.id)

    expect(migratedUser).not.toHaveProperty('password')
    expect(migratedUser.passwordHash).toMatch(/^scrypt:/)
    expect(verifyPassword('Legacy123#', migratedUser)).toBe(true)
    expect(persisted.contributions.map((item) => item.id)).toEqual(contributionIdsBefore)
  })

  it('validates prototype password rules', () => {
    expect(validatePassword('')).toEqual([])
    expect(validatePassword('Test123#')).toEqual([])
    expect(validatePassword('test123#')).toContain('Use at least one capital letter.')
    expect(validatePassword('Testabc#')).toContain('Use at least one number.')
    expect(validatePassword('Test1234')).toContain('Use at least one special character.')
    expect(validatePassword('Tes1#')).toContain('Use at least 8 characters.')
  })

  it('requires an explicit local password when creating an account', async () => {
    const dataPath = await tempDataPath()

    await expect(createUser(dataPath, {
      username: 'Password Required',
      ageGroup: '26–30',
      country: 'Canada',
      connector: '',
    })).rejects.toThrow('Password is required.')
  })

  it('creates and logs in a user with the prototype password', async () => {
    const dataPath = await tempDataPath()

    const user = await createUser(dataPath, {
      username: 'New Connector',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '26–30',
      country: 'Canada',
      connector: 'Mira North',
    })

    expect(user.id).toMatch(/^user-/)
    expect(user.username).toBe('New Connector')
    expect(user).not.toHaveProperty('password')
    expect(user.passwordHash).toMatch(/^scrypt:/)

    await expect(loginUser(dataPath, { username: 'New Connector', password: 'wrong' })).resolves.toEqual({ ok: false, error: 'Invalid username or password.' })
    await expect(loginUser(dataPath, { username: 'New Connector', password: 'Test123#' })).resolves.toEqual(expect.objectContaining({ ok: true, user: expect.objectContaining({ username: 'New Connector' }) }))
  })


  it('requires unique usernames when creating or renaming accounts', async () => {
    const dataPath = await tempDataPath()
    const user = await createUser(dataPath, {
      username: 'Unique Connector',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '26–30',
      country: 'Canada',
      connector: 'Mira North',
    })

    await expect(createUser(dataPath, {
      username: 'unique connector',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '31–35',
      country: 'Canada',
      connector: 'Mira North',
    })).rejects.toThrow('Username already exists. Please choose a different username.')
    await expect(updateUserProfile(dataPath, { id: user.id, username: 'Mira North', country: 'Canada', ageGroup: '26–30', connector: 'Mira North' })).rejects.toThrow('Username already exists. Please choose a different username.')
  })


  it('updates logged-in user country, age group, and connector on the linked profile', async () => {
    const dataPath = await tempDataPath()
    const user = await createUser(dataPath, {
      username: 'Priya Editable',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '26–30',
      country: 'India',
      connector: 'Mira North',
    })

    const updated = await updateUserProfile(dataPath, { id: user.id, country: 'Canada', ageGroup: '31–35', connector: '' })
    const snapshot = await loadSnapshot(dataPath)

    expect(updated.user).toEqual(expect.objectContaining({ country: 'Canada', ageGroup: '31–35', connector: '' }))
    expect(snapshot.profiles.find((profile) => profile.id === user.profileId)).toEqual(expect.objectContaining({ country: 'Canada', ageGroup: '31–35', connector: '' }))
  })

  it('updates username and password while preserving guardian and connector links', async () => {
    const dataPath = await tempDataPath()
    const guardian = (await loginUser(dataPath, { username: 'Mira North', password: 'Test123#' })).user
    const child = (await loginUser(dataPath, { username: 'Tala North', password: 'Test123#' })).user

    const updated = await updateUserProfile(dataPath, {
      id: guardian.id,
      username: 'Mira North Updated',
      password: 'Better123#',
      country: guardian.country,
      ageGroup: guardian.ageGroup,
      connector: guardian.connector,
      guardianUsername: guardian.guardianUsername ?? '',
    })
    const snapshot = await loadSnapshot(dataPath)
    const childAfter = snapshot.users.find((user) => user.id === child.id)
    const login = await loginUser(dataPath, { username: 'Mira North Updated', password: 'Better123#' })

    expect(updated.user).toEqual(expect.objectContaining({ username: 'Mira North Updated' }))
    expect(updated.user).not.toHaveProperty('password')
    expect(updated.user.passwordHash).toMatch(/^scrypt:/)
    expect(snapshot.profiles.find((profile) => profile.id === guardian.profileId)).toEqual(expect.objectContaining({ name: 'Mira North Updated' }))
    expect(childAfter).toEqual(expect.objectContaining({ guardianUsername: 'Mira North Updated' }))
    expect(login).toEqual(expect.objectContaining({ ok: true, user: expect.objectContaining({ id: guardian.id }) }))
  })

  it('reloads only the logged-in account claim records on login', async () => {
    const dataPath = await tempDataPath()
    const guardian = (await loginUser(dataPath, { username: 'Mira North', password: 'Test123#' })).user
    const child = (await loginUser(dataPath, { username: 'Tala North', password: 'Test123#' })).user

    await createClaims(dataPath, { actorUserId: guardian.id, targetUserIds: [child.id], action: 'claimed', amount: 33 })
    const guardianLogin = await loginUser(dataPath, { username: 'Mira North', password: 'Test123#' })
    const childLogin = await loginUser(dataPath, { username: 'Tala North', password: 'Test123#' })

    expect(guardianLogin.claims).not.toContainEqual(expect.objectContaining({ userId: child.id, amount: 33 }))
    expect(childLogin.claims).toContainEqual(expect.objectContaining({ userId: child.id, amount: 33 }))
  })

  it('derives the binary claim route from an accepted parent / guardian instead of browser-supplied age status', async () => {
    const dataPath = await tempDataPath()
    const child = (await loginUser(dataPath, { username: 'Tala North', password: 'Test123#' })).user

    const updated = await updateUserVerification(dataPath, {
      id: child.id,
      verificationMethod: 'government-id-liveness',
      verificationStatus: 'claim-for-self',
    })
    const login = await loginUser(dataPath, { username: 'Tala North', password: 'Test123#' })

    expect(updated.user).toEqual(expect.objectContaining({ verificationStatus: 'parent-guardian-must-claim', guardianUsername: 'Mira North' }))
    expect(login.user).toEqual(expect.objectContaining({ verifiedHumanAt: expect.any(String), verificationStatus: 'parent-guardian-must-claim' }))
  })

  it('persists a created profile into a JSON file', async () => {
    const dataPath = await tempDataPath()

    const profile = await createProfile(dataPath, {
      name: 'Lantern Harbour Collective',
      type: 'Faith group',
      country: 'Canada',
      description: 'Ottawa community profile for members to identify.',
      connector: 'LOCAL-GROVE-042',
      ageGroup: '36–50',
      createdByUserId: 'user-david-brown',
    })

    const saved = JSON.parse(await readFile(dataPath, 'utf8'))
    expect(profile.id).toMatch(/^profile-/)
    expect(saved.profiles).toContainEqual(expect.objectContaining({
      name: 'Lantern Harbour Collective',
      type: 'Faith group',
      country: 'Canada',
      createdByUserId: 'user-david-brown',
    }))
  })

  it('requires name, type, and country when creating contribution profiles', async () => {
    const dataPath = await tempDataPath()

    await expect(createProfile(dataPath, { name: '', type: 'Faith group', country: 'Canada' })).rejects.toThrow('Name is required.')
    await expect(createProfile(dataPath, { name: 'Memorial Fund', type: '', country: 'Canada' })).rejects.toThrow('Contribution profile type is required.')
    await expect(createProfile(dataPath, { name: 'Memorial Fund', type: 'In memory of', country: '' })).rejects.toThrow('Country is required.')
  })

  it('only lets the creator modify a contribution profile', async () => {
    const dataPath = await tempDataPath()
    const profile = await createProfile(dataPath, {
      name: 'Creator Profile',
      type: 'Family',
      country: 'Canada',
      createdByUserId: 'user-creator',
      description: 'Original',
    })

    await expect(updateContributionProfile(dataPath, { id: profile.id, userId: 'someone-else', name: 'Nope', type: 'Family', country: 'Canada', description: '' })).rejects.toThrow('Only the creator can modify this contribution profile.')
    const updated = await updateContributionProfile(dataPath, { id: profile.id, userId: 'user-creator', name: 'Updated Profile', type: 'Organization', country: 'United States', description: 'Updated' })

    expect(updated.profile).toEqual(expect.objectContaining({ name: 'Updated Profile', type: 'Organization', country: 'United States', description: 'Updated' }))
  })

  it('persists a simulated contribution and updates fund/country aggregates', async () => {
    const dataPath = await tempDataPath()
    const before = await loadSnapshot(dataPath)
    const beforeTotalContributions = before.funds.totalContributions
    const beforeCanadaContributions = before.countries.find((row) => row.country === 'Canada').contributions

    const contribution = await createContribution(dataPath, {
      profileId: 'seed-profile-canada',
      recognitionName: 'Lantern Harbour Collective',
      amount: 1000,
      allocationMode: 'hybrid99',
      paymentMethod: 'PayPal',
      stewardshipTip: 25,
      contributorUserId: 'user-creator',
      country: 'Canada',
      ageGroup: '36–50',
    })

    const snapshot = await loadSnapshot(dataPath)
    expect(contribution.humanityFund).toBe(990)
    expect(contribution.stewardshipReserve).toBe(35)
    expect(contribution.contributorUserId).toBe('user-creator')
    expect(snapshot.funds.totalContributions).toBe(beforeTotalContributions + 1025)
    expect(snapshot.countries.find((row) => row.country === 'Canada').contributions).toBe(beforeCanadaContributions + 1025)
  })


  it('persists anonymous contributions with stable public aliases', async () => {
    const dataPath = await tempDataPath()
    const first = await createContribution(dataPath, {
      profileId: 'seed-profile-canada',
      recognitionName: 'Mira North',
      amount: 100,
      allocationMode: 'humanity',
      paymentMethod: 'Stripe',
      contributorUserId: 'user-david-brown',
      country: 'Canada',
      ageGroup: '51–55',
      isAnonymous: true,
    })
    const second = await createContribution(dataPath, {
      profileId: 'seed-profile-canada',
      recognitionName: 'Mira North',
      amount: 200,
      allocationMode: 'stewardship',
      paymentMethod: 'PayPal',
      contributorUserId: 'user-david-brown',
      country: 'Canada',
      ageGroup: '51–55',
      isAnonymous: true,
    })
    const snapshot = await loadSnapshot(dataPath)

    expect(first).toEqual(expect.objectContaining({ isAnonymous: true, anonymousAlias: 'Anonymous 1' }))
    expect(second).toEqual(expect.objectContaining({ isAnonymous: true, anonymousAlias: 'Anonymous 1' }))
    expect(snapshot.contributions.filter((item) => item.contributorUserId === 'user-david-brown' && item.isAnonymous).map((item) => item.anonymousAlias)).toEqual(['Anonymous 1', 'Anonymous 1'])
  })

  it('persists claimed benefit records and reloads them on login', async () => {
    const dataPath = await tempDataPath()
    const login = await loginUser(dataPath, { username: 'Mira North', password: 'Test123#' })

    const result = await createClaims(dataPath, {
      actorUserId: login.user.id,
      targetUserIds: [login.user.id],
      action: 'claimed',
      amount: 42.5,
      deliveryMethod: 'E-transfer',
      denomination: 'Canadian dollars',
    })
    const reloaded = await loginUser(dataPath, { username: 'Mira North', password: 'Test123#' })

    expect(result.claims).toHaveLength(1)
    expect(result.claims[0]).toEqual(expect.objectContaining({ action: 'claimed', amount: 42.5, profileId: login.user.profileId, targetName: 'Mira North' }))
    expect(reloaded.claims).toContainEqual(expect.objectContaining({ id: result.claims[0].id, action: 'claimed', deliveryMethod: 'E-transfer' }))
  })

  it('recycles claims into contribution entries dated with the claim record', async () => {
    const dataPath = await tempDataPath()
    const login = await loginUser(dataPath, { username: 'Mira North', password: 'Test123#' })
    const before = await loadSnapshot(dataPath)

    const result = await createClaims(dataPath, {
      actorUserId: login.user.id,
      targetUserIds: [login.user.id],
      action: 'recycled',
      amount: 80,
      allocationMode: 'stewardship',
    })
    const snapshot = await loadSnapshot(dataPath)
    const contribution = snapshot.contributions.find((item) => item.sourceClaimId === result.claims[0].id)

    expect(result.claims[0]).toEqual(expect.objectContaining({ action: 'recycled', amount: 80, userId: login.user.id }))
    expect(contribution).toEqual(expect.objectContaining({ contributorUserId: login.user.id, profileId: login.user.profileId, amount: 80, humanityFund: 0, stewardshipReserve: 80, allocationMode: 'stewardship', paymentMethod: 'Recycled claim benefit', createdAt: result.claims[0].createdAt }))
    expect(snapshot.funds.totalContributions).toBe(before.funds.totalContributions)
    expect(snapshot.funds.currentEndowment).toBe(before.funds.currentEndowment)
    expect(snapshot.funds.recycledBenefits).toBe(before.funds.recycledBenefits + 80)
    expect(snapshot.funds.recycledStewardshipTransfers).toBe((before.funds.recycledStewardshipTransfers ?? 0) + 80)
    expect(snapshot.funds.stewardshipFundBalance).toBe((before.funds.stewardshipFundBalance ?? 0) + 80)
    expect(snapshot.funds.humanityFundBalance).toBeCloseTo((before.funds.humanityFundBalance ?? 0) - 80)
  })


  it('can recycle a claim into an anonymous contribution using the same account alias', async () => {
    const dataPath = await tempDataPath()
    const login = await loginUser(dataPath, { username: 'Mira North', password: 'Test123#' })
    await createContribution(dataPath, {
      profileId: login.user.profileId,
      recognitionName: login.user.username,
      amount: 10,
      allocationMode: 'humanity',
      paymentMethod: 'Stripe',
      contributorUserId: login.user.id,
      country: login.user.country,
      ageGroup: login.user.ageGroup,
      isAnonymous: true,
    })

    const result = await createClaims(dataPath, {
      actorUserId: login.user.id,
      targetUserIds: [login.user.id],
      action: 'recycled',
      amount: 12,
      isAnonymous: true,
    })
    const contribution = result.contributions[0]

    expect(contribution).toEqual(expect.objectContaining({ isAnonymous: true, anonymousAlias: 'Anonymous 1', sourceClaimId: result.claims[0].id }))
  })

  it('credits a guardian-recorded recycled benefit to the selected recipient while preserving the dependent value source', async () => {
    const dataPath = await tempDataPath()
    const guardian = (await loginUser(dataPath, { username: 'Mira North', password: 'Test123#' })).user
    const child = (await loginUser(dataPath, { username: 'Tala North', password: 'Test123#' })).user
    const before = await loadSnapshot(dataPath)

    const result = await createClaims(dataPath, {
      actorUserId: guardian.id,
      targetUserIds: [child.id],
      action: 'recycled',
      amount: 25,
      recycleDestinations: [{ profileId: 'seed-profile-faith' }],
    })
    const contribution = result.contributions[0]

    expect(result.claims[0]).toEqual(expect.objectContaining({ actorUserId: guardian.id, userId: child.id, profileId: child.profileId, action: 'recycled', amount: 25 }))
    expect(contribution).toEqual(expect.objectContaining({
      actorUserId: guardian.id,
      contributorUserId: child.id,
      profileId: 'seed-profile-faith',
      recognitionName: 'Lantern Harbour Collective',
      amount: 25,
      sourceClaimId: result.claims[0].id,
    }))
    const after = await loadSnapshot(dataPath)
    expect(after.funds.totalContributions).toBe(before.funds.totalContributions)
    expect(after.funds.recycledBenefits).toBe(before.funds.recycledBenefits + 25)
    expect(after.funds.currentEndowment).toBeCloseTo(before.funds.currentEndowment)
    expect(after.funds.recycledStewardshipTransfers).toBe(before.funds.recycledStewardshipTransfers ?? 0)
    expect(after.funds.stewardshipFundBalance).toBe(before.funds.stewardshipFundBalance)
    expect(after.funds.humanityFundBalance).toBeCloseTo(before.funds.humanityFundBalance)
  })

  it('splits a recycled benefit across every selected recipient profile without duplicating the benefit value', async () => {
    const dataPath = await tempDataPath()
    const guardian = (await loginUser(dataPath, { username: 'Mira North', password: 'Test123#' })).user
    const child = (await loginUser(dataPath, { username: 'Tala North', password: 'Test123#' })).user
    const secondChild = await createUser(dataPath, {
      username: 'Recycle Destination Child',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '6–10',
      country: 'Canada',
      connector: 'Mira North',
      guardianUserId: guardian.id,
    })
    await respondGuardianConnection(dataPath, { guardianUserId: guardian.id, childUserId: secondChild.id, decision: 'accepted' })

    const result = await createClaims(dataPath, {
      actorUserId: guardian.id,
      targetUserIds: [child.id],
      action: 'recycled',
      amount: 25,
      recycleDestinations: [{ profileId: child.profileId }, { profileId: secondChild.profileId }],
    })

    expect(result.claims).toHaveLength(1)
    expect(result.contributions).toHaveLength(2)
    expect(result.contributions.map((contribution) => contribution.amount).sort((a, b) => a - b)).toEqual([12.5, 12.5])
    expect(result.contributions.reduce((total, contribution) => total + contribution.amount, 0)).toBe(25)
    expect(result.contributions).toEqual(expect.arrayContaining([
      expect.objectContaining({ contributorUserId: child.id, actorUserId: guardian.id, profileId: child.profileId }),
      expect.objectContaining({ contributorUserId: child.id, actorUserId: guardian.id, profileId: secondChild.profileId }),
    ]))
  })

  it('attributes guardian claims and recycled contributions to each selected dependent', async () => {
    const dataPath = await tempDataPath()
    const guardian = (await loginUser(dataPath, { username: 'Mira North', password: 'Test123#' })).user
    const child = (await loginUser(dataPath, { username: 'Tala North', password: 'Test123#' })).user
    const secondChild = await createUser(dataPath, {
      username: 'Second Brown Child',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '6–10',
      country: 'Canada',
      connector: 'Mira North',
      guardianUserId: guardian.id,
    })
    await respondGuardianConnection(dataPath, { guardianUserId: guardian.id, childUserId: secondChild.id, decision: 'accepted' })

    const result = await createClaims(dataPath, {
      actorUserId: guardian.id,
      targetUserIds: [child.id, secondChild.id],
      action: 'recycled',
      amount: 25,
    })
    const snapshot = await loadSnapshot(dataPath)
    const contributionUserIds = snapshot.contributions.filter((item) => result.claims.some((claim) => claim.id === item.sourceClaimId)).map((item) => item.contributorUserId).sort()
    const childLogin = await loginUser(dataPath, { username: 'Tala North', password: 'Test123#' })

    expect(result.claims).toHaveLength(2)
    expect(result.claims).toEqual(expect.arrayContaining([
      expect.objectContaining({ actorUserId: guardian.id, userId: child.id, profileId: child.profileId, targetName: 'Tala North' }),
      expect.objectContaining({ actorUserId: guardian.id, userId: secondChild.id, profileId: secondChild.profileId, targetName: 'Second Brown Child' }),
    ]))
    expect(contributionUserIds).toEqual([child.id, secondChild.id].sort())
    expect(childLogin.claims).toContainEqual(expect.objectContaining({ userId: child.id, action: 'recycled' }))
  })

  it('requires a guardian to accept a child request before guardian claim authority is granted', async () => {
    const dataPath = await tempDataPath()
    const guardian = (await loginUser(dataPath, { username: 'Mira North', password: 'Test123#' })).user
    const child = await createUser(dataPath, {
      username: 'Pending Guardian Child',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '11–15',
      country: 'Canada',
      connector: '',
    })

    const request = await requestGuardianConnection(dataPath, { childUserId: child.id, guardianUserId: guardian.id })
    expect(request.child).toEqual(expect.objectContaining({ guardianUserId: guardian.id, guardianUsername: guardian.username, guardianStatus: 'pending' }))
    await expect(createClaims(dataPath, { actorUserId: guardian.id, targetUserIds: [child.id], action: 'claimed', amount: 25 })).rejects.toThrow('Claim target is not linked to this account.')

    const accepted = await respondGuardianConnection(dataPath, { guardianUserId: guardian.id, childUserId: child.id, decision: 'accepted' })
    expect(accepted.child).toEqual(expect.objectContaining({ guardianUserId: guardian.id, guardianStatus: 'accepted' }))
    await expect(createClaims(dataPath, { actorUserId: guardian.id, targetUserIds: [child.id], action: 'claimed', amount: 25 })).resolves.toEqual(expect.objectContaining({ ok: true, claims: [expect.objectContaining({ userId: child.id })] }))

    const removed = await removeGuardianConnection(dataPath, { actorUserId: guardian.id, childUserId: child.id })
    expect(removed.child).toEqual(expect.objectContaining({ guardianUserId: '', guardianUsername: '', guardianStatus: '' }))
    await expect(createClaims(dataPath, { actorUserId: guardian.id, targetUserIds: [child.id], action: 'claimed', amount: 25 })).rejects.toThrow('Claim target is not linked to this account.')
  })

  it('creates a selected guardian as a pending request rather than an automatic connection', async () => {
    const dataPath = await tempDataPath()
    const guardian = (await loginUser(dataPath, { username: 'Mira North', password: 'Test123#' })).user

    const child = await createUser(dataPath, {
      username: 'New Pending Guardian Child',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '6–10',
      country: 'Canada',
      connector: '',
      guardianUserId: guardian.id,
    })

    expect(child).toEqual(expect.objectContaining({ guardianUserId: guardian.id, guardianUsername: guardian.username, guardianStatus: 'pending' }))
  })

  it('migrates a legacy guardian-name selection to a pending request instead of accepting it automatically', async () => {
    const dataPath = await tempDataPath()
    const legacySnapshot = createSeedData()
    const child = legacySnapshot.users.find((user) => user.username === 'Tala North')
    delete child.guardianUserId
    delete child.guardianStatus
    delete child.guardianRequestedAt
    delete child.guardianRespondedAt
    child.guardianUsername = 'Mira North'
    await writeFile(dataPath, `${JSON.stringify(legacySnapshot, null, 2)}\n`)

    const migrated = await loadSnapshot(dataPath)
    const migratedChild = migrated.users.find((user) => user.username === 'Tala North')
    expect(migratedChild).toEqual(expect.objectContaining({ guardianUserId: 'user-david-brown', guardianUsername: 'Mira North', guardianStatus: 'pending' }))
  })

  it('allows up to two separately accepted direct parent or guardian connections', async () => {
    const dataPath = await tempDataPath()
    const snapshot = await loadSnapshot(dataPath)
    const firstGuardian = snapshot.users.find((user) => user.username === 'Mira North')
    const secondGuardian = snapshot.users.find((user) => user.username === 'Ivo Cedar')
    const thirdGuardian = snapshot.users.find((user) => user.username === 'Zuri Vale')
    expect(firstGuardian).toBeTruthy()
    expect(secondGuardian).toBeTruthy()
    expect(thirdGuardian).toBeTruthy()

    const child = await createUser(dataPath, {
      username: 'Two Guardian Child',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '6–10',
      country: 'Canada',
      connector: '',
      guardianUserIds: [firstGuardian.id, secondGuardian.id],
    })

    expect(child.guardianConnections).toEqual([
      expect.objectContaining({ guardianUserId: firstGuardian.id, guardianStatus: 'pending' }),
      expect.objectContaining({ guardianUserId: secondGuardian.id, guardianStatus: 'pending' }),
    ])

    await respondGuardianConnection(dataPath, { guardianUserId: firstGuardian.id, childUserId: child.id, decision: 'accepted' })
    const accepted = await respondGuardianConnection(dataPath, { guardianUserId: secondGuardian.id, childUserId: child.id, decision: 'accepted' })
    expect(accepted.child.guardianConnections).toEqual([
      expect.objectContaining({ guardianUserId: firstGuardian.id, guardianStatus: 'accepted' }),
      expect.objectContaining({ guardianUserId: secondGuardian.id, guardianStatus: 'accepted' }),
    ])

    await expect(createClaims(dataPath, { actorUserId: firstGuardian.id, targetUserIds: [child.id], action: 'claimed', amount: 25 })).resolves.toEqual(expect.objectContaining({ ok: true }))
    await expect(createClaims(dataPath, { actorUserId: secondGuardian.id, targetUserIds: [child.id], action: 'claimed', amount: 25 })).resolves.toEqual(expect.objectContaining({ ok: true }))
    await expect(requestGuardianConnection(dataPath, { childUserId: child.id, guardianUserId: thirdGuardian.id })).rejects.toThrow('at most two')
  })

  it('limits each parent or guardian to ten active child or ward connections', async () => {
    const dataPath = await tempDataPath()
    const snapshot = await loadSnapshot(dataPath)
    const guardian = snapshot.users.find((user) => user.username === 'Ivo Cedar')
    expect(guardian).toBeTruthy()

    for (let index = 1; index <= 10; index += 1) {
      await createUser(dataPath, {
        username: `Capacity Ward ${index}`,
        password: 'Test123#',
        repeatPassword: 'Test123#',
        ageGroup: '6–10',
        country: 'Canada',
        connector: '',
        guardianUserId: guardian.id,
      })
    }

    const withTenRequests = await loadSnapshot(dataPath)
    const activeWardCount = withTenRequests.users.filter((user) => user.guardianConnections?.some((connection) => connection.guardianUserId === guardian.id && ['pending', 'accepted'].includes(connection.guardianStatus))).length
    expect(activeWardCount).toBe(10)

    await expect(createUser(dataPath, {
      username: 'Capacity Ward 11',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '6–10',
      country: 'Canada',
      connector: '',
      guardianUserId: guardian.id,
    })).rejects.toThrow('maximum of 10 active child / ward connections')
  })

  it('removes only the staged pending parent or guardian request that the child confirms', async () => {
    const dataPath = await tempDataPath()
    const snapshot = await loadSnapshot(dataPath)
    const firstGuardian = snapshot.users.find((user) => user.username === 'Mira North')
    const secondGuardian = snapshot.users.find((user) => user.username === 'Ivo Cedar')
    expect(firstGuardian).toBeTruthy()
    expect(secondGuardian).toBeTruthy()

    const child = await createUser(dataPath, {
      username: 'Pending Guardian Choices',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '11–15',
      country: 'Canada',
      connector: '',
      guardianUserIds: [firstGuardian.id, secondGuardian.id],
    })

    const removed = await removeGuardianConnection(dataPath, {
      actorUserId: child.id,
      childUserId: child.id,
      guardianUserId: firstGuardian.id,
    })
    expect(removed.child.guardianConnections).toEqual([
      expect.objectContaining({ guardianUserId: secondGuardian.id, guardianStatus: 'pending' }),
    ])
  })

  it('rejects circular and tiered parent or guardian relationships', async () => {
    const dataPath = await tempDataPath()
    const snapshot = await loadSnapshot(dataPath)
    const guardian = snapshot.users.find((user) => user.username === 'Mira North')
    const acceptedChild = snapshot.users.find((user) => user.username === 'Tala North')
    expect(guardian).toBeTruthy()
    expect(acceptedChild).toBeTruthy()

    await expect(requestGuardianConnection(dataPath, {
      childUserId: guardian.id,
      guardianUserId: acceptedChild.id,
    })).rejects.toThrow('accepted child / ward')

    const child = await createUser(dataPath, {
      username: 'Would Create A Tier',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '6–10',
      country: 'Canada',
      connector: '',
      guardianUserId: acceptedChild.id,
    })
    await expect(respondGuardianConnection(dataPath, {
      guardianUserId: acceptedChild.id,
      childUserId: child.id,
      decision: 'accepted',
    })).rejects.toThrow('already has a parent / guardian connection')
  })

  it('keeps a self-directed connector status distinct from no connector', async () => {
    const dataPath = await tempDataPath()
    const snapshot = await loadSnapshot(dataPath)
    const user = snapshot.users.find((item) => item.username === 'Ivo Cedar')
    expect(user).toBeTruthy()

    const selfDirected = await updateUserProfile(dataPath, {
      id: user.id,
      connector: '',
      connectorSelfDirected: true,
    })
    expect(selfDirected.user).toEqual(expect.objectContaining({ connector: '', connectorSelfDirected: true }))
    expect(selfDirected.profile).toEqual(expect.objectContaining({ connector: '', connectorSelfDirected: true }))

    const cleared = await updateUserProfile(dataPath, {
      id: user.id,
      connector: '',
      connectorSelfDirected: false,
    })
    expect(cleared.user).toEqual(expect.objectContaining({ connector: '', connectorSelfDirected: false }))
    expect(cleared.profile).toEqual(expect.objectContaining({ connector: '', connectorSelfDirected: false }))
  })

  it('repairs a persisted circular guardian pair instead of retaining reciprocal authority', async () => {
    const dataPath = await tempDataPath()
    const snapshot = createSeedData()
    const david = snapshot.users.find((item) => item.username === 'Mira North')
    const anisa = snapshot.users.find((item) => item.username === 'Tala North')
    expect(david).toBeTruthy()
    expect(anisa).toBeTruthy()

    david.guardianUserId = anisa.id
    david.guardianUsername = anisa.username
    david.guardianStatus = 'accepted'
    david.guardianRequestedAt = '2026-07-01T00:00:00.000Z'
    david.guardianRespondedAt = '2026-07-01T00:00:00.000Z'
    anisa.guardianUserId = david.id
    anisa.guardianUsername = david.username
    anisa.guardianStatus = 'accepted'
    anisa.guardianRequestedAt = '2026-07-01T00:00:00.000Z'
    anisa.guardianRespondedAt = '2026-07-01T00:00:00.000Z'
    await writeFile(dataPath, `${JSON.stringify(snapshot, null, 2)}\n`)

    const repaired = await loadSnapshot(dataPath)
    const repairedDavid = repaired.users.find((item) => item.id === david.id)
    const repairedAnisa = repaired.users.find((item) => item.id === anisa.id)
    expect(repairedDavid).toEqual(expect.objectContaining({ guardianUserId: '', guardianStatus: '' }))
    expect(repairedAnisa).toEqual(expect.objectContaining({ guardianUserId: '', guardianStatus: '' }))
  })
})
