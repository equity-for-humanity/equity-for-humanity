import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import { dashboardSample } from '../src/mockData.ts'
import { createSeedData } from './prototype-store.mjs'
import { createSeedData as createCloudflareSeedData } from '../functions/_shared/cloudflare-store.js'

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const prohibitedPublicSeedIdentities = ['David Brown', 'Anisa Brown', 'Elon Musk', 'Greta Thunberg', 'Sam Altman', 'Malala Yousafzai']

describe('fictional canonical fixture contract', () => {
  it('builds a deterministic, role-safe scenario with exact contribution arithmetic', () => {
    const seed = createSeedData()
    const serializedSeed = JSON.stringify(seed)

    expect(seed.version).toBe(4)
    expect(seed.updatedAt).toBe('2026-07-01T00:00:00.000Z')
    expect(seed.users).toHaveLength(109)
    expect(seed.users).toEqual(expect.arrayContaining([
      expect.objectContaining({ verificationMethod: 'demo-simulation', proofOfHuman: false }),
    ]))
    expect(seed.users.every((user) => !Object.hasOwn(user, 'password'))).toBe(true)
    const loginFixtures = seed.users.filter((user) => user.passwordHash)
    expect(loginFixtures).toHaveLength(13)
    expect(loginFixtures.every((user) => /^scrypt:[^:]+:[a-f0-9]{128}$/.test(user.passwordHash))).toBe(true)
    expect(seed.users.every((user) => !user.verifiedHumanAt)).toBe(true)
    expect(seed.contributions.every((entry) => Math.round((entry.humanityFund + entry.stewardshipReserve) * 100) === Math.round(entry.amount * 100))).toBe(true)
    expect(seed.contributions.every((entry) => entry.simulation === true)).toBe(true)
    expect(seed.claims.every((entry) => entry.simulation === true)).toBe(true)

    for (const identity of prohibitedPublicSeedIdentities) expect(serializedSeed).not.toContain(identity)
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
    })
  })
})
