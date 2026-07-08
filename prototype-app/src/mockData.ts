import type { AllocationMode } from './model'

export const dashboardSample = {
  totalContributions: 725_000_000,
  humanityFundContributions: 711_800_000,
  stewardshipContributions: 13_200_000,
  currentEndowment: 812_400_000,
  cumulativeParticipantBenefits: 18_600_000,
  recycledBenefits: 7_450_000,
  verifiedReach: 1_240_000,
  connectorReach: 186_000,
  averageGrowth: 0.1,
  activeClaimants: 420_000,
  recycleRate: 0.28,
}

export const participantSample = {
  name: 'Prototype participant',
  status: 'Connected simulation',
  connector: 'LOCAL-GROVE-042',
  nextBenefit: 42.5,
  lifetimeClaimed: 120,
  lifetimeRecycled: 80,
  lifetimeContributedBack: 50,
  directConnections: 12,
  secondDegreeConnections: 86,
  rippleConnections: 412,
}

export const allocationOptions: Array<{
  id: AllocationMode
  label: string
  description: string
  humanityPercent: number
}> = [
  {
    id: 'humanity',
    label: 'Humanity Fund',
    description: 'Default: mission-locked capital for long-term shared ownership.',
    humanityPercent: 100,
  },
  {
    id: 'hybrid99',
    label: '99% Humanity Fund / 1% Stewardship Fund',
    description: 'Small operating support while keeping almost everything in the Humanity Fund.',
    humanityPercent: 99,
  },
  {
    id: 'stewardship',
    label: 'Stewardship Fund',
    description: 'Supports legal, audit, platform, verification, governance, and public accountability capacity.',
    humanityPercent: 0,
  },
]

export const contributionCircles = [
  ['Seed', 'under $10'],
  ['Sprout', '$10+'],
  ['Sapling', '$100+'],
  ['Olive', '$1,000+'],
  ['Maple', '$10,000+'],
  ['Sequoia', '$100,000+'],
  ['Grove', '$1M+'],
  ['Orchard', '$10M+'],
  ['Forest', '$100M+'],
  ['Rainforest', '$1B+'],
]

export const connectorCircles = [
  ['Human connector', 'under 10 verified humans helped'],
  ['Local connector', '10+ verified humans helped'],
  ['Community connector', '100+ verified humans helped'],
  ['Regional connector', '1,000+ verified humans helped'],
  ['National connector', '10,000+ verified humans helped'],
  ['Global connector', '100,000+ verified humans helped'],
]

export const countrySamples = [
  { country: 'Canada', people: 86000, contributions: 24_600_000, connectors: 12400, claimants: 18400 },
  { country: 'India', people: 310000, contributions: 42_200_000, connectors: 44200, claimants: 88200 },
  { country: 'Nigeria', people: 128000, contributions: 11_800_000, connectors: 18700, claimants: 41600 },
  { country: 'Brazil', people: 98000, contributions: 16_400_000, connectors: 15100, claimants: 29400 },
]

export const ageGroupSamples = [
  ['Child 0–15', 94000],
  ['Youth 16–20', 126000],
  ['21–25', 144000],
  ['26–35', 238000],
  ['36–50', 284000],
  ['51+', 354000],
]

export const profileTypeSamples = [
  ['Individuals', 820000],
  ['Children / guardian-linked', 94000],
  ['Faith groups', 3200],
  ['Organizations', 1800],
  ['In memory / in honour', 12600],
]
