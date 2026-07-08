import { mkdtemp, readFile, rm } from 'node:fs/promises'
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
  updateContributionProfile,
  updateUserProfile,
  updateUserVerification,
  validatePassword,
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
    expect(seed.users).toContainEqual(expect.objectContaining({ username: 'David Brown', password: 'Test123#' }))
    expect(seed.users).toContainEqual(expect.objectContaining({ username: 'AI agent', ageGroup: 'AI agent' }))
    expect(seed.profiles).toContainEqual(expect.objectContaining({ type: 'Faith group', name: 'St. Mark’s Community Fund' }))
    expect(seed.profiles).toContainEqual(expect.objectContaining({ type: 'In memory of', country: 'United Kingdom' }))
    expect(seed.countries.some((row) => row.country === 'Canada')).toBe(true)
    expect(seed.ageGroups.some((row) => row.group === '0–5')).toBe(true)
    expect(seed.ageGroups.some((row) => row.group === '6–10')).toBe(true)
    expect(seed.ageGroups.some((row) => row.group === '96–100')).toBe(true)
    expect(seed.ageGroups.some((row) => row.group === 'AI agent')).toBe(true)
    expect(seed.countries).toContainEqual(expect.objectContaining({ country: 'Canada' }))
    expect(seed.countries).toContainEqual(expect.objectContaining({ country: 'United States' }))
    expect(seed.funds.humanityFundContributions).toBeGreaterThan(seed.funds.stewardshipContributions)
  })

  it('validates prototype password rules', () => {
    expect(validatePassword('')).toEqual([])
    expect(validatePassword('Test123#')).toEqual([])
    expect(validatePassword('test123#')).toContain('Use at least one capital letter.')
    expect(validatePassword('Testabc#')).toContain('Use at least one number.')
    expect(validatePassword('Test1234')).toContain('Use at least one special character.')
    expect(validatePassword('Tes1#')).toContain('Use at least 8 characters.')
  })

  it('creates and logs in a user with the prototype password', async () => {
    const dataPath = await tempDataPath()

    const user = await createUser(dataPath, {
      username: 'New Connector',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '26–30',
      country: 'Canada',
      connector: 'David Brown',
    })

    expect(user.id).toMatch(/^user-/)
    expect(user.username).toBe('New Connector')
    expect(user.password).toBe('Test123#')

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
      connector: 'David Brown',
    })

    await expect(createUser(dataPath, {
      username: 'unique connector',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '31–35',
      country: 'Canada',
      connector: 'David Brown',
    })).rejects.toThrow('Username already exists. Please choose a different username.')
    await expect(updateUserProfile(dataPath, { id: user.id, username: 'David Brown', country: 'Canada', ageGroup: '26–30', connector: 'David Brown' })).rejects.toThrow('Username already exists. Please choose a different username.')
  })

  it('defaults blank created-account passwords to the shared prototype password', async () => {
    const dataPath = await tempDataPath()

    const user = await createUser(dataPath, {
      username: 'Jonah Hill',
      password: '',
      repeatPassword: '',
      ageGroup: '36–40',
      country: 'United States',
      connector: 'Lucas Silva',
    })

    expect(user.password).toBe('Test123#')
    await expect(loginUser(dataPath, { username: 'Jonah Hill', password: 'Test123#' })).resolves.toEqual(expect.objectContaining({ ok: true, profile: expect.objectContaining({ name: 'Jonah Hill' }) }))
  })

  it('updates logged-in user country, age group, and connector on the linked profile', async () => {
    const dataPath = await tempDataPath()
    const user = await createUser(dataPath, {
      username: 'Priya Editable',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '26–30',
      country: 'India',
      connector: 'David Brown',
    })

    const updated = await updateUserProfile(dataPath, { id: user.id, country: 'Canada', ageGroup: '31–35', connector: '' })
    const snapshot = await loadSnapshot(dataPath)

    expect(updated.user).toEqual(expect.objectContaining({ country: 'Canada', ageGroup: '31–35', connector: '' }))
    expect(snapshot.profiles.find((profile) => profile.id === user.profileId)).toEqual(expect.objectContaining({ country: 'Canada', ageGroup: '31–35', connector: '' }))
  })

  it('updates username and password while preserving guardian and connector links', async () => {
    const dataPath = await tempDataPath()
    const guardian = (await loginUser(dataPath, { username: 'David Brown', password: 'Test123#' })).user
    const child = (await loginUser(dataPath, { username: 'Anisa Brown', password: 'Test123#' })).user

    const updated = await updateUserProfile(dataPath, {
      id: guardian.id,
      username: 'David Brown Updated',
      password: 'Better123#',
      country: guardian.country,
      ageGroup: guardian.ageGroup,
      connector: guardian.connector,
      guardianUsername: guardian.guardianUsername ?? '',
    })
    const snapshot = await loadSnapshot(dataPath)
    const childAfter = snapshot.users.find((user) => user.id === child.id)
    const login = await loginUser(dataPath, { username: 'David Brown Updated', password: 'Better123#' })

    expect(updated.user).toEqual(expect.objectContaining({ username: 'David Brown Updated', password: 'Better123#' }))
    expect(snapshot.profiles.find((profile) => profile.id === guardian.profileId)).toEqual(expect.objectContaining({ name: 'David Brown Updated' }))
    expect(childAfter).toEqual(expect.objectContaining({ guardianUsername: 'David Brown Updated' }))
    expect(login).toEqual(expect.objectContaining({ ok: true, user: expect.objectContaining({ id: guardian.id }) }))
  })

  it('reloads only the logged-in account claim records on login', async () => {
    const dataPath = await tempDataPath()
    const guardian = (await loginUser(dataPath, { username: 'David Brown', password: 'Test123#' })).user
    const child = (await loginUser(dataPath, { username: 'Anisa Brown', password: 'Test123#' })).user

    await createClaims(dataPath, { actorUserId: guardian.id, targetUserIds: [child.id], action: 'claimed', amount: 33 })
    const guardianLogin = await loginUser(dataPath, { username: 'David Brown', password: 'Test123#' })
    const childLogin = await loginUser(dataPath, { username: 'Anisa Brown', password: 'Test123#' })

    expect(guardianLogin.claims).not.toContainEqual(expect.objectContaining({ userId: child.id, amount: 33 }))
    expect(childLogin.claims).toContainEqual(expect.objectContaining({ userId: child.id, amount: 33 }))
  })

  it('persists verified-human status and guardian links on the user profile', async () => {
    const dataPath = await tempDataPath()
    const user = await createUser(dataPath, {
      username: 'Dependent Child',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '11–15',
      country: 'Canada',
      connector: 'David Brown',
      guardianUsername: 'David Brown',
    })

    const updated = await updateUserVerification(dataPath, {
      id: user.id,
      verificationMethod: 'government-id-liveness',
      verificationStatus: '0_15',
      guardianUsername: 'David Brown',
    })
    const login = await loginUser(dataPath, { username: 'Dependent Child', password: 'Test123#' })

    expect(updated.user).toEqual(expect.objectContaining({ verificationStatus: '0_15', guardianUsername: 'David Brown' }))
    expect(login.user).toEqual(expect.objectContaining({ verifiedHumanAt: expect.any(String), guardianUsername: 'David Brown' }))
  })

  it('persists a created profile into a JSON file', async () => {
    const dataPath = await tempDataPath()

    const profile = await createProfile(dataPath, {
      name: 'St. Mark’s Community Fund',
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
      name: 'St. Mark’s Community Fund',
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

    const contribution = await createContribution(dataPath, {
      profileId: 'seed-profile-canada',
      recognitionName: 'St. Mark’s Community Fund',
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
    expect(snapshot.funds.totalContributions).toBeGreaterThan(725_000_000)
    expect(snapshot.countries.find((row) => row.country === 'Canada').contributions).toBeGreaterThan(11_800_000)
  })


  it('persists anonymous contributions with stable public aliases', async () => {
    const dataPath = await tempDataPath()
    const first = await createContribution(dataPath, {
      profileId: 'seed-profile-canada',
      recognitionName: 'David Brown',
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
      recognitionName: 'David Brown',
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
    const login = await loginUser(dataPath, { username: 'David Brown', password: 'Test123#' })

    const result = await createClaims(dataPath, {
      actorUserId: login.user.id,
      targetUserIds: [login.user.id],
      action: 'claimed',
      amount: 42.5,
      deliveryMethod: 'E-transfer',
      denomination: 'Canadian dollars',
    })
    const reloaded = await loginUser(dataPath, { username: 'David Brown', password: 'Test123#' })

    expect(result.claims).toHaveLength(1)
    expect(result.claims[0]).toEqual(expect.objectContaining({ action: 'claimed', amount: 42.5, profileId: login.user.profileId, targetName: 'David Brown' }))
    expect(reloaded.claims).toContainEqual(expect.objectContaining({ id: result.claims[0].id, action: 'claimed', deliveryMethod: 'E-transfer' }))
  })

  it('recycles claims into contribution entries dated with the claim record', async () => {
    const dataPath = await tempDataPath()
    const login = await loginUser(dataPath, { username: 'David Brown', password: 'Test123#' })

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
  })


  it('can recycle a claim into an anonymous contribution using the same account alias', async () => {
    const dataPath = await tempDataPath()
    const login = await loginUser(dataPath, { username: 'David Brown', password: 'Test123#' })
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

  it('attributes guardian claims and recycled contributions to each selected dependent', async () => {
    const dataPath = await tempDataPath()
    const guardian = (await loginUser(dataPath, { username: 'David Brown', password: 'Test123#' })).user
    const child = (await loginUser(dataPath, { username: 'Anisa Brown', password: 'Test123#' })).user
    const secondChild = await createUser(dataPath, {
      username: 'Second Brown Child',
      password: 'Test123#',
      repeatPassword: 'Test123#',
      ageGroup: '6–10',
      country: 'Canada',
      connector: 'David Brown',
      guardianUsername: 'David Brown',
    })

    const result = await createClaims(dataPath, {
      actorUserId: guardian.id,
      targetUserIds: [child.id, secondChild.id],
      action: 'recycled',
      amount: 25,
    })
    const snapshot = await loadSnapshot(dataPath)
    const contributionUserIds = snapshot.contributions.filter((item) => result.claims.some((claim) => claim.id === item.sourceClaimId)).map((item) => item.contributorUserId).sort()
    const childLogin = await loginUser(dataPath, { username: 'Anisa Brown', password: 'Test123#' })

    expect(result.claims).toHaveLength(2)
    expect(result.claims).toEqual(expect.arrayContaining([
      expect.objectContaining({ actorUserId: guardian.id, userId: child.id, profileId: child.profileId, targetName: 'Anisa Brown' }),
      expect.objectContaining({ actorUserId: guardian.id, userId: secondChild.id, profileId: secondChild.profileId, targetName: 'Second Brown Child' }),
    ]))
    expect(contributionUserIds).toEqual([child.id, secondChild.id].sort())
    expect(childLogin.claims).toContainEqual(expect.objectContaining({ userId: child.id, action: 'recycled' }))
  })
})
