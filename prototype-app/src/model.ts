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

export function splitContributionEqually(amount: number, recipientCount: number): number[] {
  const safeRecipientCount = Math.max(0, Math.floor(recipientCount))
  if (safeRecipientCount === 0) return []

  const totalCents = Math.max(0, Math.round((Number.isFinite(amount) ? amount : 0) * 100))
  const baseCents = Math.floor(totalCents / safeRecipientCount)
  const remainderCents = totalCents % safeRecipientCount

  return Array.from({ length: safeRecipientCount }, (_, index) => (baseCents + (index < remainderCents ? 1 : 0)) / 100)
}

export type ContributionAccountingEntry = {
  amount: number
  humanityFund: number
  stewardshipReserve: number
  actorUserId?: string
  contributorUserId?: string
  profileId?: string
  sourceClaimId?: string
  recordKind?: 'contribution' | 'recycled-benefit'
}

function isRecycledBenefitEntry(entry: ContributionAccountingEntry) {
  return Boolean(entry.sourceClaimId) || entry.recordKind === 'recycled-benefit'
}

function totalContributionField(entries: ContributionAccountingEntry[], field: 'amount' | 'humanityFund' | 'stewardshipReserve') {
  return Math.round(entries.reduce((total, entry) => total + Math.max(0, Number(entry[field]) || 0), 0) * 100) / 100
}

export function calculateContributionAccounting<T extends ContributionAccountingEntry>(entries: T[], userId: string, profileId: string) {
  const recordedByUser = entries.filter((entry) => entry.contributorUserId === userId || entry.actorUserId === userId)
  const selfContributions = recordedByUser.filter((entry) => entry.profileId === profileId)
  const onBehalfContributions = recordedByUser.filter((entry) => entry.profileId !== profileId)
  const fundContributions = entries.filter((entry) => !isRecycledBenefitEntry(entry))
  const selfFundContributions = selfContributions.filter((entry) => !isRecycledBenefitEntry(entry))
  const onBehalfFundContributions = onBehalfContributions.filter((entry) => !isRecycledBenefitEntry(entry))
  const recordedFundContributions = recordedByUser.filter((entry) => !isRecycledBenefitEntry(entry))
  const creditedToProfile = entries.filter((entry) => entry.profileId === profileId)
  const creditedFundInflows = fundContributions.filter((entry) => entry.profileId === profileId)
  const receivedFromOthers = creditedToProfile.filter((entry) => entry.contributorUserId !== userId)
  const recognitionCreditTotal = totalContributionField(creditedToProfile, 'amount')

  return {
    recordedByUser,
    selfContributions,
    selfFundContributions,
    onBehalfContributions,
    creditedToProfile,
    receivedFromOthers,
    selfHumanityFundTotal: totalContributionField(selfFundContributions, 'humanityFund'),
    selfStewardshipFundTotal: totalContributionField(selfFundContributions, 'stewardshipReserve'),
    selfContributionTotal: totalContributionField(selfFundContributions, 'amount'),
    onBehalfContributionTotal: totalContributionField(onBehalfFundContributions, 'amount'),
    onBehalfRecognitionTotal: totalContributionField(onBehalfContributions, 'amount'),
    recordedContributionTotal: totalContributionField(recordedFundContributions, 'amount'),
    receivedContributionTotal: totalContributionField(receivedFromOthers, 'amount'),
    creditedToProfileTotal: recognitionCreditTotal,
    recognitionCreditTotal,
    creditedFundInflowTotal: totalContributionField(creditedFundInflows, 'amount'),
  }
}

export type IllustrativeFundClaim = {
  action: 'claimed' | 'recycled'
  amount: number
}

function roundMoney(value: number) {
  return Math.round(Math.max(0, value) * 100) / 100
}

export function calculateIllustrativeFundAccounting({
  contributions,
  claims,
  averageGrowth,
  activeClaimants,
}: {
  contributions: ContributionAccountingEntry[]
  claims: IllustrativeFundClaim[]
  averageGrowth: number
  activeClaimants: number
}) {
  const fundInflows = contributions.filter((contribution) => !isRecycledBenefitEntry(contribution))
  const recycledEntries = contributions.filter((contribution) => isRecycledBenefitEntry(contribution))
  const humanityFundContributions = totalContributionField(fundInflows, 'humanityFund')
  const stewardshipContributions = totalContributionField(fundInflows, 'stewardshipReserve')
  const totalContributions = roundMoney(humanityFundContributions + stewardshipContributions)
  const paidBenefits = roundMoney(claims.filter((claim) => claim.action === 'claimed').reduce((total, claim) => total + Math.max(0, Number(claim.amount) || 0), 0))
  const recycledBenefits = roundMoney(claims.filter((claim) => claim.action === 'recycled').reduce((total, claim) => total + Math.max(0, Number(claim.amount) || 0), 0))
  const recycledStewardshipTransfers = totalContributionField(recycledEntries, 'stewardshipReserve')
  const safeGrowth = Math.max(0, Number(averageGrowth) || 0)
  const modeledGrowth = roundMoney(humanityFundContributions * safeGrowth)
  const stewardshipFundBalance = roundMoney(stewardshipContributions + recycledStewardshipTransfers)
  const humanityFundBalance = roundMoney(humanityFundContributions + modeledGrowth - paidBenefits - recycledStewardshipTransfers)
  const currentFundValue = roundMoney(humanityFundBalance + stewardshipFundBalance)
  const payoutRate = calculateDynamicPayout(safeGrowth)
  const annualClaimPool = roundMoney(humanityFundBalance * payoutRate)
  const annualPerClaimant = annualClaimPool / Math.max(1, Math.floor(activeClaimants) || 1)
  const quarterlyPerClaimant = annualPerClaimant / 4

  return {
    humanityFundContributions,
    stewardshipContributions,
    totalContributions,
    paidBenefits,
    recycledBenefits,
    recycledStewardshipTransfers,
    modeledGrowth,
    currentFundValue,
    humanityFundBalance,
    stewardshipFundBalance,
    payoutRate,
    annualClaimPool,
    annualPerClaimant,
    quarterlyPerClaimant,
  }
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
