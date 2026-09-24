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

function roundMoney(value: number) {
  return Math.round(Math.max(0, value) * 100) / 100
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

export type ClaimAccountingEntry = {
  id?: string
  amount: number
  action: 'claimed' | 'recycled'
  actorUserId?: string
  userId?: string
  profileId?: string
}

export type RecycledBenefitDestination = {
  sourceClaimId?: string
  profileId?: string
  amount?: number
}

export type ClaimRecipientKind = 'yourself' | 'dependents' | 'onBehalfOfOthers'

type ClaimRecipientSummary<T extends ClaimAccountingEntry> = {
  records: T[]
  claimedAmount: number
  recycledAmount: number
  totalAmount: number
}

function isClaimRecordedByUser(entry: ClaimAccountingEntry, userId: string) {
  return entry.actorUserId === userId || (!entry.actorUserId && entry.userId === userId)
}

function attributedRecipientKind(
  attributed: { userId?: string; profileId?: string },
  userId: string,
  profileId: string,
  dependentUserIds: Set<string>,
  dependentProfileIds: Set<string>,
): ClaimRecipientKind {
  if (attributed.profileId) {
    if (profileId && attributed.profileId === profileId) return 'yourself'
    if (dependentProfileIds.has(attributed.profileId)) return 'dependents'
    return 'onBehalfOfOthers'
  }
  if (attributed.userId === userId) return 'yourself'
  if (attributed.userId && dependentUserIds.has(attributed.userId)) return 'dependents'
  return 'onBehalfOfOthers'
}

function emptyClaimRecipientSummary<T extends ClaimAccountingEntry>(): ClaimRecipientSummary<T> {
  return { records: [], claimedAmount: 0, recycledAmount: 0, totalAmount: 0 }
}

function addClaimRecipientAmount<T extends ClaimAccountingEntry>(
  bucket: ClaimRecipientSummary<T>,
  claim: T,
  amount: number,
) {
  const safeAmount = roundMoney(Math.max(0, Number(amount) || 0))
  if (safeAmount <= 0) return
  if (!bucket.records.includes(claim)) bucket.records.push(claim)
  if (claim.action === 'claimed') bucket.claimedAmount = roundMoney(bucket.claimedAmount + safeAmount)
  else bucket.recycledAmount = roundMoney(bucket.recycledAmount + safeAmount)
  bucket.totalAmount = roundMoney(bucket.claimedAmount + bucket.recycledAmount)
}

function recycledDestinationAmounts(claim: ClaimAccountingEntry, destinations: RecycledBenefitDestination[]) {
  const specified = destinations.map((destination) => ({
    profileId: destination.profileId,
    amount: roundMoney(Math.max(0, Number(destination.amount) || 0)),
  }))
  if (specified.some((destination) => destination.amount > 0)) return specified.filter((destination) => destination.amount > 0)
  const splitAmounts = splitContributionEqually(claim.amount, destinations.length)
  return destinations.map((destination, index) => ({ profileId: destination.profileId, amount: splitAmounts[index] ?? 0 }))
}

export function calculateClaimAccounting<T extends ClaimAccountingEntry>(
  claims: T[],
  userId: string,
  profileId: string,
  dependents: Array<{ id: string; profileId?: string }> = [],
  recycledDestinations: RecycledBenefitDestination[] = [],
) {
  const dependentUserIds = new Set(dependents.map((dependent) => dependent.id).filter(Boolean))
  const dependentProfileIds = new Set(dependents.flatMap((dependent) => dependent.profileId ? [dependent.profileId] : []))
  const destinationsByClaimId = recycledDestinations.reduce((destinations, destination) => {
    const claimId = destination.sourceClaimId
    if (!claimId) return destinations
    const existing = destinations.get(claimId) ?? []
    existing.push(destination)
    destinations.set(claimId, existing)
    return destinations
  }, new Map<string, RecycledBenefitDestination[]>())
  const recordedByUser = claims.filter((claim) => isClaimRecordedByUser(claim, userId))
  const yourself = emptyClaimRecipientSummary<T>()
  const dependentRecords = emptyClaimRecipientSummary<T>()
  const onBehalfOfOthers = emptyClaimRecipientSummary<T>()
  const buckets: Record<ClaimRecipientKind, ClaimRecipientSummary<T>> = {
    yourself,
    dependents: dependentRecords,
    onBehalfOfOthers,
  }

  for (const claim of recordedByUser) {
    const linkedDestinations = claim.action === 'recycled' && claim.id ? destinationsByClaimId.get(claim.id) ?? [] : []
    if (linkedDestinations.length > 0) {
      for (const destination of recycledDestinationAmounts(claim, linkedDestinations)) {
        const kind = destination.profileId
          ? attributedRecipientKind(destination, userId, profileId, dependentUserIds, dependentProfileIds)
          : attributedRecipientKind(claim, userId, profileId, dependentUserIds, dependentProfileIds)
        addClaimRecipientAmount(buckets[kind], claim, destination.amount)
      }
      continue
    }
    addClaimRecipientAmount(buckets[attributedRecipientKind(claim, userId, profileId, dependentUserIds, dependentProfileIds)], claim, claim.amount)
  }

  return {
    recordedByUser,
    yourself,
    dependents: dependentRecords,
    onBehalfOfOthers,
    others: onBehalfOfOthers,
  }
}

export type IllustrativeFundClaim = {
  action: 'claimed' | 'recycled'
  amount: number
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

export type ConnectorRippleParticipant = {
  id: string
  username: string
  connector?: string
}

export type ConnectorRippleOrder = {
  label: string
  value: number
  note: string
  celebratory: boolean
  runningTotal: number
}

const CONNECTOR_RIPPLE_ORDER_META = [
  { label: 'Direct connectors', note: 'people who named you directly', celebratory: false },
  { label: 'Second-order ripple', note: 'people reached through your direct connectors', celebratory: true },
  { label: 'Third-order ripple', note: 'one more step through the network', celebratory: true },
  { label: 'Fourth-order ripple', note: 'the next wave through the network', celebratory: true },
  { label: 'Fifth-order ripple', note: 'fifth and further hops through the network', celebratory: true },
] as const

export function getConnectorRippleOrders(
  user: ConnectorRippleParticipant | null | undefined,
  users: ConnectorRippleParticipant[],
): ConnectorRippleOrder[] {
  const counts = [0, 0, 0, 0, 0]
  if (user) {
    const remaining = users.filter((item) => item.id !== user.id)
    const seenUsernames = new Set<string>([user.username])
    let frontier = new Set<string>([user.username])
    for (let depth = 0; depth < counts.length; depth += 1) {
      const next = remaining.filter((item) => frontier.has(item.connector ?? '') && !seenUsernames.has(item.username))
      counts[depth] = next.length
      for (const item of next) seenUsernames.add(item.username)
      frontier = new Set(next.map((item) => item.username))
      if (depth !== counts.length - 1) continue
      while (frontier.size > 0) {
        const more = remaining.filter((item) => frontier.has(item.connector ?? '') && !seenUsernames.has(item.username))
        if (more.length === 0) break
        counts[depth] += more.length
        for (const item of more) seenUsernames.add(item.username)
        frontier = new Set(more.map((item) => item.username))
      }
    }
  }

  return CONNECTOR_RIPPLE_ORDER_META.map((meta, index) => ({
    ...meta,
    value: counts[index],
    runningTotal: counts.slice(0, index + 1).reduce((total, value) => total + value, 0),
  }))
}
