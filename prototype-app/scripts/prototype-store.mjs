import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { dirname } from 'node:path'

export const MAX_DIRECT_GUARDIAN_CONNECTIONS = 2
export const MAX_ACTIVE_CHILD_WARD_CONNECTIONS = 10

const FIXTURE_PASSWORD_HASHES = Object.freeze({
  'user-david-brown': 'scrypt:1f14b5b76caa3489f4a9e6352fee3a4e:9ac6bcfd5a50f10f7585db475d3e390a1cc4db46124ba301bb9617bef854852510d7b3bb44e4c2065bf758e84b59cd84ad620f34a4534726446619323c82e81a',
  'user-anisa-brown': 'scrypt:7981562fb6197ca32c0d609c56eacddd:16488666012c5e8cceb0754de16ed9b2b26d157b0f120def32da4ac3a205411c00946c62efcf3699a5dc1039d9d9c553a404b9ce08878476a5b5dbd760a6e94f',
  'user-phillip-chen': 'scrypt:aa7204aff64a3ca5ab2d5ef3284e2b56:437bf20b1e8111edca3593698b37e86fd9e35e77924e5189eb7e62422e840a112ec525131ee6a7f020c72aa462a5bf15aa701873f315645f1528248760bf4c72',
  'user-amina-okafor': 'scrypt:0d8131e0dcc524f2e6e940ba7bc9023c:14354645e1dcdefe04602208425c629bda29e2b78b20571b29baf4a091be8eb452661124cbc7db6f7aa062f2d1c7f0874bb29d9f7ea591439d8723ca30154f02',
  'user-priya-shah': 'scrypt:986aeb8af1e5a67a641f3072783a02ca:db26776369e7aefc9a7640908f33d53cce2df274602c8bef358ca106211c3713b5bb43367a0970ed1e5485319157be921410062fa3a0d3699c3a97ebf8ef5095',
  'user-lucas-silva': 'scrypt:2176635d22fce91d9ac04db48c97aa71:34d2c23bd25d94e1fd438a6eec49cf80bc65d62f702cee899b4c862e6fbfb61ade8fc247223480c4e538829ce2e5ad29e802cc9bc241955e48cee8f672f7ffcb',
  'user-maryam-hassan': 'scrypt:70f13a79777f75c67e566516643b49e9:7da8615b40357fab99e953338e4220147bba83e31e79051df2338e431f11caaf3ea7e5c396d1d2eca96b67441687942cb404d5093a4665d60f329cfcaec9fc89',
  'user-arden-vale': 'scrypt:4ba34f6888f68aa7b3ffe2fa0d955c68:5d1ce721d2f89ce09fa085bf1850506243ecf81670c3615664c8e324e38cfca1c16bd26cb249cd054d2c2be3321cb8cdfd1a96d1a6f940c634357852d4176bb0',
  'user-sora-lind': 'scrypt:96e6207801a086c002ad6b58c539156a:9070e4ae8d5810eabc1f4a9fd6e4e0d48fecb3ae9bb305a4d0232b75827a676134e5d6eac0dea56f8181cf54b78e6abaeeacad4e73dec3ee5e76626af1b1c64c',
  'user-leila-haddad': 'scrypt:12dc152e59c338d1f72473420417a04f:1323761468a4d4a5ba6e8c7f88ab5d02e4089e7a9502ed022872c510a4073fc0529550c45a99910759039895396b7b06c5319ac01cb238bcbc14f611e2739d90',
  'user-niko-chen': 'scrypt:3210eb9a91b83a6c6ad8ab9b621d0b49:c8088801210737b41e744444b7efbc831bb17649362ada4f939b744aa9453ff02a13277467aa182c17481002c0fb2e5de3648b5b1277da140bcd2dc50ae2d673',
  'user-samira-noor': 'scrypt:546d1c56632faceeeba45220fabfb40e:d3299eb715611ea7262719a4b176efe1b93cf211999aec788aff388330566bb0f3450d595df4bd40438fbe62a0eae467f041c1b293549233fa3f8450471a4569',
  'user-ai-agent': 'scrypt:c4009cc4852bc66ff6cc6a021fac26cf:86241f8a865563c1a60fbbd33ae82916deae7a50eb66c34c46b7c7cc00cba485b17d154ddc1d67c0b1de461ec4137291333404ea3777377823cf397f8cb4c84f',
})

function seedLoginUser(user) {
  return { ...user, passwordHash: FIXTURE_PASSWORD_HASHES[user.id] }
}

export function createSeedData() {
  const seed = {
    version: 4,
    updatedAt: '2026-07-01T00:00:00.000Z',
    users: [
      seedLoginUser({ id: 'user-david-brown', username: 'Mira North', country: 'Canada', ageGroup: '36–50', connector: 'Ivo Cedar', profileId: 'seed-profile-canada' }),
      seedLoginUser({ id: 'user-anisa-brown', username: 'Tala North', country: 'Canada', ageGroup: '11–15', connector: 'Mira North', profileId: 'seed-profile-child', guardianUserId: 'user-david-brown', guardianUsername: 'Mira North', guardianStatus: 'accepted', guardianRequestedAt: '2026-06-29T00:00:00.000Z', guardianRespondedAt: '2026-06-30T00:00:00.000Z' }),
      seedLoginUser({ id: 'user-phillip-chen', username: 'Ivo Cedar', country: 'Canada', ageGroup: '26–30', connector: 'Zuri Vale', profileId: 'user-profile-phillip' }),
      seedLoginUser({ id: 'user-amina-okafor', username: 'Zuri Vale', country: 'Nigeria', ageGroup: '21–25', connector: 'Nila Hearth', profileId: 'user-profile-amina' }),
      seedLoginUser({ id: 'user-priya-shah', username: 'Nila Hearth', country: 'India', ageGroup: '26–30', connector: 'Mira North', profileId: 'user-profile-priya' }),
      seedLoginUser({ id: 'user-lucas-silva', username: 'Sol Maren', country: 'Brazil', ageGroup: '21–25', connector: 'Luma Reed', profileId: 'user-profile-lucas' }),
      seedLoginUser({ id: 'user-maryam-hassan', username: 'Aya Fern', country: 'Egypt', ageGroup: '36–40', connector: 'Zuri Vale', profileId: 'user-profile-maryam' }),
      seedLoginUser({ id: 'user-arden-vale', username: 'Arden Vale', country: 'United States', ageGroup: '51–55', connector: 'Nico Bay', profileId: 'user-profile-arden' }),
      seedLoginUser({ id: 'user-sora-lind', username: 'Sora Linden', country: 'Sweden', ageGroup: '21–25', connector: 'Sami Skye', profileId: 'user-profile-sora' }),
      seedLoginUser({ id: 'user-leila-haddad', username: 'Luma Reed', country: 'Lebanon', ageGroup: '36–40', connector: 'Aya Fern', profileId: 'user-profile-leila' }),
      seedLoginUser({ id: 'user-niko-chen', username: 'Nico Bay', country: 'United States', ageGroup: '36–40', connector: 'Arden Vale', profileId: 'user-profile-niko' }),
      seedLoginUser({ id: 'user-samira-noor', username: 'Sami Skye', country: 'Pakistan', ageGroup: '26–30', connector: 'Sora Linden', profileId: 'user-profile-samira' }),
      seedLoginUser({ id: 'user-ai-agent', username: 'AI agent', country: 'Digital', ageGroup: 'AI agent', connector: 'Mira North', profileId: 'user-profile-ai-agent' }),
    ],
    profiles: [
      {
        id: 'seed-profile-canada',
        name: 'Mira North',
        type: 'Individual',
        country: 'Canada',
        ageGroup: '36–50',
        description: 'Individual participant profile for prototype testing.',
        connector: 'Ivo Cedar',
        createdAt: '2026-06-01T00:00:00.000Z',
      },
      {
        id: 'seed-profile-faith',
        name: 'Lantern Harbour Collective',
        type: 'Faith group',
        country: 'Canada',
        ageGroup: '51+',
        description: 'Fictional community profile for members who want their recognition grouped together.',
        connector: 'Zuri Vale',
        createdAt: '2026-06-02T00:00:00.000Z',
      },
      {
        id: 'seed-profile-memory',
        name: 'Willowlight Memorial Grove',
        type: 'In memory of',
        country: 'United Kingdom',
        ageGroup: '51+',
        description: 'A fictional memorial profile for contributions made in a loved one’s memory.',
        connector: 'Luma Reed',
        createdAt: '2026-06-03T00:00:00.000Z',
      },
      {
        id: 'seed-profile-child',
        name: 'Guardian-managed child profile',
        type: 'Child under 16',
        country: 'Nigeria',
        ageGroup: '0–5',
        description: 'Sample child participant profile managed by a parent or guardian until age 16.',
        connector: 'Mira North',
        createdAt: '2026-06-04T00:00:00.000Z',
      },
      {
        id: 'seed-profile-org-ai-lab',
        name: 'Northstar Learning Lab',
        type: 'Organization',
        country: 'United States',
        ageGroup: '36–50',
        description: 'Prototype organization profile for AI workers contributing toward shared ownership.',
        connector: 'Nico Bay',
        createdAt: '2026-06-04T00:00:00.000Z',
      },
      {
        id: 'seed-profile-honour-teacher',
        name: 'In Honour of Professor Juniper Vale',
        type: 'In honour of',
        country: 'Brazil',
        ageGroup: '51+',
        description: 'A tribute profile for a teacher recognized by former students.',
        connector: 'Sol Maren',
        createdAt: '2026-06-04T00:00:00.000Z',
      },
      {
        id: 'seed-profile-community-garden',
        name: 'Riverstone Community Garden Circle',
        type: 'Community group',
        country: 'Kenya',
        ageGroup: '26–35',
        description: 'Community profile for neighbours coordinating recognition together.',
        connector: 'Zuri Vale',
        createdAt: '2026-06-04T00:00:00.000Z',
      },

      { id: 'user-profile-phillip', name: 'Ivo Cedar', type: 'Individual', country: 'Canada', ageGroup: '26–30', description: 'Fictional connector profile for prototype login and contribution history.', connector: 'Zuri Vale', createdAt: '2026-06-04T00:00:00.000Z' },
      { id: 'user-profile-amina', name: 'Zuri Vale', type: 'Individual', country: 'Nigeria', ageGroup: '21–25', description: 'Fictional connector profile with sample contribution and claim history.', connector: 'Nila Hearth', createdAt: '2026-06-04T00:00:00.000Z' },
      { id: 'user-profile-priya', name: 'Nila Hearth', type: 'Individual', country: 'India', ageGroup: '26–30', description: 'Fictional participant and connector profile for prototype search.', connector: 'Mira North', createdAt: '2026-06-04T00:00:00.000Z' },
      { id: 'user-profile-ai-agent', name: 'AI agent', type: 'Individual', country: 'Digital', ageGroup: 'AI agent', description: 'Prototype non-human agent account category for testing.', connector: 'Mira North', createdAt: '2026-06-04T00:00:00.000Z' },
    ],
    contributions: [
      seedContribution('seed-contribution-1', 'seed-profile-canada', 'Mira North', 1200, 'humanity', 'Credit card via Stripe', 0, 'Canada', '36–50'),
      seedContribution('seed-contribution-2', 'seed-profile-faith', 'Lantern Harbour Collective', 10000, 'hybrid99', 'PayPal', 100, 'Canada', '51+'),
      seedContribution('seed-contribution-3', 'seed-profile-memory', 'Willowlight Memorial Grove', 5000, 'humanity', 'Bank transfer', 0, 'United Kingdom', '51+'),
      seedContribution('seed-contribution-4', 'seed-profile-child', 'Anonymous', 250, 'humanity', 'Credit card via Stripe', 0, 'Nigeria', '0–5'),
      seedContribution('seed-contribution-5', 'seed-profile-canada', 'Prototype participant', 725, 'stewardship', 'PayPal', 0, 'Brazil', '21–25'),
    ],
    claims: [
      { id: 'seed-claim-1', profileId: 'seed-profile-canada', action: 'recycled', amount: 80, country: 'Canada', ageGroup: '36–50', createdAt: '2026-06-05T00:00:00.000Z' },
      { id: 'seed-claim-2', profileId: 'seed-profile-canada', action: 'claimed', amount: 120, country: 'Canada', ageGroup: '36–50', createdAt: '2026-06-06T00:00:00.000Z' },
    ],
    connectorRipples: [
      { connector: 'Ivo Cedar', direct: 12, secondDegree: 86, ripple: 412 },
      { connector: 'Zuri Vale', direct: 42, secondDegree: 340, ripple: 1820 },
    ],
    countries: [
      { country: 'Canada', people: 74000, contributions: 11800000, connectors: 9000, claimants: 16000 },
      { country: 'United States', people: 86000, contributions: 15000000, connectors: 9700, claimants: 17800 },
      { country: 'India', people: 98000, contributions: 18200000, connectors: 10400, claimants: 19600 },
      { country: 'Nigeria', people: 110000, contributions: 21400000, connectors: 11100, claimants: 21400 },
      { country: 'Brazil', people: 122000, contributions: 24600000, connectors: 11800, claimants: 23200 },
      { country: 'United Kingdom', people: 134000, contributions: 27800000, connectors: 12500, claimants: 25000 },
      { country: 'Pakistan', people: 146000, contributions: 31000000, connectors: 13200, claimants: 26800 },
      { country: 'Sweden', people: 158000, contributions: 34200000, connectors: 13900, claimants: 28600 },
      { country: 'Lebanon', people: 170000, contributions: 37400000, connectors: 14600, claimants: 30400 },
      { country: 'Egypt', people: 182000, contributions: 40600000, connectors: 15300, claimants: 32200 },
      { country: 'Kenya', people: 194000, contributions: 43800000, connectors: 16000, claimants: 34000 },
      { country: 'France', people: 206000, contributions: 47000000, connectors: 16700, claimants: 35800 },
      { country: 'Germany', people: 218000, contributions: 50200000, connectors: 17400, claimants: 37600 },
      { country: 'Japan', people: 230000, contributions: 53400000, connectors: 18100, claimants: 39400 },
      { country: 'Mexico', people: 242000, contributions: 56600000, connectors: 18800, claimants: 41200 },
      { country: 'Australia', people: 254000, contributions: 59800000, connectors: 19500, claimants: 43000 },
      { country: 'South Africa', people: 266000, contributions: 63000000, connectors: 20200, claimants: 44800 },
      { country: 'Digital', people: 278000, contributions: 66200000, connectors: 20900, claimants: 46600 },
    ],
    ageGroups: [
      { group: '0–5', people: 32000 },
      { group: '6–10', people: 39000 },
      { group: '11–15', people: 46000 },
      { group: '16–20', people: 53000 },
      { group: '21–25', people: 60000 },
      { group: '26–30', people: 67000 },
      { group: '31–35', people: 74000 },
      { group: '36–40', people: 81000 },
      { group: '41–45', people: 88000 },
      { group: '46–50', people: 95000 },
      { group: '51–55', people: 102000 },
      { group: '56–60', people: 109000 },
      { group: '61–65', people: 116000 },
      { group: '66–70', people: 123000 },
      { group: '71–75', people: 130000 },
      { group: '76–80', people: 137000 },
      { group: '81–85', people: 144000 },
      { group: '86–90', people: 151000 },
      { group: '91–95', people: 158000 },
      { group: '96–100', people: 165000 },
      { group: '101+', people: 172000 },
      { group: 'AI agent', people: 179000 },
    ],
    profileTypes: [
      { type: 'Individuals', count: 820000 },
      { type: 'Children / guardian-linked', count: 94000 },
      { type: 'Faith groups', count: 3200 },
      { type: 'Organizations', count: 1800 },
      { type: 'In memory / in honour', count: 12600 },
    ],
    funds: {
      humanityFundContributions: 711_800_000,
      stewardshipContributions: 13_200_000,
      totalContributions: 725_000_000,
      currentEndowment: 812_400_000,
      cumulativeParticipantBenefits: 18_600_000,
      recycledBenefits: 7_450_000,
      verifiedReach: 1_240_000,
      connectorReach: 186_000,
      averageGrowth: 0.1,
      activeClaimants: 420_000,
      recycleRate: 0.28,
    },
  }
  for (const user of seed.users) {
    user.verificationMethod = 'demo-simulation'
    user.proofOfHuman = false
  }
  return buildCoherentSeedScenario(seed)
}

function seedContribution(id, profileId, recognitionName, amount, allocationMode, paymentMethod, stewardshipTip, country, ageGroup) {
  const split = splitContribution(amount, allocationMode, stewardshipTip)
  return {
    id,
    profileId,
    recognitionName,
    amount: roundMoney(Math.max(0, Number(amount) || 0) + Math.max(0, Number(stewardshipTip) || 0)),
    contributionAmount: Math.max(0, Number(amount) || 0),
    allocationMode,
    paymentMethod,
    stewardshipTip,
    country,
    ageGroup,
    ...split,
    recordKind: 'contribution',
    simulation: true,
    createdAt: '2026-06-05T00:00:00.000Z',
  }
}

const SCENARIO_COUNTRIES = ['Canada', 'Nigeria', 'India', 'Brazil', 'United States', 'Sweden', 'Kenya', 'France', 'Pakistan', 'Mexico', 'Germany', 'Japan']
const SCENARIO_AGE_GROUPS = ['0–5', '6–10', '11–15', '16–20', '21–25', '26–30', '31–35', '36–40', '41–45', '46–50', '51–55', '56–60', '61–65', '66–70', '71–75', '76–80', '81–85', '86–90', '91–95', '96–100']

function buildCoherentSeedScenario(seed) {
  ensureScenarioFixture(seed)
  syncVerifiedClaimPathways(seed)
  rebuildSnapshotAggregates(seed)
  return seed
}

function ensureScenarioFixture(snapshot) {
  let changed = false
  snapshot.users = Array.isArray(snapshot.users) ? snapshot.users : []
  snapshot.profiles = Array.isArray(snapshot.profiles) ? snapshot.profiles : []
  snapshot.contributions = Array.isArray(snapshot.contributions) ? snapshot.contributions : []
  snapshot.claims = Array.isArray(snapshot.claims) ? snapshot.claims : []

  const child = snapshot.users.find((user) => user.id === 'user-anisa-brown')
  const childProfile = snapshot.profiles.find((profile) => profile.id === 'seed-profile-child')
  if (child && childProfile) {
    const expectedChildProfile = { name: child.username, country: child.country, ageGroup: child.ageGroup, connector: child.connector, description: 'Fictional guardian-managed child participant profile for prototype testing.' }
    if (Object.entries(expectedChildProfile).some(([key, value]) => childProfile[key] !== value)) {
      Object.assign(childProfile, expectedChildProfile)
      changed = true
    }
  }

  const profileIds = new Set(snapshot.profiles.map((profile) => profile.id))
  for (const user of snapshot.users) {
    if (!user.profileId || profileIds.has(user.profileId)) continue
    snapshot.profiles.push({
      id: user.profileId,
      name: user.username,
      type: user.id === 'user-ai-agent' ? 'Prototype non-human' : 'Individual',
      country: user.country,
      ageGroup: user.ageGroup,
      description: 'Fictional participant profile for prototype testing.',
      connector: user.connector ?? '',
      createdAt: '2026-06-04T00:00:00.000Z',
    })
    profileIds.add(user.profileId)
    changed = true
  }

  const baseAttribution = new Map([
    ['seed-contribution-1', ['user-david-brown', 'user-david-brown']],
    ['seed-contribution-2', ['user-phillip-chen', 'user-phillip-chen']],
    ['seed-contribution-3', ['user-amina-okafor', 'user-amina-okafor']],
    ['seed-contribution-4', ['user-anisa-brown', 'user-david-brown']],
    ['seed-contribution-5', ['user-lucas-silva', 'user-lucas-silva']],
  ])
  const usersById = new Map(snapshot.users.map((user) => [user.id, user]))
  const profilesById = new Map(snapshot.profiles.map((profile) => [profile.id, profile]))
  for (const contribution of snapshot.contributions) {
    const attribution = baseAttribution.get(contribution.id)
    if (!attribution) continue
    const [contributorUserId, actorUserId] = attribution
    const contributor = usersById.get(contributorUserId)
    const profile = profilesById.get(contribution.profileId)
    const expected = {
      contributorUserId,
      actorUserId,
      contributedByName: contributor?.username ?? contribution.recognitionName,
      recordKind: contribution.sourceClaimId ? 'recycled-benefit' : 'contribution',
      simulation: true,
      country: profile?.country ?? contribution.country,
      ageGroup: profile?.ageGroup ?? contribution.ageGroup,
    }
    if (Object.entries(expected).some(([key, value]) => contribution[key] !== value)) {
      Object.assign(contribution, expected)
      changed = true
    }
  }

  const david = usersById.get('user-david-brown')
  const anisa = usersById.get('user-anisa-brown')
  for (const claim of snapshot.claims) {
    if (!['seed-claim-1', 'seed-claim-2', 'seed-claim-guardian'].includes(claim.id)) continue
    const sourceUser = claim.id === 'seed-claim-guardian' ? anisa : david
    const actor = claim.id === 'seed-claim-guardian' ? david : david
    const profile = profilesById.get(claim.profileId)
    const expected = {
      actorUserId: actor?.id ?? claim.actorUserId,
      userId: sourceUser?.id ?? claim.userId,
      targetName: sourceUser?.username ?? claim.targetName,
      country: profile?.country ?? claim.country,
      ageGroup: profile?.ageGroup ?? claim.ageGroup,
      recordKind: claim.action === 'recycled' ? 'recycled-benefit' : 'claimed-benefit',
      simulation: true,
    }
    if (Object.entries(expected).some(([key, value]) => claim[key] !== value)) {
      Object.assign(claim, expected)
      changed = true
    }
  }
  if (anisa && !snapshot.claims.some((claim) => claim.id === 'seed-claim-guardian')) {
    snapshot.claims.push({ id: 'seed-claim-guardian', actorUserId: david?.id, userId: anisa.id, profileId: anisa.profileId, targetName: anisa.username, amount: 35, action: 'claimed', recordKind: 'claimed-benefit', simulation: true, deliveryMethod: 'Prototype e-transfer', denomination: 'Canadian dollars', country: anisa.country, ageGroup: anisa.ageGroup, createdAt: '2026-06-07T00:00:00.000Z' })
    changed = true
  }
  if (david && !snapshot.contributions.some((contribution) => contribution.id === 'seed-recycled-contribution')) {
    snapshot.contributions.push({ ...seedContribution('seed-recycled-contribution', david.profileId, david.username, 80, 'humanity', 'Recycled prototype benefit', 0, david.country, david.ageGroup), contributorUserId: david.id, actorUserId: david.id, contributedByName: david.username, sourceClaimId: 'seed-claim-1', recordKind: 'recycled-benefit', simulation: true })
    changed = true
  }

  if (!snapshot.profiles.some((profile) => profile.id === 'scenario-profile-001')) {
    for (let index = 1; index <= 96; index += 1) {
      const padded = String(index).padStart(3, '0')
      const country = SCENARIO_COUNTRIES[(index - 1) % SCENARIO_COUNTRIES.length]
      const ageGroup = SCENARIO_AGE_GROUPS[(index - 1) % SCENARIO_AGE_GROUPS.length]
      const userId = `scenario-user-${padded}`
      const profileId = `scenario-profile-${padded}`
      const username = `Fictional Participant ${padded}`
      const connector = index % 7 === 0 ? 'Ivo Cedar' : ''
      snapshot.users.push({ id: userId, username, country, ageGroup, connector, profileId, verificationMethod: 'demo-simulation', proofOfHuman: false, scenarioFixture: true })
      snapshot.profiles.push({ id: profileId, name: username, type: 'Individual', country, ageGroup, description: 'Fictional sample profile used only for the prototype’s illustrative fund calculation.', connector, scenarioFixture: true, createdAt: '2026-06-08T00:00:00.000Z' })
      const amount = 2500 + ((index * 173) % 4000)
      const allocationMode = index % 9 === 0 ? 'stewardship' : index % 4 === 0 ? 'hybrid99' : 'humanity'
      snapshot.contributions.push({ ...seedContribution(`scenario-contribution-${padded}`, profileId, username, amount, allocationMode, 'Fictional prior prototype contribution', 0, country, ageGroup), contributorUserId: userId, actorUserId: userId, contributedByName: username, recordKind: 'contribution', simulation: true })
    }
    changed = true
  }

  snapshot.version = Math.max(Number(snapshot.version) || 1, 4)
  return changed
}

export function splitContribution(amount, allocationMode, stewardshipTip = 0) {
  const safeAmount = Math.max(0, Number(amount) || 0)
  const safeTip = Math.max(0, Number(stewardshipTip) || 0)
  let humanityPercent = 1
  if (allocationMode === 'hybrid99') humanityPercent = 0.99
  if (allocationMode === 'stewardship') humanityPercent = 0
  const humanityFund = Math.round(safeAmount * humanityPercent * 100) / 100
  const stewardshipReserve = Math.round((safeAmount - humanityFund + safeTip) * 100) / 100
  return { humanityFund, stewardshipReserve }
}

function isClaimEligibleProfile(profile) {
  return Boolean(profile && profile.country !== 'Digital' && (profile.type === 'Individual' || profile.type === 'Child under 16'))
}

function contributionValue(contribution) {
  return Math.max(0, Number(contribution?.humanityFund) || 0) + Math.max(0, Number(contribution?.stewardshipReserve) || 0)
}

function isFundInflow(contribution) {
  return !contribution?.sourceClaimId && contribution?.recordKind !== 'recycled-benefit'
}

export function rebuildSnapshotAggregates(snapshot) {
  snapshot.users = Array.isArray(snapshot.users) ? snapshot.users : []
  snapshot.profiles = Array.isArray(snapshot.profiles) ? snapshot.profiles : []
  snapshot.contributions = Array.isArray(snapshot.contributions) ? snapshot.contributions : []
  snapshot.claims = Array.isArray(snapshot.claims) ? snapshot.claims : []
  const previousFunds = snapshot.funds ?? {}
  const rawGrowth = Number(previousFunds.averageGrowth)
  const averageGrowth = Number.isFinite(rawGrowth) && rawGrowth >= 0 ? rawGrowth > 1 ? rawGrowth / 100 : rawGrowth : 0.1
  const rawRecycleRate = Number(previousFunds.recycleRate)
  const recycleRate = Number.isFinite(rawRecycleRate) && rawRecycleRate >= 0 ? rawRecycleRate : 0.28
  const fundInflows = snapshot.contributions.filter(isFundInflow)
  const recycledEntries = snapshot.contributions.filter((contribution) => !isFundInflow(contribution))
  const humanityFundContributions = roundMoney(fundInflows.reduce((total, contribution) => total + Math.max(0, Number(contribution.humanityFund) || 0), 0))
  const stewardshipContributions = roundMoney(fundInflows.reduce((total, contribution) => total + Math.max(0, Number(contribution.stewardshipReserve) || 0), 0))
  const totalContributions = roundMoney(humanityFundContributions + stewardshipContributions)
  const cumulativeParticipantBenefits = roundMoney(snapshot.claims.filter((claim) => claim.action === 'claimed').reduce((total, claim) => total + Math.max(0, Number(claim.amount) || 0), 0))
  const recycledBenefits = roundMoney(snapshot.claims.filter((claim) => claim.action === 'recycled').reduce((total, claim) => total + Math.max(0, Number(claim.amount) || 0), 0))
  const recycledStewardshipTransfers = roundMoney(recycledEntries.reduce((total, contribution) => total + Math.max(0, Number(contribution.stewardshipReserve) || 0), 0))
  const modeledGrowth = roundMoney(humanityFundContributions * averageGrowth)
  const stewardshipFundBalance = roundMoney(stewardshipContributions + recycledStewardshipTransfers)
  const humanityFundBalance = roundMoney(Math.max(0, humanityFundContributions + modeledGrowth - cumulativeParticipantBenefits - recycledStewardshipTransfers))
  const currentEndowment = roundMoney(humanityFundBalance + stewardshipFundBalance)
  const eligibleProfiles = snapshot.profiles.filter(isClaimEligibleProfile)
  const profilesById = new Map(snapshot.profiles.map((profile) => [profile.id, profile]))
  const countryRows = new Map()
  const getCountryRow = (country) => {
    const key = String(country || 'Unspecified')
    const existing = countryRows.get(key)
    if (existing) return existing
    const created = { country: key, people: 0, contributions: 0, connectors: 0, claimants: 0 }
    countryRows.set(key, created)
    return created
  }
  for (const profile of eligibleProfiles) getCountryRow(profile.country).people += 1
  for (const contribution of fundInflows) {
    const profile = profilesById.get(contribution.profileId)
    const country = profile?.country ?? contribution.country
    const row = getCountryRow(country)
    row.contributions = roundMoney(row.contributions + contributionValue(contribution))
  }
  for (const user of snapshot.users) {
    if (user.connector) getCountryRow(user.country).connectors += 1
  }
  const claimantProfilesByCountry = new Map()
  for (const claim of snapshot.claims) {
    const profile = profilesById.get(claim.profileId)
    const country = profile?.country ?? claim.country
    if (!claimantProfilesByCountry.has(country)) claimantProfilesByCountry.set(country, new Set())
    claimantProfilesByCountry.get(country).add(claim.profileId || claim.userId)
  }
  for (const [country, profileIds] of claimantProfilesByCountry) getCountryRow(country).claimants = profileIds.size
  const ageRows = new Map()
  for (const profile of eligibleProfiles) ageRows.set(profile.ageGroup, (ageRows.get(profile.ageGroup) ?? 0) + 1)
  const profileTypes = new Map()
  for (const profile of snapshot.profiles) profileTypes.set(profile.type || 'Unspecified', (profileTypes.get(profile.type || 'Unspecified') ?? 0) + 1)
  snapshot.countries = [...countryRows.values()].sort((a, b) => a.country.localeCompare(b.country))
  snapshot.ageGroups = [...ageRows.entries()].map(([group, people]) => ({ group, people })).sort((a, b) => a.group.localeCompare(b.group, undefined, { numeric: true }))
  snapshot.profileTypes = [...profileTypes.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => a.type.localeCompare(b.type))
  snapshot.funds = {
    ...previousFunds,
    humanityFundContributions,
    stewardshipContributions,
    totalContributions,
    currentEndowment,
    cumulativeParticipantBenefits,
    recycledBenefits,
    recycledStewardshipTransfers,
    humanityFundBalance,
    stewardshipFundBalance,
    totalRecordedBenefitChoices: roundMoney(cumulativeParticipantBenefits + recycledBenefits),
    modeledGrowth,
    verifiedReach: snapshot.users.filter((user) => user.verifiedHumanAt).length,
    connectorReach: snapshot.users.filter((user) => user.connector).length,
    averageGrowth,
    activeClaimants: eligibleProfiles.length,
    recycleRate,
  }
  return snapshot
}

export function prepareSnapshotForRead(snapshot) {
  normalizeGuardianConnections(snapshot)
  syncVerifiedClaimPathways(snapshot)
  rebuildSnapshotAggregates(snapshot)
  return snapshot
}

export async function loadSnapshot(dataPath) {
  await ensureDataFile(dataPath)
  const raw = await readFile(dataPath, 'utf8')
  const snapshot = JSON.parse(raw)
  if (migrateLegacyPasswords(snapshot)) await writeFile(dataPath, `${JSON.stringify(snapshot, null, 2)}\n`)
  return prepareSnapshotForRead(snapshot)
}

function migrateLegacyPasswords(snapshot) {
  let changed = false
  for (const user of snapshot.users ?? []) {
    if (typeof user.password === 'string' && user.password && !user.passwordHash) {
      user.passwordHash = hashPassword(user.password)
      changed = true
    }
    if (Object.hasOwn(user, 'password')) {
      delete user.password
      changed = true
    }
  }
  return changed
}

export async function saveSnapshot(dataPath, snapshot) {
  await mkdir(dirname(dataPath), { recursive: true })
  syncVerifiedClaimPathways(snapshot)
  rebuildSnapshotAggregates(snapshot)
  snapshot.updatedAt = new Date().toISOString()
  await writeFile(dataPath, `${JSON.stringify(snapshot, null, 2)}\n`)
  return snapshot
}

export async function ensureDataFile(dataPath) {
  try {
    await readFile(dataPath, 'utf8')
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    await saveSnapshot(dataPath, createSeedData())
  }
}


export function validatePassword(password) {
  const issues = []
  if (!String(password)) return issues
  if (String(password).length < 8) issues.push('Use at least 8 characters.')
  if (!/[A-Z]/.test(String(password))) issues.push('Use at least one capital letter.')
  if (!/[0-9]/.test(String(password))) issues.push('Use at least one number.')
  if (!/[^A-Za-z0-9]/.test(String(password))) issues.push('Use at least one special character.')
  return issues
}

export async function createUser(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const username = clean(input.username, '')
  const password = typeof input.password === 'string' ? input.password.trim() : ''
  const repeatPassword = typeof input.repeatPassword === 'string' ? input.repeatPassword.trim() : password
  if (!username) throw new Error('Username is required.')
  if (!password) throw new Error('Password is required.')
  if (isUsernameTaken(snapshot, username)) throw new Error('Username already exists. Please choose a different username.')
  if (password !== repeatPassword) throw new Error('Passwords must match.')
  const passwordIssues = validatePassword(password)
  if (passwordIssues.length > 0) throw new Error(passwordIssues.join(' '))
  const profileId = `profile-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
  const requestedGuardianIds = Array.isArray(input.guardianUserIds)
    ? input.guardianUserIds.map((value) => String(value ?? '').trim()).filter(Boolean)
    : [clean(input.guardianUserId, '')].filter(Boolean)
  if (requestedGuardianIds.length > MAX_DIRECT_GUARDIAN_CONNECTIONS) throw new Error(`You can identify at most two direct parent / guardian accounts.`)
  if (new Set(requestedGuardianIds).size !== requestedGuardianIds.length) throw new Error('Select each parent / guardian account only once.')
  const guardianUsername = clean(input.guardianUsername, '')
  const guardians = requestedGuardianIds.length > 0
    ? requestedGuardianIds.map((guardianUserId) => snapshot.users.find((item) => item.id === guardianUserId))
    : guardianUsername
      ? [snapshot.users.find((item) => item.username.toLowerCase() === guardianUsername.toLowerCase())]
      : []
  if (guardians.some((guardian) => !guardian)) throw new Error('Selected parent / guardian account was not found.')
  for (const guardian of guardians) assertGuardianHasChildWardCapacity(snapshot, guardian.id)
  const createdAt = new Date().toISOString()
  const guardianConnections = guardians.map((guardian) => ({
    guardianUserId: guardian.id,
    guardianUsername: guardian.username,
    guardianStatus: 'pending',
    guardianRequestedAt: createdAt,
    guardianRespondedAt: '',
  }))
  const user = {
    id: `user-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    username,
    passwordHash: hashPassword(password),
    country: clean(input.country, 'Unspecified'),
    ageGroup: clean(input.ageGroup, 'Unspecified'),
    connector: clean(input.connector, ''),
    connectorSelfDirected: Boolean(input.connectorSelfDirected && !clean(input.connector, '')),
    guardianConnections,
    profileId,
    createdAt,
  }
  setGuardianConnections(user, guardianConnections)
  const profile = {
    id: profileId,
    name: username,
    type: 'Individual',
    country: user.country,
    ageGroup: user.ageGroup,
    description: 'Individual account profile created in the local prototype.',
    connector: user.connector,
    connectorSelfDirected: user.connectorSelfDirected,
    createdAt: user.createdAt,
  }
  snapshot.users.push(user)
  snapshot.profiles.push(profile)
  incrementProfileType(snapshot, 'Individuals')
  incrementCountryPeople(snapshot, user.country)
  incrementAgeGroup(snapshot, user.ageGroup)
  await saveSnapshot(dataPath, snapshot)
  return user
}

export async function loginUser(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const username = clean(input.username, '')
  const password = clean(input.password, '')
  const user = snapshot.users.find((item) => item.username.toLowerCase() === username.toLowerCase() && verifyPassword(password, item))
  if (!user) return { ok: false, error: 'Invalid username or password.' }
  const profile = snapshot.profiles.find((item) => item.id === user.profileId || item.name === user.username)
  const contributions = snapshot.contributions.filter((item) => item.contributorUserId === user.id || item.profileId === user.profileId || item.recognitionName === user.username)
  const claims = snapshot.claims.filter((item) => item.profileId === user.profileId)
  return { ok: true, user, profile, contributions, claims }
}

export async function updateUserProfile(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const user = snapshot.users.find((item) => item.id === input.id)
  if (!user) throw new Error('User not found.')
  const oldUsername = user.username

  if (typeof input.username === 'string') {
    const nextUsername = input.username.trim()
    if (!nextUsername) throw new Error('Username is required.')
    const usernameTaken = isUsernameTaken(snapshot, nextUsername, user.id)
    if (usernameTaken) throw new Error('Username already exists. Please choose a different username.')
    user.username = nextUsername
  }

  if (typeof input.password === 'string' && input.password.trim()) {
    const password = input.password.trim()
    const passwordIssues = validatePassword(password)
    if (passwordIssues.length > 0) throw new Error(passwordIssues.join(' '))
    user.passwordHash = hashPassword(password)
    delete user.password
  }

  user.country = clean(input.country, user.country)
  user.ageGroup = clean(input.ageGroup, user.ageGroup)
  if (typeof input.connector === 'string') user.connector = input.connector.trim()
  if (typeof input.connectorSelfDirected === 'boolean') user.connectorSelfDirected = input.connectorSelfDirected && !user.connector
  if (typeof input.guardianUsername === 'string' && input.guardianUsername.trim() !== (user.guardianUsername ?? '')) throw new Error('Use the parent / guardian connection flow to request or remove a guardian.')
  if (typeof input.guardianUserId === 'string' && input.guardianUserId.trim() !== (user.guardianUserId ?? '')) throw new Error('Use the parent / guardian connection flow to request or remove a guardian.')
  if ('guardianConnections' in input) throw new Error('Use the parent / guardian connection flow to request or remove a guardian.')

  if (oldUsername !== user.username) {
    for (const item of snapshot.users) {
      if (item.connector === oldUsername) item.connector = user.username
      if (item.guardianUsername === oldUsername) item.guardianUsername = user.username
      if (Array.isArray(item.guardianConnections)) {
        let changed = false
        for (const connection of item.guardianConnections) {
          if (connection.guardianUserId === user.id && connection.guardianUsername === oldUsername) {
            connection.guardianUsername = user.username
            changed = true
          }
        }
        if (changed) syncLegacyGuardianFields(item)
      }
    }
    for (const item of snapshot.profiles) {
      if (item.connector === oldUsername) item.connector = user.username
    }
    for (const claim of snapshot.claims ?? []) {
      if (claim.userId === user.id) claim.targetName = user.username
    }
  }

  const profile = snapshot.profiles.find((item) => item.id === user.profileId || item.name === oldUsername)
  if (profile) {
    if (profile.name === oldUsername || profile.id === user.profileId) profile.name = user.username
    profile.country = user.country
    profile.ageGroup = user.ageGroup
    profile.connector = user.connector
    profile.connectorSelfDirected = Boolean(user.connectorSelfDirected)
  }

  await saveSnapshot(dataPath, snapshot)
  return { ok: true, user, profile }
}


export async function updateUserVerification(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const user = snapshot.users.find((item) => item.id === input.id)
  if (!user) throw new Error('User not found.')

  user.verifiedHumanAt = new Date().toISOString()
  user.verificationMethod = clean(input.verificationMethod, 'government-id-liveness')
  user.verificationStatus = getClaimPathway(user)
  if (typeof input.guardianUsername === 'string' && input.guardianUsername.trim() !== (user.guardianUsername ?? '')) throw new Error('Use the parent / guardian connection flow to request or remove a guardian.')
  if (typeof input.guardianUserId === 'string' && input.guardianUserId.trim() !== (user.guardianUserId ?? '')) throw new Error('Use the parent / guardian connection flow to request or remove a guardian.')
  if ('guardianConnections' in input) throw new Error('Use the parent / guardian connection flow to request or remove a guardian.')

  const profile = snapshot.profiles.find((item) => item.id === user.profileId || item.name === user.username)
  if (profile) {
    profile.verificationStatus = user.verificationStatus
    profile.guardianUsername = user.guardianUsername || ''
  }

  await saveSnapshot(dataPath, snapshot)
  return { ok: true, user, profile }
}

export async function requestGuardianConnection(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const child = snapshot.users.find((item) => item.id === input.childUserId)
  const guardian = snapshot.users.find((item) => item.id === input.guardianUserId)
  if (!child) throw new Error('Child or dependent account was not found.')
  if (!guardian) throw new Error('Selected parent / guardian account was not found.')
  if (child.id === guardian.id) throw new Error('You cannot select your own account as a parent / guardian.')
  if (hasAcceptedChildConnection(snapshot, child.id)) throw new Error('An account with an accepted child / ward connection cannot identify a parent / guardian.')
  const connections = getGuardianConnections(child)
  const existing = connections.find((connection) => connection.guardianUserId === guardian.id)
  if (existing?.guardianStatus === 'accepted') throw new Error('This parent / guardian connection is already accepted.')
  if (existing?.guardianStatus === 'pending') throw new Error('This parent / guardian request is already awaiting a response.')
  if (!existing && connections.length >= MAX_DIRECT_GUARDIAN_CONNECTIONS) throw new Error('You can identify at most two direct parent / guardian accounts.')
  assertGuardianHasChildWardCapacity(snapshot, guardian.id)

  const now = new Date().toISOString()
  if (existing) {
    existing.guardianUsername = guardian.username
    existing.guardianStatus = 'pending'
    existing.guardianRequestedAt = now
    existing.guardianRespondedAt = ''
  } else {
    connections.push({
      guardianUserId: guardian.id,
      guardianUsername: guardian.username,
      guardianStatus: 'pending',
      guardianRequestedAt: now,
      guardianRespondedAt: '',
    })
  }
  setGuardianConnections(child, connections)
  await saveSnapshot(dataPath, snapshot)
  return { ok: true, child, guardian }
}

export async function respondGuardianConnection(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const guardian = snapshot.users.find((item) => item.id === input.guardianUserId)
  const child = snapshot.users.find((item) => item.id === input.childUserId)
  const decision = String(input.decision ?? '').trim()
  if (!guardian) throw new Error('Parent / guardian account was not found.')
  if (!child) throw new Error('Child or dependent account was not found.')
  if (!['accepted', 'declined'].includes(decision)) throw new Error('Parent / guardian response must be accepted or declined.')
  const connections = getGuardianConnections(child)
  const connection = connections.find((item) => item.guardianUserId === guardian.id)
  if (!connection) throw guardianConnectionAccessError('This account is not the named parent / guardian for this request.')
  if (connection.guardianStatus !== 'pending') throw new Error('This parent / guardian request is no longer awaiting your response.')
  if (decision === 'accepted' && hasActiveGuardianConnection(guardian)) throw new Error('This account already has a parent / guardian connection. Remove it before accepting a child / ward connection.')

  connection.guardianStatus = decision
  connection.guardianRespondedAt = new Date().toISOString()
  setGuardianConnections(child, connections)
  await saveSnapshot(dataPath, snapshot)
  return { ok: true, child, guardian }
}

export async function removeGuardianConnection(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const actor = snapshot.users.find((item) => item.id === input.actorUserId)
  const child = snapshot.users.find((item) => item.id === input.childUserId)
  if (!actor) throw new Error('Account was not found.')
  if (!child) throw new Error('Child or dependent account was not found.')
  const connections = getGuardianConnections(child)
  const requestedGuardianUserId = clean(input.guardianUserId, '')
  const connection = requestedGuardianUserId
    ? connections.find((item) => item.guardianUserId === requestedGuardianUserId)
    : connections.find((item) => item.guardianUserId === actor.id) ?? (connections.length === 1 ? connections[0] : undefined)
  const isChild = actor.id === child.id
  const isGuardian = Boolean(connection && actor.id === connection.guardianUserId)
  if (!isChild && !isGuardian) throw guardianConnectionAccessError('Only the child or named parent / guardian can remove this connection.')
  if (!connection) throw new Error(connections.length > 1 ? 'Choose which parent / guardian connection to remove.' : 'No parent / guardian connection is currently identified.')
  if (isGuardian && connection.guardianStatus !== 'accepted') throw new Error('Respond to the pending request instead of removing it.')

  setGuardianConnections(child, connections.filter((item) => item.guardianUserId !== connection.guardianUserId))
  await saveSnapshot(dataPath, snapshot)
  return { ok: true, child }
}

export async function createProfile(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const name = clean(input.name, '')
  const type = clean(input.type, '')
  const country = clean(input.country, '')
  if (!name) throw new Error('Name is required.')
  if (!type) throw new Error('Contribution profile type is required.')
  if (!country) throw new Error('Country is required.')
  const profile = {
    id: `profile-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name,
    type,
    country,
    ageGroup: clean(input.ageGroup, 'Unspecified'),
    description: clean(input.description, ''),
    connector: clean(input.connector, ''),
    createdByUserId: clean(input.createdByUserId, ''),
    createdAt: new Date().toISOString(),
  }
  snapshot.profiles.push(profile)
  incrementProfileType(snapshot, profile.type)
  incrementCountryPeople(snapshot, profile.country)
  await saveSnapshot(dataPath, snapshot)
  return profile
}

export async function updateContributionProfile(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const profile = snapshot.profiles.find((item) => item.id === input.id)
  if (!profile) throw new Error('Contribution profile not found.')
  if (!profile.createdByUserId || profile.createdByUserId !== input.userId) throw new Error('Only the creator can modify this contribution profile.')
  const name = clean(input.name, '')
  const type = clean(input.type, '')
  const country = clean(input.country, '')
  if (!name) throw new Error('Name is required.')
  if (!type) throw new Error('Contribution profile type is required.')
  if (!country) throw new Error('Country is required.')
  profile.name = name
  profile.type = type
  profile.country = country
  profile.description = clean(input.description, '')
  profile.updatedAt = new Date().toISOString()
  await saveSnapshot(dataPath, snapshot)
  return { ok: true, profile }
}

export async function createContribution(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  const contribution = buildContribution(input)
  if (input.isAnonymous) {
    contribution.isAnonymous = true
    contribution.anonymousAlias = clean(input.anonymousAlias, stableAnonymousAlias(snapshot, contribution.contributorUserId))
  }
  applyContribution(snapshot, contribution)
  await saveSnapshot(dataPath, snapshot)
  return contribution
}

export async function createClaims(dataPath, input) {
  const snapshot = await loadSnapshot(dataPath)
  if (!Array.isArray(snapshot.claims)) snapshot.claims = []
  const actor = snapshot.users.find((item) => item.id === input.actorUserId)
  if (!actor) throw new Error('Claiming user not found.')

  const action = clean(input.action, '')
  if (!['claimed', 'recycled'].includes(action)) throw new Error('Claim action must be claimed or recycled.')

  const amount = roundMoney(Math.max(0, Number(input.amount) || 0))
  if (amount <= 0) throw new Error('Claim amount must be greater than zero.')

  const targetUserIds = Array.isArray(input.targetUserIds) ? input.targetUserIds.map(String) : []
  if (targetUserIds.length === 0) throw new Error('At least one claim target is required.')

  const requestedDestinationIds = action === 'recycled' && Array.isArray(input.recycleDestinations)
    ? [...new Set(input.recycleDestinations.map((destination) => clean(destination?.profileId, '')).filter(Boolean))]
    : []
  const requestedDestinationProfiles = requestedDestinationIds.map((profileId) => snapshot.profiles.find((profile) => profile.id === profileId))
  if (requestedDestinationProfiles.some((profile) => !profile)) throw new Error('Selected recycled-benefit recipient was not found.')

  const now = new Date().toISOString()
  const claims = []
  const contributions = []
  for (const targetUserId of targetUserIds) {
    const targetUser = snapshot.users.find((item) => item.id === targetUserId)
    if (!targetUser) throw new Error('Claim target not found.')
    const isSelf = targetUser.id === actor.id
    const isDependent = isAcceptedGuardianConnection(targetUser, actor)
    if (!isSelf && !isDependent) throw new Error('Claim target is not linked to this account.')

    const claim = {
      id: `claim-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      actorUserId: actor.id,
      userId: targetUser.id,
      profileId: clean(targetUser.profileId, 'unknown-profile'),
      targetName: targetUser.username,
      action,
      amount,
      country: clean(targetUser.country, 'Unspecified'),
      ageGroup: clean(targetUser.ageGroup, 'Unspecified'),
      deliveryMethod: clean(input.deliveryMethod, action === 'recycled' ? 'Recycled into Humanity Fund' : 'Prototype claim delivery'),
      denomination: clean(input.denomination, ''),
      simulation: true,
      recordKind: action === 'recycled' ? 'recycled-benefit' : 'claimed-benefit',
      createdAt: now,
    }
    snapshot.claims.push(claim)
    claims.push(claim)

    if (action === 'recycled') {
      const allocationMode = clean(input.allocationMode, 'humanity')
      const defaultDestination = snapshot.profiles.find((profile) => profile.id === claim.profileId)
      const destinations = requestedDestinationProfiles.length > 0 ? requestedDestinationProfiles : defaultDestination ? [defaultDestination] : []
      if (destinations.length === 0) throw new Error('A recycled benefit needs a valid contribution recipient.')
      const destinationAmounts = splitMoneyEqually(amount, destinations.length)
      destinations.forEach((destination, destinationIndex) => {
        const contribution = buildContribution({
          profileId: destination.id,
          recognitionName: destination.name,
          amount: destinationAmounts[destinationIndex],
          allocationMode,
          paymentMethod: 'Recycled claim benefit',
          stewardshipTip: 0,
          actorUserId: actor.id,
          contributorUserId: targetUser.id,
          contributedByName: targetUser.username,
          country: destination.country,
          ageGroup: destination.ageGroup,
          createdAt: now,
          sourceClaimId: claim.id,
          isAnonymous: Boolean(input.isAnonymous),
          anonymousAlias: input.isAnonymous ? stableAnonymousAlias(snapshot, targetUser.id) : '',
        })
        applyContribution(snapshot, contribution)
        contributions.push(contribution)
      })
      snapshot.funds.recycledBenefits = roundMoney(snapshot.funds.recycledBenefits + amount)
    } else {
      snapshot.funds.cumulativeParticipantBenefits = roundMoney(snapshot.funds.cumulativeParticipantBenefits + amount)
      incrementCountryClaimant(snapshot, claim.country)
    }
  }

  await saveSnapshot(dataPath, snapshot)
  return { ok: true, claims, contributions }
}

function buildContribution(input) {
  const amount = Math.max(0, Number(input.amount) || 0)
  const stewardshipTip = Math.max(0, Number(input.stewardshipTip) || 0)
  const split = splitContribution(amount, input.allocationMode, stewardshipTip)
  return {
    id: `contribution-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    profileId: clean(input.profileId, 'unknown-profile'),
    recognitionName: clean(input.recognitionName, 'Anonymous'),
    amount: roundMoney(amount + stewardshipTip),
    contributionAmount: amount,
    allocationMode: clean(input.allocationMode, 'humanity'),
    paymentMethod: clean(input.paymentMethod, 'Prototype payment'),
    stewardshipTip,
    actorUserId: clean(input.actorUserId, clean(input.contributorUserId, '')),
    contributorUserId: clean(input.contributorUserId, ''),
    contributedByName: clean(input.contributedByName, ''),
    country: clean(input.country, 'Unspecified'),
    ageGroup: clean(input.ageGroup, 'Unspecified'),
    sourceClaimId: clean(input.sourceClaimId, ''),
    recognitionContext: clean(input.recognitionContext, input.sourceClaimId ? 'recycled-benefit' : 'self'),
    recordKind: clean(input.recordKind, input.sourceClaimId ? 'recycled-benefit' : 'contribution'),
    simulation: true,
    isAnonymous: Boolean(input.isAnonymous),
    anonymousAlias: clean(input.anonymousAlias, ''),
    ...split,
    createdAt: clean(input.createdAt, new Date().toISOString()),
  }
}

function splitMoneyEqually(amount, recipientCount) {
  const safeRecipientCount = Math.max(0, Math.floor(Number(recipientCount) || 0))
  if (safeRecipientCount === 0) return []
  const totalCents = Math.max(0, Math.round((Number(amount) || 0) * 100))
  const baseCents = Math.floor(totalCents / safeRecipientCount)
  const remainderCents = totalCents % safeRecipientCount
  return Array.from({ length: safeRecipientCount }, (_, index) => (baseCents + (index < remainderCents ? 1 : 0)) / 100)
}

function stableAnonymousAlias(snapshot, contributorUserId) {
  const existing = (snapshot.contributions ?? [])
    .filter((item) => item.isAnonymous && item.contributorUserId === contributorUserId && item.anonymousAlias)
    .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))[0]
  if (existing?.anonymousAlias) return existing.anonymousAlias
  return nextAnonymousAlias(snapshot)
}

function nextAnonymousAlias(snapshot) {
  const maxAlias = (snapshot.contributions ?? [])
    .map((item) => /^Anonymous (\d+)$/.exec(item.anonymousAlias ?? ''))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .reduce((max, value) => Math.max(max, value), 0)
  return `Anonymous ${maxAlias + 1}`
}

function applyContribution(snapshot, contribution) {
  snapshot.contributions.push(contribution)
  if (!isFundInflow(contribution)) return
  snapshot.funds.humanityFundContributions = roundMoney(snapshot.funds.humanityFundContributions + contribution.humanityFund)
  snapshot.funds.stewardshipContributions = roundMoney(snapshot.funds.stewardshipContributions + contribution.stewardshipReserve)
  snapshot.funds.totalContributions = roundMoney(snapshot.funds.humanityFundContributions + snapshot.funds.stewardshipContributions)
  snapshot.funds.currentEndowment = roundMoney(snapshot.funds.currentEndowment + contribution.humanityFund)
  incrementCountryContribution(snapshot, contribution.country, contribution.amount)
  incrementAgeGroup(snapshot, contribution.ageGroup)
}

export function normalizeGuardianConnections(snapshot) {
  let changed = false
  const users = Array.isArray(snapshot.users) ? snapshot.users : []
  const now = new Date().toISOString()
  for (const user of users) {
    if (Array.isArray(user.guardianConnections)) {
      const before = JSON.stringify(user.guardianConnections)
      const connections = []
      const seenGuardianIds = new Set()
      for (const rawConnection of user.guardianConnections) {
        const guardianUserId = String(rawConnection?.guardianUserId ?? '').trim()
        const guardianUsername = String(rawConnection?.guardianUsername ?? '').trim()
        const guardian = guardianUserId
          ? users.find((candidate) => candidate.id === guardianUserId)
          : guardianUsername
            ? users.find((candidate) => candidate.username.toLowerCase() === guardianUsername.toLowerCase())
            : undefined
        if (!guardian || guardian.id === user.id || seenGuardianIds.has(guardian.id)) continue
        seenGuardianIds.add(guardian.id)
        const guardianStatus = ['pending', 'accepted', 'declined'].includes(rawConnection?.guardianStatus) ? rawConnection.guardianStatus : 'pending'
        const guardianRequestedAt = String(rawConnection?.guardianRequestedAt ?? '').trim() || user.createdAt || now
        const guardianRespondedAt = guardianStatus === 'pending'
          ? ''
          : String(rawConnection?.guardianRespondedAt ?? '').trim() || guardianRequestedAt
        connections.push({ guardianUserId: guardian.id, guardianUsername: guardian.username, guardianStatus, guardianRequestedAt, guardianRespondedAt })
        if (connections.length === MAX_DIRECT_GUARDIAN_CONNECTIONS) break
      }
      setGuardianConnections(user, connections)
      if (before !== JSON.stringify(user.guardianConnections)) changed = true
      continue
    }

    const guardianUserId = String(user.guardianUserId ?? '').trim()
    const guardianUsername = String(user.guardianUsername ?? '').trim()
    const guardian = guardianUserId
      ? users.find((candidate) => candidate.id === guardianUserId)
      : guardianUsername
        ? users.find((candidate) => candidate.username.toLowerCase() === guardianUsername.toLowerCase())
        : undefined

    if (!guardian || guardian.id === user.id) {
      if (guardianUserId || guardianUsername || user.guardianStatus || user.guardianRequestedAt || user.guardianRespondedAt) {
        user.guardianUserId = ''
        user.guardianUsername = ''
        user.guardianStatus = ''
        user.guardianRequestedAt = ''
        user.guardianRespondedAt = ''
        changed = true
      }
      continue
    }

    const status = ['pending', 'accepted', 'declined'].includes(user.guardianStatus) ? user.guardianStatus : 'pending'
    if (user.guardianUserId !== guardian.id || user.guardianUsername !== guardian.username || user.guardianStatus !== status) {
      user.guardianUserId = guardian.id
      user.guardianUsername = guardian.username
      user.guardianStatus = status
      changed = true
    }
    if (!user.guardianRequestedAt) {
      user.guardianRequestedAt = user.createdAt || now
      changed = true
    }
    if (status === 'pending' && user.guardianRespondedAt) {
      user.guardianRespondedAt = ''
      changed = true
    }
    if (status !== 'pending' && !user.guardianRespondedAt) {
      user.guardianRespondedAt = user.guardianRequestedAt
      changed = true
    }
  }

  const acceptedGuardianIds = new Set()
  for (const child of users) {
    for (const connection of getGuardianConnections(child)) {
      if (connection.guardianStatus === 'accepted') acceptedGuardianIds.add(connection.guardianUserId)
    }
  }
  for (const guardian of users) {
    if (!acceptedGuardianIds.has(guardian.id)) continue
    const connections = getGuardianConnections(guardian)
    if (!connections.some((connection) => connection.guardianStatus === 'pending' || connection.guardianStatus === 'accepted')) continue
    setGuardianConnections(guardian, connections.filter((connection) => connection.guardianStatus === 'declined'))
    changed = true
  }

  if (changed) snapshot.version = Math.max(Number(snapshot.version) || 1, 2)
  return changed
}

export function getGuardianConnections(user) {
  const source = Array.isArray(user?.guardianConnections)
    ? user.guardianConnections
    : user?.guardianUserId
      ? [{
          guardianUserId: user.guardianUserId,
          guardianUsername: user.guardianUsername,
          guardianStatus: user.guardianStatus,
          guardianRequestedAt: user.guardianRequestedAt,
          guardianRespondedAt: user.guardianRespondedAt,
        }]
      : []
  const seenGuardianIds = new Set()
  return source.flatMap((rawConnection) => {
    const guardianUserId = String(rawConnection?.guardianUserId ?? '').trim()
    if (!guardianUserId || seenGuardianIds.has(guardianUserId)) return []
    seenGuardianIds.add(guardianUserId)
    const guardianStatus = ['pending', 'accepted', 'declined'].includes(rawConnection?.guardianStatus) ? rawConnection.guardianStatus : 'pending'
    return [{
      guardianUserId,
      guardianUsername: String(rawConnection?.guardianUsername ?? '').trim(),
      guardianStatus,
      guardianRequestedAt: String(rawConnection?.guardianRequestedAt ?? '').trim(),
      guardianRespondedAt: guardianStatus === 'pending' ? '' : String(rawConnection?.guardianRespondedAt ?? '').trim(),
    }]
  }).slice(0, MAX_DIRECT_GUARDIAN_CONNECTIONS)
}

function setGuardianConnections(user, connections) {
  const normalized = []
  const seenGuardianIds = new Set()
  for (const connection of connections) {
    const guardianUserId = String(connection?.guardianUserId ?? '').trim()
    if (!guardianUserId || seenGuardianIds.has(guardianUserId)) continue
    seenGuardianIds.add(guardianUserId)
    const guardianStatus = ['pending', 'accepted', 'declined'].includes(connection?.guardianStatus) ? connection.guardianStatus : 'pending'
    normalized.push({
      guardianUserId,
      guardianUsername: String(connection?.guardianUsername ?? '').trim(),
      guardianStatus,
      guardianRequestedAt: String(connection?.guardianRequestedAt ?? '').trim(),
      guardianRespondedAt: guardianStatus === 'pending' ? '' : String(connection?.guardianRespondedAt ?? '').trim(),
    })
    if (normalized.length === MAX_DIRECT_GUARDIAN_CONNECTIONS) break
  }
  user.guardianConnections = normalized
  syncLegacyGuardianFields(user)
}

function syncLegacyGuardianFields(user) {
  const [primary] = Array.isArray(user.guardianConnections) ? user.guardianConnections : []
  user.guardianUserId = primary?.guardianUserId ?? ''
  user.guardianUsername = primary?.guardianUsername ?? ''
  user.guardianStatus = primary?.guardianStatus ?? ''
  user.guardianRequestedAt = primary?.guardianRequestedAt ?? ''
  user.guardianRespondedAt = primary?.guardianRespondedAt ?? ''
}

function isAcceptedGuardianConnection(child, guardian) {
  return getGuardianConnections(child).some((connection) => connection.guardianUserId === guardian.id && connection.guardianStatus === 'accepted')
}

function hasAcceptedChildConnection(snapshot, guardianUserId) {
  return snapshot.users.some((user) => getGuardianConnections(user).some((connection) => connection.guardianUserId === guardianUserId && connection.guardianStatus === 'accepted'))
}

function assertGuardianHasChildWardCapacity(snapshot, guardianUserId) {
  const activeWardCount = snapshot.users.filter((user) => getGuardianConnections(user).some((connection) => connection.guardianUserId === guardianUserId && (connection.guardianStatus === 'pending' || connection.guardianStatus === 'accepted'))).length
  if (activeWardCount >= MAX_ACTIVE_CHILD_WARD_CONNECTIONS) throw new Error(`This parent / guardian already has the maximum of ${MAX_ACTIVE_CHILD_WARD_CONNECTIONS} active child / ward connections.`)
}

function hasActiveGuardianConnection(user) {
  return getGuardianConnections(user).some((connection) => connection.guardianStatus === 'pending' || connection.guardianStatus === 'accepted')
}

function getClaimPathway(user) {
  return hasActiveGuardianConnection(user) ? 'parent-guardian-must-claim' : 'claim-for-self'
}

function syncVerifiedClaimPathways(snapshot) {
  let changed = false
  const profilesById = new Map((snapshot.profiles ?? []).map((profile) => [profile.id, profile]))
  for (const user of snapshot.users ?? []) {
    if (!user.verifiedHumanAt) continue
    const claimPathway = getClaimPathway(user)
    if (user.verificationStatus !== claimPathway) {
      user.verificationStatus = claimPathway
      changed = true
    }
    const profile = profilesById.get(user.profileId)
    if (profile && profile.verificationStatus !== claimPathway) {
      profile.verificationStatus = claimPathway
      changed = true
    }
  }
  return changed
}

function guardianConnectionAccessError(message) {
  const error = new Error(message)
  error.statusCode = 403
  return error
}

function isUsernameTaken(snapshot, username, exceptUserId = '') {
  const normalized = String(username).trim().toLowerCase()
  return snapshot.users.some((user) => user.id !== exceptUserId && user.username.toLowerCase() === normalized)
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password, user) {
  if (user.passwordHash?.startsWith('scrypt:')) {
    const [, salt, storedHash] = user.passwordHash.split(':')
    if (!salt || !storedHash) return false
    const candidate = scryptSync(String(password), salt, 64)
    const stored = Buffer.from(storedHash, 'hex')
    return stored.length === candidate.length && timingSafeEqual(stored, candidate)
  }
  return user.password === password
}

function clean(value, fallback) {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return trimmed || fallback
}

function roundMoney(value) {
  return Math.round(value * 100) / 100
}

function incrementCountryPeople(snapshot, country) {
  const row = getOrCreateCountry(snapshot, country)
  row.people += 1
}

function incrementCountryContribution(snapshot, country, amount) {
  const row = getOrCreateCountry(snapshot, country)
  row.contributions = roundMoney(row.contributions + amount)
}

function incrementCountryClaimant(snapshot, country) {
  const row = getOrCreateCountry(snapshot, country)
  row.claimants += 1
}

function getOrCreateCountry(snapshot, country) {
  let row = snapshot.countries.find((item) => item.country === country)
  if (!row) {
    row = { country, people: 0, contributions: 0, connectors: 0, claimants: 0 }
    snapshot.countries.push(row)
  }
  return row
}

function incrementAgeGroup(snapshot, group) {
  let row = snapshot.ageGroups.find((item) => item.group === group)
  if (!row) {
    row = { group, people: 0 }
    snapshot.ageGroups.push(row)
  }
  row.people += 1
}

function incrementProfileType(snapshot, type) {
  let row = snapshot.profileTypes.find((item) => item.type === type || item.type === `${type}s`)
  if (!row) {
    row = { type, count: 0 }
    snapshot.profileTypes.push(row)
  }
  row.count += 1
}
