import { describe, expect, it } from 'vitest'
import {
  calculateDynamicPayout,
  calculateAllocation,
  calculateContributionAccounting,
  calculateIllustrativeFundAccounting,
  calculateParticipantImpact,
} from './model'
import * as contributionModel from './model'

describe('dynamic payout model', () => {
  it('returns zero payout when average growth is zero or negative', () => {
    expect(calculateDynamicPayout(0)).toBe(0)
    expect(calculateDynamicPayout(-0.08)).toBe(0)
  })

  it('uses 3% payout for every 10% average growth', () => {
    expect(calculateDynamicPayout(0.05)).toBeCloseTo(0.015)
    expect(calculateDynamicPayout(0.1)).toBeCloseTo(0.03)
    expect(calculateDynamicPayout(0.2)).toBeCloseTo(0.06)
    expect(calculateDynamicPayout(0.3)).toBeCloseTo(0.09)
  })
})

describe('illustrative fund accounting', () => {
  it('keeps Stewardship separate and deducts paid benefits from the Humanity Fund', () => {
    const accounting = calculateIllustrativeFundAccounting({
      contributions: [
        { amount: 100, humanityFund: 100, stewardshipReserve: 0 },
        { amount: 50, humanityFund: 0, stewardshipReserve: 50 },
        { amount: 20, humanityFund: 0, stewardshipReserve: 20, sourceClaimId: 'claim-recycled-stewardship', recordKind: 'recycled-benefit' },
      ],
      claims: [
        { action: 'claimed', amount: 10 },
        { action: 'recycled', amount: 20 },
      ],
      averageGrowth: 0.1,
      activeClaimants: 4,
    })

    expect(accounting.totalContributions).toBe(150)
    expect(accounting.modeledGrowth).toBe(10)
    expect(accounting.paidBenefits).toBe(10)
    expect(accounting.recycledStewardshipTransfers).toBe(20)
    expect(accounting.humanityFundBalance).toBe(80)
    expect(accounting.stewardshipFundBalance).toBe(70)
    expect(accounting.currentFundValue).toBe(150)
    expect(accounting.annualClaimPool).toBeCloseTo(2.4)
    expect(accounting.quarterlyPerClaimant).toBeCloseTo(0.15)
  })

  it('does not count a recycled benefit as a second fund inflow while subtracting paid benefits', () => {
    const accounting = calculateIllustrativeFundAccounting({
      contributions: [
        { amount: 100, humanityFund: 100, stewardshipReserve: 0 },
        { amount: 40, humanityFund: 0, stewardshipReserve: 40, sourceClaimId: 'claim-recycled-1', recordKind: 'recycled-benefit' },
      ],
      claims: [
        { action: 'claimed', amount: 10 },
        { action: 'recycled', amount: 40 },
      ],
      averageGrowth: 0.1,
      activeClaimants: 4,
    })

    expect(accounting.totalContributions).toBe(100)
    expect(accounting.paidBenefits).toBe(10)
    expect(accounting.recycledBenefits).toBe(40)
    expect(accounting.modeledGrowth).toBe(10)
    expect(accounting.currentFundValue).toBe(100)
    expect(accounting.recycledStewardshipTransfers).toBe(40)
    expect(accounting.stewardshipFundBalance).toBe(40)
    expect(accounting.humanityFundBalance).toBe(60)
    expect(accounting.annualClaimPool).toBeCloseTo(1.8)
    expect(accounting.quarterlyPerClaimant).toBeCloseTo(0.1125)
  })

  it('keeps recycled Humanity Fund benefits in the Humanity balance without adding inflow', () => {
    const accounting = calculateIllustrativeFundAccounting({
      contributions: [
        { amount: 100, humanityFund: 100, stewardshipReserve: 0 },
        { amount: 40, humanityFund: 40, stewardshipReserve: 0, sourceClaimId: 'claim-recycled-2', recordKind: 'recycled-benefit' },
      ],
      claims: [
        { action: 'claimed', amount: 10 },
        { action: 'recycled', amount: 40 },
      ],
      averageGrowth: 0.1,
      activeClaimants: 4,
    })

    expect(accounting.totalContributions).toBe(100)
    expect(accounting.paidBenefits).toBe(10)
    expect(accounting.recycledBenefits).toBe(40)
    expect(accounting.modeledGrowth).toBe(10)
    expect(accounting.currentFundValue).toBe(100)
    expect(accounting.recycledStewardshipTransfers).toBe(0)
    expect(accounting.stewardshipFundBalance).toBe(0)
    expect(accounting.humanityFundBalance).toBe(100)
  })
})

describe('contribution allocation', () => {
  it('defaults future contributions fully to the Humanity Fund', () => {
    expect(calculateAllocation(1000, 'humanity')).toEqual({
      humanityFund: 1000,
      stewardshipReserve: 0,
    })
  })

  it('supports a 99/1 Humanity Fund and Stewardship Reserve split', () => {
    expect(calculateAllocation(1000, 'hybrid99')).toEqual({
      humanityFund: 990,
      stewardshipReserve: 10,
    })
  })

  it('supports contributing fully to the Stewardship Fund', () => {
    expect(calculateAllocation(1000, 'stewardship')).toEqual({
      humanityFund: 0,
      stewardshipReserve: 1000,
    })
  })

  it('splits a total contribution across dependents without duplicating its value', () => {
    const splitContributionEqually = (contributionModel as typeof contributionModel & { splitContributionEqually?: (amount: number, recipientCount: number) => number[] }).splitContributionEqually

    expect(splitContributionEqually).toEqual(expect.any(Function))
    if (!splitContributionEqually) return
    expect(splitContributionEqually(4, 2)).toEqual([2, 2])
    expect(splitContributionEqually(10, 3)).toEqual([3.34, 3.33, 3.33])
    expect(splitContributionEqually(10, 3).reduce((total, amount) => total + amount, 0)).toBe(10)
    expect(splitContributionEqually(4, 0)).toEqual([])
  })

  it('keeps a contributor’s own fund credit separate from amounts recorded on behalf of another profile', () => {
    const accounting = calculateContributionAccounting([
      { amount: 10, humanityFund: 9, stewardshipReserve: 1, contributorUserId: 'user-david', profileId: 'profile-david' },
      { amount: 4, humanityFund: 4, stewardshipReserve: 0, contributorUserId: 'user-david', profileId: 'profile-amelia' },
      { amount: 7, humanityFund: 6.93, stewardshipReserve: 0.07, contributorUserId: 'user-amina', profileId: 'profile-david' },
      { amount: 2, humanityFund: 2, stewardshipReserve: 0, contributorUserId: 'user-amina', profileId: 'profile-anisa' },
    ], 'user-david', 'profile-david')

    expect(accounting.recordedByUser).toHaveLength(2)
    expect(accounting.selfContributions).toHaveLength(1)
    expect(accounting.onBehalfContributions).toHaveLength(1)
    expect(accounting.receivedFromOthers).toHaveLength(1)
    expect(accounting.selfHumanityFundTotal).toBe(9)
    expect(accounting.selfStewardshipFundTotal).toBe(1)
    expect(accounting.selfContributionTotal).toBe(10)
    expect(accounting.onBehalfContributionTotal).toBe(4)
    expect(accounting.recordedContributionTotal).toBe(14)
    expect(accounting.receivedContributionTotal).toBe(7)
    expect(accounting.creditedToProfileTotal).toBe(17)
  })

  it('keeps a guardian-recorded recycled benefit in the guardian ledger without moving the dependent value source', () => {
    const accounting = calculateContributionAccounting([
      { amount: 10, humanityFund: 10, stewardshipReserve: 0, contributorUserId: 'user-guardian', profileId: 'profile-guardian' },
      { amount: 25, humanityFund: 25, stewardshipReserve: 0, contributorUserId: 'user-child', actorUserId: 'user-guardian', profileId: 'profile-faith', sourceClaimId: 'claim-child-1', recordKind: 'recycled-benefit' },
    ], 'user-guardian', 'profile-guardian')

    expect(accounting.recordedByUser).toHaveLength(2)
    expect(accounting.selfContributionTotal).toBe(10)
    expect(accounting.onBehalfContributionTotal).toBe(0)
    expect(accounting.onBehalfRecognitionTotal).toBe(25)
    expect(accounting.recordedContributionTotal).toBe(10)
    expect(accounting.creditedToProfileTotal).toBe(10)
    expect(accounting.recognitionCreditTotal).toBe(10)
    expect(accounting.creditedFundInflowTotal).toBe(10)
  })

  it('counts recycled benefits as recognition credit without treating them as fund inflows', () => {
    const accounting = calculateContributionAccounting([
      { amount: 100, humanityFund: 100, stewardshipReserve: 0, contributorUserId: 'user-david', profileId: 'profile-david' },
      { amount: 40, humanityFund: 40, stewardshipReserve: 0, contributorUserId: 'user-david', profileId: 'profile-david', sourceClaimId: 'claim-1', recordKind: 'recycled-benefit' },
      { amount: 25, humanityFund: 0, stewardshipReserve: 25, contributorUserId: 'user-david', actorUserId: 'user-david', profileId: 'profile-amelia', sourceClaimId: 'claim-2', recordKind: 'recycled-benefit' },
    ], 'user-david', 'profile-david')

    expect(accounting.selfContributionTotal).toBe(100)
    expect(accounting.onBehalfContributionTotal).toBe(0)
    expect(accounting.onBehalfRecognitionTotal).toBe(25)
    expect(accounting.creditedToProfileTotal).toBe(140)
    expect(accounting.recognitionCreditTotal).toBe(140)
    expect(accounting.creditedFundInflowTotal).toBe(100)
  })
})

describe('participant impact credit', () => {
  it('credits recycled and contributed-back benefits as participant contribution impact', () => {
    const impact = calculateParticipantImpact({
      lifetimeClaimed: 120,
      lifetimeRecycled: 80,
      lifetimeContributedBack: 50,
      years: 10,
      annualGrowth: 0.08,
    })

    expect(impact.cumulativeContributionCredit).toBe(130)
    expect(impact.totalParticipantBenefitHistory).toBe(250)
    expect(impact.projectedFutureImpact).toBeGreaterThan(280)
  })
})
