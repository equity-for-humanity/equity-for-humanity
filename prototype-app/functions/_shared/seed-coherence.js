export const SEED_CONNECTOR_HUB_USER_ID = 'user-david-brown'
export const SEED_CLAIM_VERIFIED_AT = '2026-06-04T12:00:00.000Z'

const NAMED_CONNECTOR_PARENT_IDS = Object.freeze({
  'user-david-brown': '',
  'user-anisa-brown': SEED_CONNECTOR_HUB_USER_ID,
  'user-phillip-chen': SEED_CONNECTOR_HUB_USER_ID,
  'user-priya-shah': SEED_CONNECTOR_HUB_USER_ID,
  'user-ai-agent': SEED_CONNECTOR_HUB_USER_ID,
  'user-amina-okafor': 'user-phillip-chen',
  'user-arden-vale': 'user-phillip-chen',
  'user-sora-lind': 'user-priya-shah',
  'user-maryam-hassan': 'user-amina-okafor',
  'user-niko-chen': 'user-arden-vale',
  'user-samira-noor': 'user-sora-lind',
  'user-leila-haddad': 'user-maryam-hassan',
  'user-lucas-silva': 'user-leila-haddad',
})

const SCENARIO_CONNECTOR_PARENT_IDS = Object.freeze([
  ...Array(12).fill(SEED_CONNECTOR_HUB_USER_ID),
  ...Array(8).fill('user-anisa-brown'),
  ...Array(10).fill('user-phillip-chen'),
  ...Array(8).fill('user-priya-shah'),
  ...Array(4).fill('user-ai-agent'),
  ...Array(10).fill('user-amina-okafor'),
  ...Array(8).fill('user-arden-vale'),
  ...Array(8).fill('user-sora-lind'),
  ...Array(8).fill('user-maryam-hassan'),
  ...Array(6).fill('user-niko-chen'),
  ...Array(6).fill('user-samira-noor'),
  ...Array(4).fill('user-leila-haddad'),
  ...Array(4).fill('user-lucas-silva'),
])

function usernameById(users) {
  return new Map(users.map((user) => [user.id, user.username]))
}

function connectorNameForParentId(parentId, names) {
  if (!parentId) return ''
  return names.get(parentId) ?? ''
}

function applyConnector(user, profile, connector, selfDirected) {
  user.connector = connector
  user.connectorSelfDirected = Boolean(selfDirected && !connector)
  if (!profile) return
  profile.connector = user.connector
  profile.connectorSelfDirected = user.connectorSelfDirected
}

export function assignSeedConnectorNetwork(snapshot) {
  const users = Array.isArray(snapshot.users) ? snapshot.users : []
  const profiles = Array.isArray(snapshot.profiles) ? snapshot.profiles : []
  const hub = users.find((user) => user.id === SEED_CONNECTOR_HUB_USER_ID)
  if (!hub) return snapshot

  const names = usernameById(users)
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]))

  for (const user of users) {
    if (Object.hasOwn(NAMED_CONNECTOR_PARENT_IDS, user.id)) {
      const parentId = NAMED_CONNECTOR_PARENT_IDS[user.id]
      const connector = connectorNameForParentId(parentId, names)
      applyConnector(user, profilesById.get(user.profileId), connector, user.id === SEED_CONNECTOR_HUB_USER_ID)
      continue
    }
    if (!user.scenarioFixture) continue
    const index = Number(String(user.id).replace(/^scenario-user-/, '')) - 1
    const parentId = SCENARIO_CONNECTOR_PARENT_IDS[index] ?? SEED_CONNECTOR_HUB_USER_ID
    applyConnector(user, profilesById.get(user.profileId), connectorNameForParentId(parentId, names), false)
  }

  return snapshot
}

export function markClaimAttributedUsersVerified(snapshot, verifiedAt = SEED_CLAIM_VERIFIED_AT) {
  let changed = false
  const users = Array.isArray(snapshot.users) ? snapshot.users : []
  const claimerUserIds = new Set()
  const claimerProfileIds = new Set()

  for (const claim of snapshot.claims ?? []) {
    if (claim?.userId) claimerUserIds.add(claim.userId)
    if (claim?.actorUserId) claimerUserIds.add(claim.actorUserId)
    if (claim?.profileId) claimerProfileIds.add(claim.profileId)
  }

  for (const user of users) {
    const attributed = claimerUserIds.has(user.id) || Boolean(user.profileId && claimerProfileIds.has(user.profileId))
    if (!attributed || user.verifiedHumanAt) continue
    user.verifiedHumanAt = user.createdAt || verifiedAt
    if (!user.verificationMethod) user.verificationMethod = 'demo-simulation'
    changed = true
  }

  return changed
}
