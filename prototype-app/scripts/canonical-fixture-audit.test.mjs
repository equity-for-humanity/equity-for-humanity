import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { dashboardSample } from '../src/mockData.ts'
import { getConnectorRippleOrders } from '../src/model.ts'
import { createSeedData, prepareSnapshotForRead } from './prototype-store.mjs'
import { createSeedData as createCloudflareSeedData } from '../functions/_shared/cloudflare-store.js'

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const prohibitedPublicSeedIdentities = ['David Brown', 'Anisa Brown', 'Elon Musk', 'Greta Thunberg', 'Sam Altman', 'Malala Yousafzai']
const DAVID_HUB_USER_ID = 'user-david-brown'

function attributedClaimerIds(seed) {
  const ids = new Set()
  const profileIds = new Set()
  for (const claim of seed.claims) {
    if (claim.userId) ids.add(claim.userId)
    if (claim.actorUserId) ids.add(claim.actorUserId)
    if (claim.profileId) profileIds.add(claim.profileId)
  }
  return seed.users.filter((user) => ids.has(user.id) || profileIds.has(user.profileId))
}

describe('fictional canonical fixture contract', () => {
  it('builds a deterministic, role-safe scenario with exact contribution arithmetic', () => {
    const seed = createSeedData()
    const serializedSeed = JSON.stringify(seed)

    expect(seed.version).toBe(5)
    expect(seed.updatedAt).toBe('2026-07-01T00:00:00.000Z')
    expect(seed.users).toHaveLength(109)
    expect(seed.users).toEqual(expect.arrayContaining([
      expect.objectContaining({ verificationMethod: 'demo-simulation', proofOfHuman: false }),
    ]))
    expect(seed.users.every((user) => !Object.hasOwn(user, 'password'))).toBe(true)
    const loginFixtures = seed.users.filter((user) => user.passwordHash)
    expect(loginFixtures).toHaveLength(13)
    expect(loginFixtures.every((user) => /^scrypt:[^:]+:[a-f0-9]{128}$/.test(user.passwordHash))).toBe(true)
    expect(seed.contributions.every((entry) => Math.round((entry.humanityFund + entry.stewardshipReserve) * 100) === Math.round(entry.amount * 100))).toBe(true)
    expect(seed.contributions.every((entry) => entry.simulation === true)).toBe(true)
    expect(seed.claims.every((entry) => entry.simulation === true)).toBe(true)

    for (const identity of prohibitedPublicSeedIdentities) expect(serializedSeed).not.toContain(identity)
  })

  it('marks every seed claimer verified so claim records cannot exist without verification', () => {
    const seed = createSeedData()
    const claimers = attributedClaimerIds(seed)
    expect(claimers.length).toBeGreaterThan(0)
    expect(claimers.every((user) => Boolean(user.verifiedHumanAt))).toBe(true)
    expect(seed.funds.verifiedReach).toBe(seed.users.filter((user) => user.verifiedHumanAt).length)
  })

  it('restores verification on claim-attributed users when a snapshot is prepared', () => {
    const seed = createSeedData()
    const claimer = attributedClaimerIds(seed)[0]
    expect(claimer).toBeTruthy()
    delete claimer.verifiedHumanAt
    delete claimer.verificationStatus
    prepareSnapshotForRead(seed)
    const restored = seed.users.find((user) => user.id === claimer.id)
    expect(restored.verifiedHumanAt).toEqual(expect.any(String))
  })

  it('connects the 109 seed people through a multi-level connector graph from the David hub', () => {
    const seed = createSeedData()
    const david = seed.users.find((user) => user.id === DAVID_HUB_USER_ID)
    expect(david).toEqual(expect.objectContaining({ connector: '', connectorSelfDirected: true }))
    expect(seed.users.filter((user) => user.id !== david.id).every((user) => user.connector && user.connector !== user.username && !user.connectorSelfDirected)).toBe(true)

    const orders = getConnectorRippleOrders(david, seed.users)
    expect(orders[0].value).toBeGreaterThan(1)
    expect(orders[1].value).toBeGreaterThan(1)
    expect(orders[2].value).toBeGreaterThan(1)
    expect(orders[3].value).toBeGreaterThan(1)
    expect(orders[orders.length - 1].runningTotal).toBe(seed.users.length - 1)
    expect(seed.funds.connectorReach).toBe(seed.users.filter((user) => user.connector).length)
    expect(seed.funds.connectorReach).toBe(108)
  })

  it('keeps Recognition connector-ripple counts aligned with the David hub graph', () => {
    const seed = createSeedData()
    const cloudflareSeed = createCloudflareSeedData()
    const david = seed.users.find((user) => user.id === DAVID_HUB_USER_ID)
    const cloudflareDavid = cloudflareSeed.users.find((user) => user.id === DAVID_HUB_USER_ID)
    const localOrders = getConnectorRippleOrders(david, seed.users)
    const cloudflareOrders = getConnectorRippleOrders(cloudflareDavid, cloudflareSeed.users)

    expect(localOrders.map((order) => order.value)).toEqual([16, 33, 29, 21, 9])
    expect(cloudflareOrders.map((order) => order.value)).toEqual(localOrders.map((order) => order.value))
    expect(appSource).toContain('getConnectorRippleOrders')
    expect(appSource).toContain('recognition-ripple-orders')
    expect(appSource).not.toContain('Fourth and fifth are simple projections')
  })

  it('does not expose a shared fixture password in the canonical UI', () => {
    expect(appSource).not.toContain('Test123#')
  })

  it('keeps the fallback dashboard aligned with the fictional seed fund totals', () => {
    const funds = createSeedData().funds
    expect(dashboardSample).toMatchObject({
      totalContributions: funds.totalContributions,
      humanityFundContributions: funds.humanityFundContributions,
      stewardshipContributions: funds.stewardshipContributions,
      currentEndowment: funds.currentEndowment,
      cumulativeParticipantBenefits: funds.cumulativeParticipantBenefits,
      recycledBenefits: funds.recycledBenefits,
      totalRecordedBenefitChoices: funds.totalRecordedBenefitChoices,
      modeledGrowth: funds.modeledGrowth,
      verifiedReach: funds.verifiedReach,
      connectorReach: funds.connectorReach,
      averageGrowth: funds.averageGrowth,
      activeClaimants: funds.activeClaimants,
      recycleRate: funds.recycleRate,
    })
  })

  it('keeps Cloudflare fund accounting aligned with the canonical local seed', () => {
    const localFunds = createSeedData().funds
    const cloudflareFunds = createCloudflareSeedData().funds

    expect(cloudflareFunds).toMatchObject({
      humanityFundContributions: localFunds.humanityFundContributions,
      stewardshipContributions: localFunds.stewardshipContributions,
      modeledGrowth: localFunds.modeledGrowth,
      cumulativeParticipantBenefits: localFunds.cumulativeParticipantBenefits,
      recycledStewardshipTransfers: localFunds.recycledStewardshipTransfers,
      humanityFundBalance: localFunds.humanityFundBalance,
      stewardshipFundBalance: localFunds.stewardshipFundBalance,
      currentEndowment: localFunds.currentEndowment,
      verifiedReach: localFunds.verifiedReach,
      connectorReach: localFunds.connectorReach,
    })
  })
})
