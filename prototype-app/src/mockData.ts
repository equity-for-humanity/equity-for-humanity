import type { AllocationMode } from './model'

export const dashboardSample = {
  totalContributions: 446_763,
  humanityFundContributions: 398_203.84,
  stewardshipContributions: 48_559.16,
  currentEndowment: 486_428.38,
  cumulativeParticipantBenefits: 155,
  recycledBenefits: 80,
  recycledStewardshipTransfers: 0,
  humanityFundBalance: 437_869.22,
  stewardshipFundBalance: 48_559.16,
  totalRecordedBenefitChoices: 235,
  modeledGrowth: 39_820.38,
  verifiedReach: 2,
  connectorReach: 108,
  averageGrowth: 0.1,
  activeClaimants: 108,
  recycleRate: 0.28,
}

export const participantSample = {
  name: 'Prototype participant',
  status: 'Connected simulation',
  connector: 'LOCAL-GROVE-042',
  nextBenefit: 34.12,
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
  { country: 'Canada', people: 11, contributions: 43_787, connectors: 4, claimants: 2 },
  { country: 'India', people: 9, contributions: 34_280, connectors: 2, claimants: 0 },
  { country: 'Nigeria', people: 9, contributions: 32_896, connectors: 2, claimants: 0 },
  { country: 'Brazil', people: 9, contributions: 35_664, connectors: 2, claimants: 0 },
]

export const ageGroupSamples = [
  ['0–5', 5],
  ['6–10', 5],
  ['11–15', 6],
  ['16–20', 5],
  ['21–25', 8],
  ['26–30', 8],
]

export const profileTypeSamples = [
  ['Individual', 108],
  ['Child under 16', 1],
  ['Faith group', 1],
  ['Organization', 1],
  ['In memory of', 1],
]
