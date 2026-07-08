import { describe, expect, it } from 'vitest'
import {
  calculateDynamicPayout,
  calculateAllocation,
  calculateParticipantImpact,
} from './model'

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
