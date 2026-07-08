export type AllocationMode = 'humanity' | 'hybrid99' | 'stewardship' | 'custom'

export type ParticipantImpactInput = {
  lifetimeClaimed: number
  lifetimeRecycled: number
  lifetimeContributedBack: number
  years: number
  annualGrowth: number
}

export function calculateDynamicPayout(averageGrowth: number): number {
  if (averageGrowth <= 0) return 0
  return averageGrowth * 0.3
}

export function calculateAllocation(
  amount: number,
  mode: AllocationMode,
  customHumanityPercent = 100,
): { humanityFund: number; stewardshipReserve: number } {
  const safeAmount = Math.max(0, amount)
  let humanityPercent = 1

  if (mode === 'hybrid99') humanityPercent = 0.99
  if (mode === 'stewardship') humanityPercent = 0
  if (mode === 'custom') {
    humanityPercent = Math.min(1, Math.max(0, customHumanityPercent / 100))
  }

  const humanityFund = Math.round(safeAmount * humanityPercent * 100) / 100
  const stewardshipReserve = Math.round((safeAmount - humanityFund) * 100) / 100

  return { humanityFund, stewardshipReserve }
}

export function compoundValue(amount: number, annualGrowth: number, years: number): number {
  return amount * (1 + annualGrowth) ** years
}

export function calculateParticipantImpact(input: ParticipantImpactInput): {
  cumulativeContributionCredit: number
  totalParticipantBenefitHistory: number
  projectedFutureImpact: number
} {
  const cumulativeContributionCredit = input.lifetimeRecycled + input.lifetimeContributedBack
  const totalParticipantBenefitHistory = cumulativeContributionCredit + input.lifetimeClaimed
  const projectedFutureImpact = compoundValue(
    cumulativeContributionCredit,
    input.annualGrowth,
    input.years,
  )

  return {
    cumulativeContributionCredit,
    totalParticipantBenefitHistory,
    projectedFutureImpact,
  }
}

export function calculatePayoutScenario({
  endowmentValue,
  averageGrowth,
  activeClaimants,
  recycleRate,
}: {
  endowmentValue: number
  averageGrowth: number
  activeClaimants: number
  recycleRate: number
}): {
  payoutRate: number
  annualPool: number
  annualPerClaimant: number
  quarterlyPerClaimant: number
  recycledAmount: number
  claimedAmount: number
} {
  const payoutRate = calculateDynamicPayout(averageGrowth)
  const annualPool = endowmentValue * payoutRate
  const safeClaimants = Math.max(1, activeClaimants)
  const annualPerClaimant = annualPool / safeClaimants
  const quarterlyPerClaimant = annualPerClaimant / 4
  const recycledAmount = annualPool * recycleRate
  const claimedAmount = annualPool - recycledAmount

  return {
    payoutRate,
    annualPool,
    annualPerClaimant,
    quarterlyPerClaimant,
    recycledAmount,
    claimedAmount,
  }
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value)
}

export function formatCompactMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)
}
