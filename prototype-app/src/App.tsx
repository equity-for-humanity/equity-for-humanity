import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import {
  ageGroupSamples as fallbackAgeGroupSamples,
  allocationOptions,
  countrySamples as fallbackCountrySamples,
  dashboardSample,
  profileTypeSamples as fallbackProfileTypeSamples,
} from './mockData'
import {
  calculateClaimAccounting,
  calculateContributionAccounting,
  calculatePayoutScenario,
  formatCompactMoney,
  formatMoney,
  splitContributionEqually,
  type AllocationMode,
} from './model'
import { protectedPrototypeVerificationData, type VerificationMethod } from './verificationAdapter'

type ScreenId = 'welcome' | 'connect' | 'contribute' | 'claim' | 'compound' | 'recognition'
type ContributionAssetType = 'Dollars' | 'Crypto asset' | 'Stock'
type ContributionProfileForm = { name: string; type: string; country: string; ageGroup: string; description: string; connector: string }
type GuardianConnectionStatus = 'pending' | 'accepted' | 'declined'
type ClaimPathway = 'claim-for-self' | 'parent-guardian-must-claim'
type GuardianConnection = { guardianUserId: string; guardianUsername: string; guardianStatus: GuardianConnectionStatus; guardianRequestedAt?: string; guardianRespondedAt?: string }
type ChildWardDraftAction = 'accepted' | 'declined' | 'remove'
type ChildWardDraftChange = { childUserId: string; action: ChildWardDraftAction }
type User = { id: string; username: string; password?: string; country: string; ageGroup: string; connector?: string; connectorSelfDirected?: boolean; guardianConnections?: GuardianConnection[]; guardianUserId?: string; guardianUsername?: string; guardianStatus?: GuardianConnectionStatus | ''; guardianRequestedAt?: string; guardianRespondedAt?: string; profileId?: string; createdAt?: string; verifiedHumanAt?: string; verificationMethod?: VerificationMethod; verificationStatus?: ClaimPathway }
type Profile = { id: string; name: string; type: string; country: string; ageGroup: string; description: string; connector: string; createdAt?: string; createdByUserId?: string }
type Contribution = { id: string; recognitionName: string; amount: number; humanityFund: number; stewardshipReserve: number; country: string; ageGroup: string; contributorUserId?: string; actorUserId?: string; contributedByName?: string; profileId?: string; paymentMethod?: string; sourceClaimId?: string; recordKind?: 'contribution' | 'recycled-benefit'; simulation?: boolean; createdAt?: string; isAnonymous?: boolean; anonymousAlias?: string }
type ClaimRecord = { id: string; actorUserId?: string; userId?: string; profileId: string; targetName?: string; amount: number; action: 'claimed' | 'recycled'; recordKind?: 'claimed-benefit' | 'recycled-benefit'; simulation?: boolean; deliveryMethod?: string; denomination?: string; country?: string; ageGroup?: string; createdAt?: string }
type CountryRow = { country: string; people: number; contributions: number; connectors: number; claimants: number }
type AgeRow = { group: string; people: number }
type ProfileTypeRow = { type: string; count: number }
type Funds = typeof dashboardSample
type LoginResult = { ok: boolean; error?: string; sessionToken?: string; user?: User; profile?: Profile; contributions?: Contribution[]; claims?: ClaimRecord[] }
type UpdateUserProfileResult = { ok: boolean; error?: string; user?: User; profile?: Profile }
type UpdateUserVerificationResult = { ok: boolean; error?: string; user?: User; profile?: Profile }
type GuardianConnectionResult = { ok: boolean; error?: string; child?: User; guardian?: User }
type UpdateContributionProfileResult = { ok: boolean; error?: string; profile?: Profile }
type CreateClaimsResult = { ok: boolean; error?: string; claims?: ClaimRecord[]; contributions?: Contribution[] }
type PrototypeSnapshot = { users: User[]; profiles: Profile[]; contributions: Contribution[]; claims?: ClaimRecord[]; countries: CountryRow[]; ageGroups: AgeRow[]; profileTypes: ProfileTypeRow[]; funds: Funds }

const PRIVATE_BETA = import.meta.env.VITE_E4H_PRIVATE_BETA === 'true'
const API_BASE = import.meta.env.VITE_E4H_API_BASE || (PRIVATE_BETA ? '' : 'http://127.0.0.1:8787')

const screens: Array<{ id: ScreenId; label: string }> = [
  { id: 'welcome', label: 'Overview' },
  { id: 'connect', label: 'Connect' },
  { id: 'contribute', label: 'Contribute' },
  { id: 'claim', label: 'Claim' },
  { id: 'compound', label: 'Compound' },
  { id: 'recognition', label: 'Recognition' },
]

const coreCycle = [
  { title: 'Connect', description: 'Opt in to contribute and/or claim.' },
  { title: 'Contribute', description: 'Resources grow the fund.' },
  { title: 'Claim', description: 'Verify you are human to claim benefits.' },
  { title: 'Compound', description: 'Unclaimed benefits grow the fund.' },
]

const paymentMethods = ['Credit card', 'Stripe', 'PayPal', 'Bill payment', 'Crypto wallet', 'Stock transfer']
const contributionAssetTypes: ContributionAssetType[] = ['Dollars', 'Crypto asset', 'Stock']
const stockPriceExamples: Record<string, number> = { AAPL: 205.17, MSFT: 486.0, GOOGL: 285.0, AMZN: 220.0, TSLA: 429.0, NVDA: 143.0, MSTR: 367.0 }
const cryptoPriceExamples: Record<string, { label: string; price: number }> = {
  '': { label: 'Select cryptocurrency', price: 0 },
  BTC: { label: 'Bitcoin', price: 107000 },
  ETH: { label: 'Ethereum', price: 2450 },
  SOL: { label: 'Solana', price: 145 },
}
const contributionCircleLevels = [
  { name: 'Seed', threshold: 0, label: 'under $10', color: '#8fbf74' },
  { name: 'Sprout', threshold: 10, label: '$10+', color: '#89a86f' },
  { name: 'Sapling', threshold: 100, label: '$100+', color: '#5f966c' },
  { name: 'Olive', threshold: 1_000, label: '$1,000+', color: '#7b8552' },
  { name: 'Maple', threshold: 10_000, label: '$10,000+', color: '#c99a3d' },
  { name: 'Sequoia', threshold: 100_000, label: '$100,000+', color: '#b76a32' },
  { name: 'Grove', threshold: 1_000_000, label: '$1M+', color: '#6f3826' },
  { name: 'Orchard', threshold: 10_000_000, label: '$10M+', color: '#7b65a8' },
  { name: 'Forest', threshold: 100_000_000, label: '$100M+', color: '#557fa8' },
  { name: 'Rainforest', threshold: 1_000_000_000, label: '$1B+', color: '#4b9b94' },
]
const connectorRippleCircleLevels = [
  { name: 'Human connector', threshold: 1, label: '1+ people in your ripple', color: '#8fbf74' },
  { name: 'Local connector', threshold: 10, label: '10+ people in your ripple', color: '#89a86f' },
  { name: 'Community connector', threshold: 100, label: '100+ people in your ripple', color: '#5f966c' },
  { name: 'Regional connector', threshold: 1_000, label: '1,000+ people in your ripple', color: '#c99a3d' },
  { name: 'National connector', threshold: 10_000, label: '10,000+ people in your ripple', color: '#557fa8' },
  { name: 'Global connector', threshold: 100_000, label: '100,000+ people in your ripple', color: '#4b9b94' },
]
const contributionProfileTypes = ['In memory of', 'In honour of', 'Faith group', 'Organization', 'Family', 'Community group', 'Local initiative']
const ageBrackets = ['AI agent', '0–5', '6–10', '11–15', '16–20', '21–25', '26–30', '31–35', '36–40', '41–45', '46–50', '51–55', '56–60', '61–65', '66–70', '71–75', '76–80', '81–85', '86–90', '91–95', '96–100', '100+']
const countryOptions = ['Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Bangladesh', 'Brazil', 'Canada', 'China', 'Colombia', 'Democratic Republic of the Congo', 'Egypt', 'Ethiopia', 'France', 'Germany', 'Ghana', 'India', 'Indonesia', 'Iran', 'Iraq', 'Italy', 'Japan', 'Kenya', 'Lebanon', 'Mexico', 'Morocco', 'Nigeria', 'Pakistan', 'Philippines', 'Poland', 'Russia', 'Saudi Arabia', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Tanzania', 'Turkey', 'Ukraine', 'United Kingdom', 'United States', 'Vietnam', 'Digital']
const VT_FIVE_YEAR_AVERAGE_GROWTH = 10
const MINIMUM_CLAIM_DOLLARS = 0.05
const MAX_DIRECT_GUARDIAN_CONNECTIONS = 2
const MAX_ACTIVE_CHILD_WARD_CONNECTIONS = 10

function getGuardianConnections(user: User | null | undefined): GuardianConnection[] {
  const source = Array.isArray(user?.guardianConnections)
    ? user.guardianConnections
    : user?.guardianUserId
      ? [{
          guardianUserId: user.guardianUserId,
          guardianUsername: user.guardianUsername ?? '',
          guardianStatus: user.guardianStatus === 'accepted' || user.guardianStatus === 'declined' ? user.guardianStatus : 'pending',
          guardianRequestedAt: user.guardianRequestedAt,
          guardianRespondedAt: user.guardianRespondedAt,
        }]
      : []
  const seenGuardianIds = new Set<string>()
  return source.flatMap((connection) => {
    if (!connection?.guardianUserId || seenGuardianIds.has(connection.guardianUserId)) return []
    seenGuardianIds.add(connection.guardianUserId)
    const guardianStatus: GuardianConnectionStatus = connection.guardianStatus === 'accepted' || connection.guardianStatus === 'declined' ? connection.guardianStatus : 'pending'
    return [{
      guardianUserId: connection.guardianUserId,
      guardianUsername: connection.guardianUsername ?? '',
      guardianStatus,
      guardianRequestedAt: connection.guardianRequestedAt,
      guardianRespondedAt: connection.guardianRespondedAt,
    }]
  }).slice(0, MAX_DIRECT_GUARDIAN_CONNECTIONS)
}

function hasGuardianConnection(user: User | null | undefined, guardianUserId: string | undefined, status?: GuardianConnectionStatus) {
  return Boolean(guardianUserId && getGuardianConnections(user).some((connection) => connection.guardianUserId === guardianUserId && (!status || connection.guardianStatus === status)))
}

function guardianConnectionKey(connections: GuardianConnection[]) {
  return connections.map((connection) => `${connection.guardianUserId}:${connection.guardianStatus}`).join('|')
}

function App() {
  const [screen, setScreen] = useState<ScreenId>('welcome')
  const [snapshot, setSnapshot] = useState<PrototypeSnapshot | null>(null)
  const [averageGrowth, setAverageGrowth] = useState(VT_FIVE_YEAR_AVERAGE_GROWTH)
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('humanity')
  const [contributionAmount, setContributionAmount] = useState('')
  const [contributionAssetType, setContributionAssetType] = useState<ContributionAssetType>('Dollars')
  const [verifyMethod, setVerifyMethod] = useState<VerificationMethod>('')

  const [profileForm, setProfileForm] = useState({ name: '', type: '', country: '', ageGroup: '', description: '', connector: '' })
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [profileMessage, setProfileMessage] = useState('')
  const [accountMessage, setAccountMessage] = useState('')
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null)
  const [sessionToken, setSessionToken] = useState('')
  const [contributionMessage, setContributionMessage] = useState('')
  const [recognitionName, setRecognitionName] = useState('Prototype participant')
  const [paymentMethod, setPaymentMethod] = useState('')

  const refreshSnapshot = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/snapshot`)
      if (!response.ok) throw new Error(`API ${response.status}`)
      const data = await response.json() as PrototypeSnapshot
      setSnapshot(data)
      return data
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    void refreshSnapshot()
  }, [refreshSnapshot])

  const funds = snapshot?.funds ?? dashboardSample
  const countries = snapshot?.countries ?? fallbackCountrySamples
  const ageRows = snapshot?.ageGroups ?? fallbackAgeGroupSamples.map(([group, people]) => ({ group: String(group), people: Number(people) }))
  const profileRows = snapshot?.profileTypes ?? fallbackProfileTypeSamples.map(([type, count]) => ({ type: String(type), count: Number(count) }))
  const contributions = snapshot?.contributions ?? []

  const contributionAmountValue = Number(contributionAmount) || 0
  const claimPreview = calculatePayoutScenario({
    endowmentValue: funds.currentEndowment,
    averageGrowth: funds.averageGrowth,
    activeClaimants: Math.max(1, funds.activeClaimants),
    recycleRate: funds.recycleRate,
  })

  const createUser = async (input: { username: string; password: string; repeatPassword: string; ageGroup: string; country: string; connector: string; guardianUserIds?: string[]; betaAccessCode?: string }) => {
    setAccountMessage('')
    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(input.betaAccessCode ? { 'x-e4h-beta-code': input.betaAccessCode } : {}) },
        body: JSON.stringify(input),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || `API ${response.status}`)
      await refreshSnapshot()
      return { ok: true }
    } catch (error) {
      const message = error instanceof TypeError ? 'Could not reach the local JSON backend. Restart the prototype with npm run dev so the API and app run together, then try again.' : error instanceof Error ? error.message : 'Could not create account.'
      setAccountMessage(message)
      return { ok: false, error: message }
    }
  }

  const loginUser = async (input: { username: string; password: string }) => {
    setAccountMessage('Checking login…')
    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      const data = await response.json() as LoginResult
      if (!response.ok || !data.ok || !data.user || !data.sessionToken) throw new Error(data.error || 'Invalid username or password.')
      setLoggedInUser(data.user)
      setSessionToken(data.sessionToken)
      setVerifyMethod('')
      setContributionMessage('')
      if (data.profile) {
        setProfileForm((current) => ({ ...current, country: data.profile?.country ?? '', ageGroup: data.profile?.ageGroup ?? '', connector: data.profile?.connector ?? '' }))
      } else {
        setProfileForm((current) => ({ ...current, country: data.user?.country ?? '', ageGroup: data.user?.ageGroup ?? '', connector: data.user?.connector ?? '' }))
      }
      setAccountMessage(`Logged in as ${data.user.username}. Loaded ${data.contributions?.length ?? 0} contributions and ${data.claims?.length ?? 0} claims.`)
      await refreshSnapshot()
      return { ok: true }
    } catch (error) {
      const message = error instanceof TypeError ? 'Could not reach the local JSON backend. Restart the prototype with npm run dev so the API and app run together, then try again.' : error instanceof Error ? error.message : 'Could not log in.'
      setAccountMessage(message)
      return { ok: false, error: message }
    }
  }

  const logoutUser = () => {
    setLoggedInUser(null)
    setSessionToken('')
    setAccountMessage('')
    setContributionMessage('')
    setVerifyMethod('')
  }

  const updateLoggedInUserProfile = async (patch: { username?: string; password?: string; country?: string; ageGroup?: string; connector?: string; connectorSelfDirected?: boolean }) => {
    if (!loggedInUser) return { ok: false, error: 'No logged-in user.' }
    const nextUser = { ...loggedInUser, ...patch }
    try {
      const response = await fetch(`${API_BASE}/api/users/profile`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-e4h-session-token': sessionToken },
        body: JSON.stringify({ id: loggedInUser.id, username: patch.username, password: patch.password, country: nextUser.country, ageGroup: nextUser.ageGroup, connector: nextUser.connector ?? '', connectorSelfDirected: patch.connectorSelfDirected }),
      })
      const data = await response.json() as UpdateUserProfileResult
      if (!response.ok || !data.ok || !data.user) throw new Error(data.error || `API ${response.status}`)
      setLoggedInUser(data.user)
      if (data.profile && activeProfile && data.profile.id === activeProfile.id) setActiveProfile(data.profile)
      setProfileForm((current) => ({ ...current, country: data.user?.country ?? nextUser.country, ageGroup: data.user?.ageGroup ?? nextUser.ageGroup, connector: data.user?.connector ?? nextUser.connector ?? '' }))
      await refreshSnapshot()
      return { ok: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update profile.'
      setAccountMessage(message)
      return { ok: false, error: message }
    }
  }


  const requestGuardianConnection = async (guardianUserId: string): Promise<GuardianConnectionResult> => {
    if (!loggedInUser) return { ok: false, error: 'Please log in before requesting a parent / guardian connection.' }
    try {
      const response = await fetch(`${API_BASE}/api/guardian-connections/request`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-e4h-session-token': sessionToken },
        body: JSON.stringify({ guardianUserId }),
      })
      const data = await response.json() as GuardianConnectionResult
      if (!response.ok || !data.ok || !data.child) throw new Error(data.error || `API ${response.status}`)
      setLoggedInUser(data.child)
      await refreshSnapshot()
      return data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not submit the parent / guardian request.'
      setAccountMessage(message)
      return { ok: false, error: message }
    }
  }

  const respondGuardianConnection = async (childUserId: string, decision: 'accepted' | 'declined'): Promise<GuardianConnectionResult> => {
    if (!loggedInUser) return { ok: false, error: 'Please log in before responding to a parent / guardian request.' }
    try {
      const response = await fetch(`${API_BASE}/api/guardian-connections/respond`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-e4h-session-token': sessionToken },
        body: JSON.stringify({ childUserId, decision }),
      })
      const data = await response.json() as GuardianConnectionResult
      if (!response.ok || !data.ok || !data.child) throw new Error(data.error || `API ${response.status}`)
      await refreshSnapshot()
      return data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not respond to the parent / guardian request.'
      setAccountMessage(message)
      return { ok: false, error: message }
    }
  }

  const removeGuardianConnection = async (childUserId: string, guardianUserId?: string): Promise<GuardianConnectionResult> => {
    if (!loggedInUser) return { ok: false, error: 'Please log in before removing a parent / guardian connection.' }
    try {
      const response = await fetch(`${API_BASE}/api/guardian-connections/remove`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-e4h-session-token': sessionToken },
        body: JSON.stringify({ childUserId, guardianUserId }),
      })
      const data = await response.json() as GuardianConnectionResult
      if (!response.ok || !data.ok || !data.child) throw new Error(data.error || `API ${response.status}`)
      if (data.child.id === loggedInUser.id) setLoggedInUser(data.child)
      await refreshSnapshot()
      return data
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not remove the parent / guardian connection.'
      setAccountMessage(message)
      return { ok: false, error: message }
    }
  }

  const updateLoggedInUserVerification = async (input: { verificationMethod: VerificationMethod }) => {
    if (!loggedInUser) return { ok: false, error: 'Please log in before saving verified-human status.' }
    try {
      const response = await fetch(`${API_BASE}/api/users/verification`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-e4h-session-token': sessionToken },
        body: JSON.stringify({ id: loggedInUser.id, ...input }),
      })
      const data = await response.json() as UpdateUserVerificationResult
      if (!response.ok || !data.ok || !data.user) throw new Error(data.error || `API ${response.status}`)
      setLoggedInUser(data.user)
      setVerifyMethod('')
      await refreshSnapshot()
      return { ok: true, user: data.user }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save verified-human status.'
      setAccountMessage(message)
      return { ok: false, error: message }
    }
  }

  const selectRecognitionProfile = (profile: Profile) => {
    setActiveProfile(profile)
    setRecognitionName(profile.name)
    setProfileForm((current) => ({ ...current, name: profile.name, type: profile.type, country: profile.country, ageGroup: profile.ageGroup, description: profile.description, connector: profile.connector }))
  }

  const clearRecognitionProfile = () => {
    setActiveProfile(null)
    setRecognitionName('Prototype participant')
    setProfileForm((current) => ({ ...current, name: '', type: 'Faith group', country: '', ageGroup: '', description: '' }))
  }

  const saveProfile = async () => {
    setProfileMessage('Saving profile to local JSON file…')
    try {
      const response = await fetch(`${API_BASE}/api/profiles`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-e4h-session-token': sessionToken },
        body: JSON.stringify({ ...profileForm, createdByUserId: loggedInUser?.id ?? '' }),
      })
      if (!response.ok) throw new Error(`API ${response.status}`)
      const profile = await response.json() as Profile
      setProfileMessage('')
      await refreshSnapshot()
      return profile
    } catch {
      setProfileMessage('Could not save yet. Start the backend with npm run api, then try again.')
      return null
    }
  }

  const updateContributionProfile = async (profileId: string, input: { name: string; type: string; country: string; description: string }) => {
    try {
      const response = await fetch(`${API_BASE}/api/profiles/update`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-e4h-session-token': sessionToken },
        body: JSON.stringify({ id: profileId, userId: loggedInUser?.id ?? '', ...input }),
      })
      const data = await response.json() as UpdateContributionProfileResult
      if (!response.ok || !data.ok || !data.profile) throw new Error(data.error || `API ${response.status}`)
      setProfileMessage('')
      await refreshSnapshot()
      return data.profile
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Could not update profile.')
      return null
    }
  }

  const saveContribution = async (contributionValue = contributionAmountValue, contributionPaymentMethod = paymentMethod, targetUsers?: User[], isAnonymous = false, recognitionProfile: Profile | null = null) => {
    if (!loggedInUser) {
      setContributionMessage('Please sign in first, or create a login and profile in Connect before making a contribution.')
      return false
    }
    const selectedRecognitionProfile = recognitionProfile && recognitionProfile.id !== loggedInUser.profileId ? recognitionProfile : null
    const contributionTargets = targetUsers && targetUsers.length > 0 ? targetUsers : [loggedInUser]
    const contributionAmounts = splitContributionEqually(contributionValue, contributionTargets.length)
    setContributionMessage('Saving simulated contribution…')
    try {
      const savedContributions: Contribution[] = []
      for (const [targetIndex, targetUser] of contributionTargets.entries()) {
        const response = await fetch(`${API_BASE}/api/contributions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-e4h-session-token': sessionToken },
          body: JSON.stringify({
            profileId: selectedRecognitionProfile?.id ?? targetUser.profileId ?? 'manual-profile',
            recognitionName: selectedRecognitionProfile ? recognitionName : targetUser.username,
            amount: contributionAmounts[targetIndex],
            allocationMode,
            paymentMethod: contributionPaymentMethod,
            stewardshipTip: 0,
            contributorUserId: loggedInUser.id,
            country: selectedRecognitionProfile?.country ?? targetUser.country ?? profileForm.country,
            ageGroup: selectedRecognitionProfile?.ageGroup ?? targetUser.ageGroup ?? profileForm.ageGroup,
            isAnonymous,
          }),
        })
        if (!response.ok) throw new Error(`API ${response.status}`)
        savedContributions.push(await response.json() as Contribution)
      }
      const targetNames = selectedRecognitionProfile ? [selectedRecognitionProfile.name] : contributionTargets.map((target) => target.username)
      const isOnBehalfOfAnother = Boolean(selectedRecognitionProfile || contributionTargets.some((target) => target.id !== loggedInUser.id))
      const totalSaved = savedContributions.reduce((total, contribution) => total + contribution.amount, 0)
      const behalfText = isOnBehalfOfAnother ? ` on behalf of ${targetNames.join(', ')}` : ''
      setContributionMessage(`Saved ${formatMoney(totalSaved)} contribution${savedContributions.length === 1 ? '' : 's'}${behalfText}. Thank you for your generosity.`)
      setContributionAmount('')
      setContributionAssetType('Dollars')
      setAllocationMode('humanity')
      setPaymentMethod('')
      await refreshSnapshot()
      return true
    } catch {
      setContributionMessage('Could not save yet. Start the backend with npm run api, then try again.')
      return false
    }
  }

  const saveClaims = async (input: { action: 'claimed' | 'recycled'; amount: number; targetUserIds: string[]; deliveryMethod?: string; denomination?: string; allocationMode?: AllocationMode; isAnonymous?: boolean; recycleDestinations?: Array<{ profileId: string }> }) => {
    if (!loggedInUser) return { ok: false, error: 'Please sign in before making a claim.' }
    try {
      const response = await fetch(`${API_BASE}/api/claims`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-e4h-session-token': sessionToken },
        body: JSON.stringify(input),
      })
      const data = await response.json() as CreateClaimsResult
      if (!response.ok || !data.ok) throw new Error(data.error || `API ${response.status}`)
      await refreshSnapshot()
      if (input.action === 'recycled') {
        setContributionAmount('')
        setContributionAssetType('Dollars')
        setAllocationMode('humanity')
        setPaymentMethod('')
        const fundLabel = allocationOptions.find((option) => option.id === (input.allocationMode ?? 'humanity'))?.label ?? 'Humanity Fund'
        const recycledClaims = data.claims ?? []
        const benefitSourceNames = [...new Set(recycledClaims.map((claim) => claim.targetName ?? 'selected participant'))]
        const recipientNames = [...new Set((data.contributions ?? []).map((contribution) => contribution.recognitionName || 'selected recipient'))]
        const sourceText = benefitSourceNames.length > 0 ? ` for ${benefitSourceNames.join(', ')}` : ''
        const recipientText = recipientNames.length > 0 ? ` Contribution credit goes to ${recipientNames.join(', ')}.` : ''
        const aliasText = input.isAnonymous && data.contributions?.[0]?.anonymousAlias ? ` anonymously under ${data.contributions[0].anonymousAlias}` : ''
        setContributionMessage(`Recycled ${formatMoney(input.amount * input.targetUserIds.length)} benefit${sourceText} into ${fundLabel}${aliasText}.${recipientText} The corresponding participant and recognition ledgers are updated.`)
        setScreen('contribute')
      }
      return { ok: true, claims: data.claims ?? [], contributions: data.contributions ?? [] }
    } catch (error) {
      const message = error instanceof TypeError ? 'Could not reach the local JSON backend. Restart the prototype with npm run dev so the API and app run together, then try again.' : error instanceof Error ? error.message : 'Could not save claim.'
      return { ok: false, error: message }
    }
  }

  return (
    <div className="app-shell">
      <header className={`hero-panel ${screen === 'welcome' ? 'hero-panel-full' : 'hero-panel-compact'}`} id="top">
        <nav className="topbar" aria-label="Prototype navigation">
          <a className="brand" href="#top" onClick={() => setScreen('welcome')}>
            <img src="/equity-for-humanity-logo.svg" alt="Equity for Humanity" />
            <span>Equity for Humanity</span>
          </a>
          <span className="status-pill">Prototype · simulated data only</span>
        </nav>

        <div className="hero-grid">
          <div>
            <p className="eyebrow">App + dashboard concept validator</p>
            <h1>Universal ownership for the AI transition.</h1>
            <p className="hero-copy">
              Our community is humanity. Our benefit is universal. This prototype shows a simple path to connect, contribute, claim, compound, and recognize humanity’s shared ownership.
            </p>
            <div className="hero-actions">
              <button type="button" className="primary" onClick={() => setScreen('connect')}>Start with Connect</button>
              <button type="button" className="secondary" onClick={() => setScreen('recognition')}>View recognition dashboard</button>
            </div>
            <p className="disclaimer">Equity for Humanity is a founding public concept, not yet a registered charity, foundation, trust, securities offering, investment product, donation platform, wallet, or payout system.</p>
          </div>
          <aside className="system-card" aria-label="Connect Contribute Claim Compound loop">
            <h2>A self-improving cycle of shared ownership.</h2>
            <p className="muted">Each round connects people, grows the fund, supports verified claims, and recycles unclaimed benefits back into long-term ownership.</p>
            <div className="cycle-frame">
              <div className="square-cycle">
                {coreCycle.map((step, index) => (
                  <div className={`node ${step.title.toLowerCase()}`} key={step.title}>
                    <div className="node-title"><span className="node-num">{index + 1}</span><b>{step.title}</b></div>
                    <p>{step.description}</p>
                  </div>
                ))}
                <i className="arrow right">→</i><i className="arrow down">↓</i><i className="arrow left">←</i><i className="arrow up">↑</i>
              </div>
              <div className="feedback-note">Transparent results encourage future growth.</div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        <aside className="screen-nav" aria-label="Prototype screens">
          {screens.map((item) => <button className={screen === item.id ? 'active' : ''} key={item.id} onClick={() => setScreen(item.id)} type="button">{item.label}</button>)}
        </aside>

        <section className="screen-panel">
          {screen === 'welcome' && <WelcomeScreen onJump={setScreen} />}
          {screen === 'connect' && <ConnectScreen accountMessage={accountMessage} claims={snapshot?.claims ?? []} contributions={contributions} countryOptions={countryOptions} loggedInUser={loggedInUser} onClaim={() => setScreen('claim')} onCreateUser={createUser} onLogin={loginUser} onLogout={logoutUser} onNext={() => setScreen('contribute')} onUpdateUserProfile={updateLoggedInUserProfile} onRequestGuardianConnection={requestGuardianConnection} onRespondGuardianConnection={respondGuardianConnection} onRemoveGuardianConnection={removeGuardianConnection} users={snapshot?.users ?? []} />}
          {screen === 'contribute' && <ContributeScreen activeProfile={activeProfile && activeProfile.id !== loggedInUser?.profileId ? activeProfile : null} amount={contributionAmount} assetType={contributionAssetType} contributions={contributions} countryOptions={countryOptions} form={profileForm} loggedInUser={loggedInUser} message={contributionMessage} mode={allocationMode} onBack={() => setScreen('connect')} onChangeProfileForm={setProfileForm} onClearRecognitionProfile={clearRecognitionProfile} onNext={() => setScreen('claim')} onSave={saveContribution} onSaveProfile={saveProfile} onSelectRecognitionProfile={selectRecognitionProfile} onUpdateContributionProfile={updateContributionProfile} paymentMethod={paymentMethod} profileMessage={profileMessage} profiles={snapshot?.profiles ?? []} setAmount={setContributionAmount} setAssetType={setContributionAssetType} setMode={setAllocationMode} setPaymentMethod={setPaymentMethod} users={snapshot?.users ?? []} />}
          {screen === 'claim' && <ClaimScreen claimPreview={claimPreview} claims={snapshot?.claims ?? []} contributions={snapshot?.contributions ?? []} funds={funds} loggedInUser={loggedInUser} method={verifyMethod} onBack={() => setScreen('contribute')} onNext={() => setScreen('compound')} onSaveClaims={saveClaims} onVerifyHuman={updateLoggedInUserVerification} profiles={snapshot?.profiles ?? []} setMethod={setVerifyMethod} users={snapshot?.users ?? []} />}
          {screen === 'compound' && <CompoundScreen averageGrowth={averageGrowth} claims={snapshot?.claims ?? []} contributions={contributions} loggedInUser={loggedInUser} onBack={() => setScreen('claim')} onNext={() => setScreen('recognition')} onRefresh={refreshSnapshot} setAverageGrowth={setAverageGrowth} users={snapshot?.users ?? []} />}
          {screen === 'recognition' && <RecognitionScreen ageRows={ageRows} claims={snapshot?.claims ?? []} contributions={contributions} countries={countries} funds={funds} loggedInUser={loggedInUser} onBack={() => setScreen('compound')} profileRows={profileRows} profiles={snapshot?.profiles ?? []} users={snapshot?.users ?? []} />}
          {screen !== 'welcome' && <div className="nav-actions bottom-logout-actions"><LogoutNavButton loggedInUser={loggedInUser} onLoginClick={() => { setScreen('connect'); window.setTimeout(() => document.getElementById('connect-login-card')?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 0) }} onLogout={logoutUser} /></div>}
        </section>
      </main>
    </div>
  )
}

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return <div className="section-title"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{children && <p>{children}</p>}</div>
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="metric-card"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>
}

function NextStep({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button className="primary continue-cta" type="button" onClick={onClick}>{children}</button>
}

function LogoutNavButton({ loggedInUser, onLoginClick, onLogout }: { loggedInUser: User | null; onLoginClick: () => void; onLogout: () => void }) {
  return loggedInUser
    ? <button className="secondary logout-nav-button auth-pop-button" type="button" onClick={onLogout}>Log out</button>
    : <button className="primary logout-nav-button auth-pop-button" type="button" onClick={onLoginClick}>Log in</button>
}

function WelcomeScreen({ onJump }: { onJump: (screen: ScreenId) => void }) {
  return (
    <div className="screen-content">
      <SectionTitle eyebrow="Overview" title="A simple prototype for shared ownership.">
        This prototype is intentionally local and simulated. It is built to test the user experience, privacy stance, contribution flow, claim flow, dashboard, and recognition model before any live money or identity services exist.
      </SectionTitle>
      <div className="step-strip" aria-label="Prototype links">
        {screens.map((item) => <button key={item.id} type="button" onClick={() => onJump(item.id)}>{item.label}</button>)}
      </div>
      <NextStep onClick={() => onJump('connect')}>Continue to Connect</NextStep>
    </div>
  )
}

function validatePasswordDraft(password: string) {
  const issues: string[] = []
  if (!password) return issues
  if (password.length < 8) issues.push('Use at least 8 characters.')
  if (!/[A-Z]/.test(password)) issues.push('Use at least one capital letter.')
  if (!/[0-9]/.test(password)) issues.push('Use at least one number.')
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('Use at least one special character.')
  return issues
}

function PasswordField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false)
  return <label>{label}<span className="password-wrap"><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} type={show ? 'text' : 'password'} /><button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></span></label>
}

function ConnectScreen({ accountMessage, claims, contributions, countryOptions, loggedInUser, onClaim, onCreateUser, onLogin, onLogout, onNext, onUpdateUserProfile, onRequestGuardianConnection, onRespondGuardianConnection, onRemoveGuardianConnection, users }: { accountMessage: string; claims: ClaimRecord[]; contributions: Contribution[]; countryOptions: string[]; loggedInUser: User | null; onClaim: () => void; onCreateUser: (input: { username: string; password: string; repeatPassword: string; ageGroup: string; country: string; connector: string; guardianUserIds?: string[]; betaAccessCode?: string }) => Promise<{ ok: boolean; error?: string }>; onLogin: (input: { username: string; password: string }) => Promise<{ ok: boolean; error?: string }>; onLogout: () => void; onNext: () => void; onUpdateUserProfile: (patch: { username?: string; password?: string; country?: string; ageGroup?: string; connector?: string; connectorSelfDirected?: boolean }) => Promise<{ ok: boolean; error?: string }>; onRequestGuardianConnection: (guardianUserId: string) => Promise<GuardianConnectionResult>; onRespondGuardianConnection: (childUserId: string, decision: 'accepted' | 'declined') => Promise<GuardianConnectionResult>; onRemoveGuardianConnection: (childUserId: string, guardianUserId?: string) => Promise<GuardianConnectionResult>; users: User[] }) {
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [newAgeGroup, setNewAgeGroup] = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newGuardianConnections, setNewGuardianConnections] = useState<GuardianConnection[]>([])
  const [betaAccessCode, setBetaAccessCode] = useState('')
  const [localError, setLocalError] = useState('')
  const [connectorSearch, setConnectorSearch] = useState('')
  const [connectorCountry, setConnectorCountry] = useState('')
  const [connectorAgeGroup, setConnectorAgeGroup] = useState('')
  const [draftCountry, setDraftCountry] = useState('')
  const [draftAgeGroup, setDraftAgeGroup] = useState('')
  const [draftUsername, setDraftUsername] = useState('')
  const [draftPassword, setDraftPassword] = useState('')
  const [draftRepeatPassword, setDraftRepeatPassword] = useState('')
  const [draftConnector, setDraftConnector] = useState('')
  const [draftConnectorSelfDirected, setDraftConnectorSelfDirected] = useState(false)
  const [draftGuardianConnections, setDraftGuardianConnections] = useState<GuardianConnection[]>([])
  const [guardianSelectionConfirmed, setGuardianSelectionConfirmed] = useState(false)
  const [childWardDraftChanges, setChildWardDraftChanges] = useState<ChildWardDraftChange[]>([])
  const [guardianSearch, setGuardianSearch] = useState('')
  const [guardianCountry, setGuardianCountry] = useState('')
  const [guardianAgeGroup, setGuardianAgeGroup] = useState('')
  const [profileUpdateMessage, setProfileUpdateMessage] = useState('')
  const [connectorUpdateMessage, setConnectorUpdateMessage] = useState('')
  const [accountEditorOpen, setAccountEditorOpen] = useState(false)
  const [guardianEditorOpen, setGuardianEditorOpen] = useState(false)
  const [connectorEditorOpen, setConnectorEditorOpen] = useState(false)
  useEffect(() => {
    setDraftCountry(loggedInUser?.country ?? '')
    setDraftAgeGroup(loggedInUser?.ageGroup ?? '')
    setDraftUsername(loggedInUser?.username ?? '')
    setDraftPassword('')
    setDraftRepeatPassword('')
    setDraftConnector(loggedInUser?.connector === loggedInUser?.username ? '' : loggedInUser?.connector ?? '')
    setDraftConnectorSelfDirected(Boolean(loggedInUser?.connectorSelfDirected && !loggedInUser?.connector))
    setDraftGuardianConnections(getGuardianConnections(loggedInUser))
    setGuardianSelectionConfirmed(false)
    setChildWardDraftChanges([])
    setGuardianSearch('')
    setProfileUpdateMessage('')
    setConnectorUpdateMessage('')
    setAccountEditorOpen(false)
    setGuardianEditorOpen(false)
    setConnectorEditorOpen(false)
  }, [loggedInUser])
  const loginMatches = loginUsername ? users.filter((user) => user.username.toLowerCase().startsWith(loginUsername.toLowerCase())).slice(0, 6) : []
  const savedGuardianConnections = getGuardianConnections(loggedInUser)
  const acceptedChildren = users.filter((user) => hasGuardianConnection(user, loggedInUser?.id, 'accepted'))
  const pendingGuardianRequests = users.filter((user) => hasGuardianConnection(user, loggedInUser?.id, 'pending'))
  const activeChildWardCount = acceptedChildren.length + pendingGuardianRequests.length
  const parentGuardianSelectionLocked = acceptedChildren.length > 0
  const connectorMatches = users.filter((user) => {
    const isLoggedInUser = Boolean(loggedInUser && user.username === loggedInUser.username)
    const matchesText = !connectorSearch || user.username.toLowerCase().startsWith(connectorSearch.toLowerCase())
    const matchesCountry = !connectorCountry || user.country === connectorCountry
    const matchesAge = !connectorAgeGroup || user.ageGroup === connectorAgeGroup
    return !isLoggedInUser && matchesText && matchesCountry && matchesAge
  }).slice(0, 6)
  const guardianMatches = users.filter((user) => {
    const isLoggedInUser = Boolean(loggedInUser && user.username === loggedInUser.username)
    const isNewAccountUser = Boolean(!loggedInUser && newUsername && user.username.toLowerCase() === newUsername.toLowerCase())
    const matchesText = !guardianSearch || user.username.toLowerCase().startsWith(guardianSearch.toLowerCase())
    const matchesCountry = !guardianCountry || user.country === guardianCountry
    const matchesAge = !guardianAgeGroup || user.ageGroup === guardianAgeGroup
    return !isLoggedInUser && !isNewAccountUser && (!loggedInUser || !parentGuardianSelectionLocked) && matchesText && matchesCountry && matchesAge
  }).slice(0, 6)
  const activeChildWardCountFor = (guardianUserId: string) => users.filter((user) => getGuardianConnections(user).some((connection) => connection.guardianUserId === guardianUserId && (connection.guardianStatus === 'pending' || connection.guardianStatus === 'accepted'))).length
  const passwordIssues = validatePasswordDraft(newPassword)
  const draftPasswordIssues = validatePasswordDraft(draftPassword)
  const personalContributions = getSelfContributions(contributions, loggedInUser)
  const personalClaims = loggedInUser ? claims.filter((item) => item.userId === loggedInUser.id || item.profileId === loggedInUser.profileId || item.targetName === loggedInUser.username) : []
  const personalContributionTotal = personalContributions.reduce((total, item) => total + item.amount, 0)
  const personalClaimTotal = personalClaims.reduce((total, item) => total + item.amount, 0)
  const handleLogout = () => {
    setLoginUsername('')
    setLoginPassword('')
    onLogout()
  }
  const hasConnectorFilters = Boolean(connectorSearch || connectorCountry || connectorAgeGroup)
  const hasGuardianFilters = Boolean(guardianSearch || guardianCountry || guardianAgeGroup)
  const accountProfileDraftChanged = Boolean(loggedInUser && (draftUsername !== loggedInUser.username || Boolean(draftPassword || draftRepeatPassword) || draftCountry !== loggedInUser.country || draftAgeGroup !== loggedInUser.ageGroup))
  const savedConnector = loggedInUser?.connector === loggedInUser?.username ? '' : loggedInUser?.connector ?? ''
  const savedConnectorSelfDirected = Boolean(loggedInUser?.connectorSelfDirected && !savedConnector)
  const connectorDraftChanged = Boolean(loggedInUser && (draftConnector !== savedConnector || draftConnectorSelfDirected !== savedConnectorSelfDirected))
  const guardianDraftChanged = Boolean(loggedInUser && guardianConnectionKey(draftGuardianConnections) !== guardianConnectionKey(savedGuardianConnections))
  const guardianDraftRemovals = savedGuardianConnections.filter((connection) => !draftGuardianConnections.some((draftConnection) => draftConnection.guardianUserId === connection.guardianUserId))
  const guardianDraftRequests = draftGuardianConnections.filter((connection) => {
    const savedConnection = savedGuardianConnections.find((saved) => saved.guardianUserId === connection.guardianUserId)
    return !savedConnection || (savedConnection.guardianStatus === 'declined' && connection.guardianStatus === 'pending')
  })
  const guardianRemovalOnly = guardianDraftRemovals.length > 0 && guardianDraftRequests.length === 0
  const guardianRemovalIsPending = guardianRemovalOnly && guardianDraftRemovals.every((connection) => connection.guardianStatus === 'pending')
  const guardianRemovalIsAccepted = guardianRemovalOnly && guardianDraftRemovals.every((connection) => connection.guardianStatus === 'accepted')
  const childWardDraftChangeFor = (childUserId: string) => childWardDraftChanges.find((change) => change.childUserId === childUserId)
  const discardConnectorDraft = () => {
    setDraftConnector(savedConnector)
    setDraftConnectorSelfDirected(savedConnectorSelfDirected)
    setConnectorSearch('')
    setConnectorCountry('')
    setConnectorAgeGroup('')
    setConnectorEditorOpen(false)
    setConnectorUpdateMessage('')
  }
  const toggleConnectorEditor = () => {
    if (connectorEditorOpen) return discardConnectorDraft()
    setConnectorEditorOpen(true)
    setConnectorUpdateMessage('')
  }
  const clearConnector = () => {
    setDraftConnector('')
    setDraftConnectorSelfDirected(false)
    setConnectorSearch('')
    setConnectorUpdateMessage('Connector cleared locally. Confirm connector update to save it.')
  }
  const selectConnector = (user: User) => {
    if (loggedInUser && user.username === loggedInUser.username) return
    setDraftConnector(user.username)
    setDraftConnectorSelfDirected(false)
    setConnectorSearch(user.username)
    setConnectorUpdateMessage('Connector selected locally. Confirm connector update to save it.')
  }
  const selectGuardian = (user: User) => {
    if (loggedInUser && user.id === loggedInUser.id) return
    const guardianAtChildWardCapacity = activeChildWardCountFor(user.id) >= MAX_ACTIVE_CHILD_WARD_CONNECTIONS
    if (loggedInUser) {
      if (parentGuardianSelectionLocked) return setProfileUpdateMessage('An account with an accepted child / ward connection cannot identify a parent / guardian.')
      const existing = draftGuardianConnections.find((connection) => connection.guardianUserId === user.id)
      if (existing?.guardianStatus === 'declined') {
        if (guardianAtChildWardCapacity) return setProfileUpdateMessage(`This parent / guardian already has the maximum of ${MAX_ACTIVE_CHILD_WARD_CONNECTIONS} active child / ward connections.`)
        setDraftGuardianConnections((connections) => connections.map((connection) => connection.guardianUserId === user.id ? { ...connection, guardianStatus: 'pending', guardianRequestedAt: '', guardianRespondedAt: '' } : connection))
        setGuardianSelectionConfirmed(false)
        setProfileUpdateMessage('Parent / guardian request staged again. Confirm the request for their acceptance.')
        return
      }
      if (existing) return setProfileUpdateMessage('This parent / guardian account is already selected.')
      if (guardianAtChildWardCapacity) return setProfileUpdateMessage(`This parent / guardian already has the maximum of ${MAX_ACTIVE_CHILD_WARD_CONNECTIONS} active child / ward connections.`)
      if (draftGuardianConnections.length >= MAX_DIRECT_GUARDIAN_CONNECTIONS) return setProfileUpdateMessage('You can identify at most two direct parent / guardian accounts.')
      setDraftGuardianConnections((connections) => [...connections, { guardianUserId: user.id, guardianUsername: user.username, guardianStatus: 'pending' }])
      setGuardianSelectionConfirmed(false)
      setGuardianSearch(user.username)
      setProfileUpdateMessage('Parent / guardian selected locally. Confirm the request for their acceptance.')
      return
    }
    if (newGuardianConnections.some((connection) => connection.guardianUserId === user.id)) return setLocalError('This parent / guardian account is already selected.')
    if (guardianAtChildWardCapacity) return setLocalError(`This parent / guardian already has the maximum of ${MAX_ACTIVE_CHILD_WARD_CONNECTIONS} active child / ward connections.`)
    if (newGuardianConnections.length >= MAX_DIRECT_GUARDIAN_CONNECTIONS) return setLocalError('You can identify at most two direct parent / guardian accounts.')
    setNewGuardianConnections((connections) => [...connections, { guardianUserId: user.id, guardianUsername: user.username, guardianStatus: 'pending' }])
    setGuardianSearch(user.username)
  }
  const clearGuardian = (guardianUserId: string) => {
    if (loggedInUser) {
      setDraftGuardianConnections((connections) => connections.filter((connection) => connection.guardianUserId !== guardianUserId))
      setGuardianSelectionConfirmed(false)
      setProfileUpdateMessage('Parent / guardian selection cleared locally. Confirm the change to remove it.')
      return
    }
    setNewGuardianConnections((connections) => connections.filter((connection) => connection.guardianUserId !== guardianUserId))
    setGuardianSearch('')
  }
  const discardGuardianConnectionDraft = () => {
    setDraftGuardianConnections(savedGuardianConnections)
    setGuardianSelectionConfirmed(false)
    setChildWardDraftChanges([])
    setGuardianSearch('')
    setGuardianCountry('')
    setGuardianAgeGroup('')
    setGuardianEditorOpen(false)
    setProfileUpdateMessage('')
  }
  const toggleGuardianEditor = () => {
    if (guardianEditorOpen) return discardGuardianConnectionDraft()
    setGuardianEditorOpen(true)
  }
  const selectSelfDirectedConnection = () => {
    setDraftConnector('')
    setDraftConnectorSelfDirected(true)
    setConnectorSearch('')
    setConnectorEditorOpen(false)
    setConnectorUpdateMessage('You found Equity for Humanity yourself. Confirm connector update to save it.')
  }
  const confirmProfileUpdate = async () => {
    if (!draftUsername.trim()) return setProfileUpdateMessage('Username is required.')
    if (draftPasswordIssues.length > 0) return setProfileUpdateMessage(draftPasswordIssues.join(' '))
    if (draftPassword && draftPassword !== draftRepeatPassword) return setProfileUpdateMessage('Passwords must match.')
    setProfileUpdateMessage('Saving prototype profile update...')
    const result = await onUpdateUserProfile({ username: draftUsername, password: draftPassword, country: draftCountry, ageGroup: draftAgeGroup })
    if (result.ok) { setDraftPassword(''); setDraftRepeatPassword(''); setAccountEditorOpen(false) }
    const usernameChanged = result.ok && draftUsername.trim() !== loggedInUser?.username
    setProfileUpdateMessage(result.ok ? usernameChanged ? 'Username updated. This account, contribution history, claims, connector links, and parent / guardian links stayed attached.' : 'Updated.' : result.error ?? 'Could not update profile.')
  }
  const confirmConnectorUpdate = async () => {
    const safeConnector = draftConnector === loggedInUser?.username ? '' : draftConnector
    const connectorSelfDirected = Boolean(draftConnectorSelfDirected && !safeConnector)
    setConnectorUpdateMessage('Saving connector update...')
    const result = await onUpdateUserProfile({ connector: safeConnector, connectorSelfDirected })
    if (result.ok) {
      setConnectorEditorOpen(false)
      setDraftConnectorSelfDirected(connectorSelfDirected)
    }
    setConnectorUpdateMessage(result.ok ? safeConnector ? 'Connector updated.' : connectorSelfDirected ? 'You found Equity for Humanity yourself.' : 'No connector identified.' : result.error ?? 'Could not update connector.')
  }
  const confirmGuardianConnection = async () => {
    if (!loggedInUser) return
    if (!guardianDraftChanged) return setProfileUpdateMessage('Choose a parent / guardian change before confirming it.')
    if (parentGuardianSelectionLocked && guardianDraftRequests.length > 0) return setProfileUpdateMessage('An account with an accepted child / ward connection cannot identify a parent / guardian.')
    if (guardianDraftRequests.length > 0 && !guardianSelectionConfirmed) return setProfileUpdateMessage('Confirm the parent / guardian selection before submitting the request.')
    setProfileUpdateMessage('Confirming parent / guardian update...')
    for (const connection of guardianDraftRemovals) {
      const result = await onRemoveGuardianConnection(loggedInUser.id, connection.guardianUserId)
      if (!result.ok) return setProfileUpdateMessage(result.error ?? 'Could not remove parent / guardian connection.')
    }
    for (const connection of guardianDraftRequests) {
      const result = await onRequestGuardianConnection(connection.guardianUserId)
      if (!result.ok) return setProfileUpdateMessage(result.error ?? 'Could not confirm parent / guardian request.')
    }
    setGuardianEditorOpen(false)
    setGuardianCountry('')
    setGuardianAgeGroup('')
    setProfileUpdateMessage(guardianDraftRequests.length > 0 ? 'Each selected parent / guardian must accept this request before it becomes a connection.' : 'Parent / guardian connection removed.')
  }
  const confirmGuardianSelection = () => {
    if (!guardianDraftChanged || guardianDraftRequests.length === 0) return setProfileUpdateMessage('Choose a new or declined parent / guardian selection before confirming it.')
    if (parentGuardianSelectionLocked) return setProfileUpdateMessage('An account with an accepted child / ward connection cannot identify a parent / guardian.')
    setGuardianSelectionConfirmed(true)
    setProfileUpdateMessage('Parent / guardian selection confirmed. Submit the request when ready; each selected account must still accept it.')
  }
  const stageChildWardUpdate = (childUserId: string, action: ChildWardDraftAction) => {
    setChildWardDraftChanges((changes) => [...changes.filter((change) => change.childUserId !== childUserId), { childUserId, action }])
    const message = action === 'accepted'
      ? 'Child / ward acceptance staged locally.'
      : action === 'declined'
        ? 'Child / ward decline staged locally.'
        : 'Child / ward removal staged locally.'
    setProfileUpdateMessage(`${message} Confirm child / ward update to save it.`)
  }
  const clearChildWardDraftUpdate = (childUserId: string) => {
    setChildWardDraftChanges((changes) => changes.filter((change) => change.childUserId !== childUserId))
    setProfileUpdateMessage('Child / ward update cleared locally. No child / ward connection changed.')
  }
  const discardChildWardDraftUpdates = () => {
    setChildWardDraftChanges([])
    setProfileUpdateMessage('Child / ward update cancelled. No child / ward connection changed.')
  }
  const confirmChildWardUpdates = async () => {
    if (!loggedInUser || childWardDraftChanges.length === 0) return setProfileUpdateMessage('Choose a child / ward update before confirming it.')
    setProfileUpdateMessage('Confirming child / ward update...')
    const confirmedChildWardIds = new Set<string>()
    const retainUnconfirmedChildWardUpdates = () => {
      setChildWardDraftChanges((changes) => changes.filter((change) => !confirmedChildWardIds.has(change.childUserId)))
    }
    const handleChildWardUpdateFailure = (message: string) => {
      retainUnconfirmedChildWardUpdates()
      const confirmedCount = confirmedChildWardIds.size
      return setProfileUpdateMessage(confirmedCount > 0 ? `${confirmedCount} child / ward update${confirmedCount === 1 ? '' : 's'} confirmed. ${message}` : message)
    }
    for (const change of childWardDraftChanges.filter((change) => change.action === 'remove')) {
      const result = await onRemoveGuardianConnection(change.childUserId, loggedInUser.id)
      if (!result.ok) return handleChildWardUpdateFailure(result.error ?? 'Could not remove child / ward connection.')
      confirmedChildWardIds.add(change.childUserId)
    }
    for (const change of childWardDraftChanges.filter((change) => change.action !== 'remove')) {
      const decision = change.action === 'accepted' ? 'accepted' : 'declined'
      const result = await onRespondGuardianConnection(change.childUserId, decision)
      if (!result.ok) return handleChildWardUpdateFailure(result.error ?? 'Could not update child / ward connection.')
      confirmedChildWardIds.add(change.childUserId)
    }
    setChildWardDraftChanges([])
    setProfileUpdateMessage('Child / ward update confirmed.')
  }
  const submitCreate = async () => {
    if (!newUsername || !newAgeGroup || !newCountry || !newPassword) return setLocalError('Complete username, password, age group, and country.')
    if (passwordIssues.length > 0) return setLocalError(passwordIssues.join(' '))
    if (newPassword !== repeatPassword) return setLocalError('Passwords must match.')
    if (PRIVATE_BETA && !betaAccessCode.trim()) return setLocalError('Enter the private beta access code shared with trusted testers.')
    const result = await onCreateUser({ username: newUsername, password: newPassword, repeatPassword, ageGroup: newAgeGroup, country: newCountry, connector: '', guardianUserIds: newGuardianConnections.map((connection) => connection.guardianUserId), betaAccessCode })
    if (result.ok) {
      setShowCreateAccount(false)
      setLoginUsername(newUsername)
      setLoginPassword('')
      setNewGuardianConnections([])
      setLocalError('')
    } else setLocalError(result.error ?? 'Could not create account.')
  }

  return (
    <div className="screen-content">
      <SectionTitle eyebrow="Connect" title="Connect to Equity for Humanity.">
        Create your own account to contribute to the growth of Equity for Humanity, claim your benefits, or recognize the person or group your contribution is for.
      </SectionTitle>
      <div className="card-grid two">
        <div className="soft-card" id="connect-login-card">
          {!loggedInUser ? <>
            <h3>Log in</h3>
            <div className="form-stack">
              <label>Username<input value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} placeholder="Start typing your username" type="search" /></label>
              {loginMatches.length > 0 && <div className="result-list compact-results">{loginMatches.map((user) => <button key={user.id} type="button" onClick={() => setLoginUsername(user.username)}>{user.username}</button>)}</div>}
              <PasswordField label="Password" value={loginPassword} onChange={setLoginPassword} placeholder="Enter your local prototype password" />
              <button className="primary" type="button" onClick={() => void onLogin({ username: loginUsername, password: loginPassword })}>Log in</button>
              <div className="auth-row">
                <button className="secondary" type="button">Log in with Google</button>
                <button className="secondary" type="button">Log in with Apple</button>
                <button className="secondary" type="button">Log in with Facebook</button>
              </div>
              <button className="secondary create-account-button" type="button" onClick={() => setShowCreateAccount(true)}>Create a new account</button>
            </div>
          </> : <>
            <h3>Profile summary</h3>
            <div className="account-profile-summary" aria-label="Logged-in prototype profile summary">
              <p className="account-summary-name">Logged in as <strong>{loggedInUser.username}</strong></p>
              <dl className="profile-summary-list">
                <div><dt>Country</dt><dd>{loggedInUser.country || 'Not selected'}</dd></div>
                <div><dt>Age group</dt><dd>{loggedInUser.ageGroup || 'Not selected'}</dd></div>
              </dl>
              <p className="muted small-note">This is local prototype data only. It is not a real account, credential, identity check, or payment record.</p>
            </div>
            <div className="account-editor-toggles profile-editor-toggle-group">
              <button className={`secondary full-width account-edit-toggle editor-toggle${accountEditorOpen ? ' open' : ''}`} type="button" aria-expanded={accountEditorOpen} aria-controls="account-profile-editor" onClick={() => setAccountEditorOpen((open) => !open)}>{accountEditorOpen ? 'Close update user profile' : 'Open update user profile'}</button>
            </div>
            {accountEditorOpen && <div className="form-stack account-profile-editor" id="account-profile-editor">
              <div className="form-grid compact logged-in-profile-fields account-settings-grid">
                <label className="account-settings-row">Username<input value={draftUsername} onChange={(event) => { setDraftUsername(event.target.value); setProfileUpdateMessage('Press Confirm update to save account changes.') }} placeholder="Username" /></label>
                <div className="account-settings-row"><PasswordField label="New password" value={draftPassword} onChange={(value) => { setDraftPassword(value); setProfileUpdateMessage('Press Confirm update to save account changes.') }} placeholder="Leave blank to keep current prototype password" /></div>
                <div className="account-settings-row"><PasswordField label="Repeat new password" value={draftRepeatPassword} onChange={(value) => { setDraftRepeatPassword(value); setProfileUpdateMessage('Press Confirm update to save account changes.') }} placeholder="Repeat only if changing password" /></div>
                {(draftPasswordIssues.length > 0 || (draftPassword && draftPassword !== draftRepeatPassword)) && <div className="password-rules compact-password-rules account-settings-row"><strong>Password update</strong>{draftPasswordIssues.length > 0 && <ul>{draftPasswordIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}{draftPassword && draftPassword !== draftRepeatPassword && <p>Passwords must match.</p>}</div>}
                <label>Country<select value={draftCountry} onChange={(event) => { setDraftCountry(event.target.value); setProfileUpdateMessage('Press Confirm update to save profile changes.') }}><option value="">Select country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></label>
                <label>Age group<select value={draftAgeGroup} onChange={(event) => { setDraftAgeGroup(event.target.value); setProfileUpdateMessage('Press Confirm update to save profile changes.') }}><option value="">Select age group or AI agent</option>{ageBrackets.map((age) => <option key={age}>{age}</option>)}</select></label>
              </div>
              <p className="muted small-note">Leave the password fields blank to keep the current prototype password. These changes affect only this local simulated beta record.</p>
              <div className="account-editor-actions">
                <button className="secondary full-width confirm-update" disabled={!accountProfileDraftChanged} type="button" onClick={() => { void confirmProfileUpdate() }}>Confirm update</button>
                <button className="secondary full-width" type="button" onClick={() => setAccountEditorOpen(false)}>Cancel profile update</button>
              </div>
            </div>}
            <div className="guardian-connection-summary" aria-label="Parent and guardian connection summary">
              {savedGuardianConnections.length === 0 && <p><strong>No parent / guardian identified.</strong></p>}
              {savedGuardianConnections.map((connection) => <p key={connection.guardianUserId}>
                {connection.guardianStatus === 'pending' && <><strong>Parent / guardian request pending:</strong> {connection.guardianUsername || 'Selected account'} has not accepted it yet.</>}
                {connection.guardianStatus === 'accepted' && <><strong>Parent / guardian accepted:</strong> {connection.guardianUsername || 'Selected account'}.</>}
                {connection.guardianStatus === 'declined' && <><strong>Parent / guardian request declined:</strong> choose a parent or guardian and submit a new request.</>}
              </p>)}
              {parentGuardianSelectionLocked && <p className="muted small-note"><strong>Parent / guardian selection is unavailable.</strong> This account already has an accepted child / ward connection, so it cannot identify a parent or guardian. This prevents circular or tiered fictional relationships.</p>}
              {pendingGuardianRequests.length > 0 && <p><strong>{pendingGuardianRequests.length} child / ward request{pendingGuardianRequests.length === 1 ? '' : 's'} awaiting your response.</strong></p>}
              {acceptedChildren.length > 0 ? <div className="accepted-children-summary"><strong>{acceptedChildren.length} child / ward connection{acceptedChildren.length === 1 ? '' : 's'} accepted</strong><ul>{acceptedChildren.map((child) => <li key={child.id}>{child.username}</li>)}</ul></div> : <p>No child / ward connections accepted.</p>}
              <p className="muted small-note"><strong>Child / ward capacity:</strong> {activeChildWardCount} of {MAX_ACTIVE_CHILD_WARD_CONNECTIONS} active child / ward connections. Pending requests reserve capacity until they are accepted, declined, or removed.</p>
            </div>
            <div className="account-editor-toggles guardian-editor-toggle-group">
              <button className={`secondary full-width guardian-editor-toggle editor-toggle${guardianEditorOpen ? ' open' : ''}`} type="button" aria-expanded={guardianEditorOpen} aria-controls="guardian-account-editor" onClick={toggleGuardianEditor}>{guardianEditorOpen ? 'Close update parent / guardian connection' : 'Open update parent / guardian connection'}</button>
            </div>
            {guardianEditorOpen && <div className="form-stack guardian-account-editor" id="guardian-account-editor">
              <details className="info-disclosure"><summary><span>Update parent / guardian connection</span><span className="info-toggle small-info-toggle" aria-label="More information about parent or guardian connections">i</span></summary><p className="muted info-panel">You may identify up to two direct parent / guardian accounts. Each selection creates only a fictional local request and remains inactive until that person accepts it. This prototype does not create a real relationship, verify identity, or give grandparents or other tiers authority.</p></details>
              <section className="guardian-child-update" aria-labelledby="guardian-child-update-heading">
                <h4 id="guardian-child-update-heading">Your parent / guardian selection</h4>
                <p className="muted small-note"><strong>Direct parent / guardian capacity:</strong> {draftGuardianConnections.length} of {MAX_DIRECT_GUARDIAN_CONNECTIONS}. Each selected account must accept separately.</p>
                {parentGuardianSelectionLocked ? <div className="callout compact-callout"><strong>Parent / guardian selection is unavailable.</strong> You already have an accepted child / ward connection. Clear any existing own parent / guardian selection before accepting a child / ward relationship, and do not create tiers or circles.</div> : <>
                  <div className="form-grid compact connector-filter-grid">
                    <label>Filter by country<select value={guardianCountry} onChange={(event) => setGuardianCountry(event.target.value)}><option value="">Any country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></label>
                    <label>Filter by age group<select value={guardianAgeGroup} onChange={(event) => setGuardianAgeGroup(event.target.value)}><option value="">Any age group</option>{ageBrackets.map((age) => <option key={age}>{age}</option>)}</select></label>
                  </div>
                  <label>Search parent / guardian name<input value={guardianSearch} onChange={(event) => setGuardianSearch(event.target.value)} placeholder="Start typing a parent / guardian name" type="search" /></label>
                  {hasGuardianFilters && <div className="result-list compact-results">{guardianMatches.length > 0 ? guardianMatches.map((user) => {
                    const childWardCount = activeChildWardCountFor(user.id)
                    const guardianAtCapacity = childWardCount >= MAX_ACTIVE_CHILD_WARD_CONNECTIONS
                    return <button disabled={guardianAtCapacity} key={user.id} title={guardianAtCapacity ? 'This parent / guardian has reached the maximum child / ward capacity.' : undefined} type="button" onClick={() => selectGuardian(user)}>{user.username}<small>{user.country} · {user.ageGroup} · {childWardCount} of {MAX_ACTIVE_CHILD_WARD_CONNECTIONS} child / ward connections{guardianAtCapacity ? ' — capacity reached' : ''}</small></button>
                  }) : <p className="muted">No parent / guardian accounts match those filters yet.</p>}</div>}
                </>}
                {draftGuardianConnections.map((connection) => {
                  const savedConnection = savedGuardianConnections.find((saved) => saved.guardianUserId === connection.guardianUserId)
                  const status = !savedConnection ? ' (ready to submit)' : connection.guardianStatus === 'accepted' ? ' (accepted)' : connection.guardianStatus === 'pending' ? ' (awaiting acceptance)' : ' (declined)'
                  return <div key={connection.guardianUserId} className="callout green selected-connector"><span>Selected parent / guardian: <strong>{connection.guardianUsername || 'Selected account'}</strong>{status}</span><button className="secondary" type="button" onClick={() => clearGuardian(connection.guardianUserId)}>Clear selection</button></div>
                })}
                <p className="muted small-note">A selected parent or guardian must accept before this is an accepted connection. A declined request may be selected again and resubmitted. Clearing a pending request or accepted connection is only saved when you use its confirm action below.</p>
                <div className="account-editor-actions guardian-editor-actions">
                  {guardianDraftRequests.length > 0 && !guardianSelectionConfirmed && <button className="secondary full-width confirm-update" disabled={!guardianDraftChanged} type="button" onClick={confirmGuardianSelection}>Confirm parent / guardian selection</button>}
                  {guardianDraftRequests.length > 0 && guardianSelectionConfirmed && <button className="secondary full-width confirm-update" type="button" onClick={() => { void confirmGuardianConnection() }}>Submit parent / guardian request</button>}
                  {guardianRemovalIsPending && <button className="secondary full-width confirm-update" type="button" onClick={() => { void confirmGuardianConnection() }}>Confirm cancel parent / guardian request</button>}
                  {guardianRemovalIsAccepted && <button className="secondary full-width confirm-update" type="button" onClick={() => { void confirmGuardianConnection() }}>Confirm remove parent / guardian connection</button>}
                  {!guardianRemovalOnly && guardianDraftRequests.length === 0 && <button className="secondary full-width confirm-update" disabled={!guardianDraftChanged} type="button" onClick={() => { void confirmGuardianConnection() }}>Confirm parent / guardian update</button>}
                  <button className="secondary full-width" type="button" onClick={discardGuardianConnectionDraft}>Cancel parent / guardian connection</button>
                </div>
              </section>
              {pendingGuardianRequests.length > 0 && <section className="guardian-request-list" aria-labelledby="guardian-pending-heading">
                <h4 id="guardian-pending-heading">Child / ward requests awaiting your response</h4>
                <p className="muted small-note">Accept only if this fictional local-demo account is the person you intend to represent. Declining leaves no accepted connection.</p>
                <div className="guardian-connection-rows">{pendingGuardianRequests.map((child) => {
                  const draftChange = childWardDraftChangeFor(child.id)
                  return <article key={child.id} className="guardian-connection-row"><div><strong>{child.username}</strong><small>{child.country || 'Country not selected'} · {child.ageGroup || 'Age group not selected'}</small>{draftChange && <small><strong>{draftChange.action === 'accepted' ? 'Acceptance staged.' : 'Decline staged.'}</strong> Confirm child / ward update to save it.</small>}</div><div className="guardian-row-actions">{draftChange ? <button className="secondary" type="button" onClick={() => clearChildWardDraftUpdate(child.id)}>Clear staged child / ward update</button> : <><button className="secondary" type="button" onClick={() => stageChildWardUpdate(child.id, 'accepted')}>Accept child / ward connection</button><button className="secondary" type="button" onClick={() => stageChildWardUpdate(child.id, 'declined')}>Decline child / ward connection</button></>}</div></article>
                })}</div>
              </section>}
              {acceptedChildren.length > 0 && <section className="guardian-accepted-list" aria-labelledby="guardian-accepted-heading">
                <h4 id="guardian-accepted-heading">Accepted child / ward connections</h4>
                <div className="guardian-connection-rows">{acceptedChildren.map((child) => {
                  const draftChange = childWardDraftChangeFor(child.id)
                  return <article key={child.id} className="guardian-connection-row"><div><strong>{child.username}</strong><small>{child.country || 'Country not selected'} · {child.ageGroup || 'Age group not selected'}</small>{draftChange && <small><strong>Removal staged.</strong> Confirm child / ward update to save it.</small>}</div><div className="guardian-row-actions">{draftChange ? <button className="secondary" type="button" onClick={() => clearChildWardDraftUpdate(child.id)}>Clear staged child / ward update</button> : <button className="secondary" type="button" onClick={() => stageChildWardUpdate(child.id, 'remove')}>Remove child / ward connection</button>}</div></article>
                })}</div>
              </section>}
              {childWardDraftChanges.length > 0 && <div className="account-editor-actions guardian-editor-actions guardian-child-update-actions">
                <button className="secondary full-width confirm-update" type="button" onClick={() => { void confirmChildWardUpdates() }}>Confirm child / ward update</button>
                <button className="secondary full-width" type="button" onClick={discardChildWardDraftUpdates}>Cancel child / ward update</button>
              </div>}
            </div>}
            {profileUpdateMessage && <div className="callout green compact-callout" role="status">{profileUpdateMessage}</div>}
            <div className="card-grid two login-metrics"><button className="metric-card metric-link" type="button" onClick={onNext}><span>Your own contributions</span><strong>{formatMoney(personalContributionTotal)}</strong><small>{personalContributions.length} contribution{personalContributions.length === 1 ? '' : 's'} for yourself — go to Contribute</small></button><button className="metric-card metric-link" type="button" onClick={onClaim}><span>Total claimed</span><strong>{formatMoney(personalClaimTotal)}</strong><small>{personalClaims.length} claim{personalClaims.length === 1 ? '' : 's'} — go to Claim</small></button></div>
            <button className="primary full-width logout-button" type="button" onClick={handleLogout}>Log out</button>
          </>}
          {accountMessage && !loggedInUser && <div className="callout green">{accountMessage}</div>}
        </div>
        <div className="soft-card">
          <h3>Recognize your connector</h3>
          <p>If someone helped you connect with Equity for Humanity, you may recognize their username. If you found Equity for Humanity yourself, you may record that instead. Your benefit is always yours.</p>
          {!loggedInUser ? <div className="callout compact-callout">Log in to view or update this account’s connector status.</div> : <>
            <div className="connector-status" aria-label="Current connector status">
              {savedConnector ? <p><strong>Current connector:</strong> {savedConnector}.</p> : savedConnectorSelfDirected ? <p><strong>You found Equity for Humanity yourself.</strong></p> : <p><strong>No connector identified.</strong></p>}
            </div>
            <div className="connector-choice-actions">
              <button className={`secondary full-width self-directed-button${draftConnectorSelfDirected ? ' selected' : ''}`} type="button" onClick={selectSelfDirectedConnection}>I found Equity for Humanity myself</button>
              <button className={`secondary full-width connector-editor-toggle${connectorEditorOpen ? ' open' : ''}`} type="button" aria-expanded={connectorEditorOpen} onClick={toggleConnectorEditor}>Someone helped me connect to Equity for Humanity</button>
            </div>
            {connectorEditorOpen && <div className="form-stack connector-editor">
              <div className="form-grid compact connector-filter-grid">
                <label>Filter by country<select value={connectorCountry} onChange={(event) => setConnectorCountry(event.target.value)}><option value="">Any country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></label>
                <label>Filter by age group<select value={connectorAgeGroup} onChange={(event) => setConnectorAgeGroup(event.target.value)}><option value="">Any age group</option>{ageBrackets.map((age) => <option key={age}>{age}</option>)}</select></label>
              </div>
              <label>Connector username<input value={connectorSearch} onChange={(event) => setConnectorSearch(event.target.value)} placeholder="Start typing a name" type="search" /></label>
              {hasConnectorFilters && <div className="result-list">{connectorMatches.length > 0 ? connectorMatches.map((user) => <button key={user.id} type="button" onClick={() => selectConnector(user)}>{user.username}<small>{user.country} · {user.ageGroup}</small></button>) : <p className="muted">No connectors match those filters yet.</p>}</div>}
            </div>}
            {draftConnector && <div className="callout green selected-connector"><span>Selected connector: <strong>{draftConnector}</strong> (ready to confirm)</span><button className="secondary" type="button" onClick={clearConnector}>Clear connector</button></div>}
            {draftConnectorSelfDirected && <div className="callout green selected-connector"><span>You found Equity for Humanity yourself. Confirm connector update to save this selection.</span><button className="secondary" type="button" onClick={clearConnector}>Clear self-directed status</button></div>}
            <div className="account-editor-actions connector-editor-actions">
              <button className="secondary full-width confirm-update" disabled={!connectorDraftChanged} type="button" onClick={() => { void confirmConnectorUpdate() }}>Confirm connector update</button>
              <button className="secondary full-width" type="button" onClick={discardConnectorDraft}>Cancel connector update</button>
            </div>
            {connectorUpdateMessage && <div className="callout green compact-callout" role="status">{connectorUpdateMessage}</div>}
          </>}
        </div>
      </div>

      <NextStep onClick={onNext}>Proceed to Contribute</NextStep>

      {showCreateAccount && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Create account">
        <div className="modal-card">
          <button className="modal-close" type="button" onClick={() => setShowCreateAccount(false)}>×</button>
          <h3>Create your account</h3>
          <p>Create a profile to contribute, claim benefits, and track your impact. This prototype stores only simulated local data.</p>
          <div className="auth-row">
            <button className="secondary" type="button">Create with Google</button>
            <button className="secondary" type="button">Create with Apple</button>
            <button className="secondary" type="button">Create with Facebook</button>
          </div>
          <div className="form-grid">
            <label>Username<input value={newUsername} onChange={(event) => setNewUsername(event.target.value)} placeholder="Choose a username" type="text" /></label>
            <PasswordField label="Password" value={newPassword} onChange={setNewPassword} placeholder="At least 8 characters" />
            <PasswordField label="Repeat password" value={repeatPassword} onChange={setRepeatPassword} placeholder="Repeat your password" />
            <div className="password-rules"><strong>Local prototype password</strong><span>Choose a password with at least 8 characters, one capital letter, one number, and one special character. It is only for this local simulated account.</span>{passwordIssues.length > 0 && <ul>{passwordIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}{newPassword && newPassword !== repeatPassword && <p>Passwords must match.</p>}</div>

            <label>Age group<select value={newAgeGroup} onChange={(event) => setNewAgeGroup(event.target.value)}><option value="">Select age group or AI agent</option>{ageBrackets.map((age) => <option key={age}>{age}</option>)}</select></label>
            <label>Country<select value={newCountry} onChange={(event) => setNewCountry(event.target.value)}><option value="">Select country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></label>
            {PRIVATE_BETA && <label>Private beta access code<input value={betaAccessCode} onChange={(event) => setBetaAccessCode(event.target.value)} placeholder="Enter the code shared with trusted testers" type="password" /></label>}
            <div className="guardian-picker modal-guardian-picker">
              <h4>For children or dependents, you may identify up to two parent or guardian accounts.</h4>
              <p className="muted">Search by name, country, and age group. Creating the account sends fictional local requests; each selected person must accept separately before any parent / guardian connection is accepted. It does not verify identity or create a real relationship.</p>
              <div className="form-grid compact connector-filter-grid">
                <label>Filter by country<select value={guardianCountry} onChange={(event) => setGuardianCountry(event.target.value)}><option value="">Any country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></label>
                <label>Filter by age group<select value={guardianAgeGroup} onChange={(event) => setGuardianAgeGroup(event.target.value)}><option value="">Any age group</option>{ageBrackets.map((age) => <option key={age}>{age}</option>)}</select></label>
              </div>
              <label>Search parent / guardian name<input value={guardianSearch} onChange={(event) => setGuardianSearch(event.target.value)} placeholder="Start typing a parent / guardian name" type="search" /></label>
              {hasGuardianFilters && <div className="result-list compact-results">{guardianMatches.length > 0 ? guardianMatches.map((user) => {
                const childWardCount = activeChildWardCountFor(user.id)
                const guardianAtCapacity = childWardCount >= MAX_ACTIVE_CHILD_WARD_CONNECTIONS
                return <button disabled={guardianAtCapacity} key={user.id} title={guardianAtCapacity ? 'This parent / guardian has reached the maximum child / ward capacity.' : undefined} type="button" onClick={() => selectGuardian(user)}>{user.username}<small>{user.country} · {user.ageGroup} · {childWardCount} of {MAX_ACTIVE_CHILD_WARD_CONNECTIONS} child / ward connections{guardianAtCapacity ? ' — capacity reached' : ''}</small></button>
              }) : <p className="muted">No parent / guardian accounts match those filters yet.</p>}</div>}
              <p className="muted small-note"><strong>Direct parent / guardian capacity:</strong> {newGuardianConnections.length} of {MAX_DIRECT_GUARDIAN_CONNECTIONS}.</p>
              {newGuardianConnections.map((connection) => <div key={connection.guardianUserId} className="callout green selected-connector"><span>Selected parent / guardian: <strong>{connection.guardianUsername}</strong> (pending their acceptance)</span><button className="secondary" type="button" onClick={() => clearGuardian(connection.guardianUserId)}>Clear selection</button></div>)}
            </div>
          </div>
          {localError && <div className="callout">{localError}</div>}
          <button className="primary" type="button" onClick={() => void submitCreate()}>Create account in prototype</button>
        </div>
      </div>}
    </div>
  )
}

function ContributeScreen({ amount, setAmount, assetType, setAssetType, mode, setMode, onBack, onNext, onSave, message, activeProfile, countryOptions, form, onChangeProfileForm, onClearRecognitionProfile, onSaveProfile, onSelectRecognitionProfile, onUpdateContributionProfile, paymentMethod, setPaymentMethod, profileMessage, profiles, loggedInUser, contributions, users }: { amount: string; setAmount: (value: string) => void; assetType: ContributionAssetType; setAssetType: (value: ContributionAssetType) => void; mode: AllocationMode; setMode: (value: AllocationMode) => void; onBack: () => void; onNext: () => void; onSave: (contributionValue?: number, contributionPaymentMethod?: string, targetUsers?: User[], isAnonymous?: boolean, recognitionProfile?: Profile | null) => Promise<boolean>; message: string; activeProfile: Profile | null; countryOptions: string[]; form: ContributionProfileForm; onChangeProfileForm: (value: ContributionProfileForm) => void; onClearRecognitionProfile: () => void; onSaveProfile: () => Promise<Profile | null>; onSelectRecognitionProfile: (profile: Profile) => void; onUpdateContributionProfile: (profileId: string, input: { name: string; type: string; country: string; description: string }) => Promise<Profile | null>; paymentMethod: string; setPaymentMethod: (value: string) => void; profileMessage: string; profiles: Profile[]; loggedInUser: User | null; contributions: Contribution[]; users: User[] }) {
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)
  const [stockTicker, setStockTicker] = useState('AAPL')
  const [cryptoSymbol, setCryptoSymbol] = useState('')
  const [selectedCircle, setSelectedCircle] = useState('')
  const [contributionAnimationLevel, setContributionAnimationLevel] = useState('')
  const [animationTargetIndex, setAnimationTargetIndex] = useState(-1)
  const [animationNonce, setAnimationNonce] = useState(0)
  const [fundGuideOpen, setFundGuideOpen] = useState(false)
  const [contributionFor, setContributionFor] = useState('self')
  const [contributionError, setContributionError] = useState('')
  const [anonymousContribution, setAnonymousContribution] = useState(false)
  const [showContributionProfileModal, setShowContributionProfileModal] = useState(false)
  const amountNumber = Number(amount) || 0
  const formAssetType = loggedInUser ? assetType : 'Dollars'
  const formPaymentMethod = loggedInUser ? paymentMethod : ''
  const normalizedTicker = stockTicker.trim().toUpperCase()
  const stockPrice = stockPriceExamples[normalizedTicker] ?? 100
  const cryptoPrice = cryptoPriceExamples[cryptoSymbol]?.price ?? 0
  const cryptoLabel = cryptoPriceExamples[cryptoSymbol]?.label ?? 'Select cryptocurrency'
  const contributionValue = formAssetType === 'Stock' ? amountNumber * stockPrice : formAssetType === 'Crypto asset' ? amountNumber * cryptoPrice : amountNumber
  const amountLabel = formAssetType === 'Stock' ? 'Number of shares' : formAssetType === 'Crypto asset' ? 'Number of coins' : 'Contribution amount'
  const amountPlaceholder = formAssetType === 'Stock' ? 'Enter number of shares' : formAssetType === 'Crypto asset' ? 'Enter number of coins' : 'Enter amount'
  const linkedDependents = loggedInUser ? users.filter((user) => user.id !== loggedInUser.id && hasGuardianConnection(user, loggedInUser.id, 'accepted')) : []
  const selectedContributionDependent = contributionFor.startsWith('dependent:') ? linkedDependents.find((user) => user.id === contributionFor.replace('dependent:', '')) : null
  const contributionTargets = contributionFor === 'self' && loggedInUser ? [loggedInUser] : contributionFor === 'all-dependents' ? linkedDependents : selectedContributionDependent ? [selectedContributionDependent] : loggedInUser ? [loggedInUser] : []
  const dependentContributionAmounts = contributionFor === 'all-dependents' ? splitContributionEqually(contributionValue, contributionTargets.length) : []
  const contributionAccounting = loggedInUser ? calculateContributionAccounting(contributions, loggedInUser.id, loggedInUser.profileId ?? '') : null
  const personalContributions = contributionAccounting?.selfContributions ?? []
  const ledgerContributions = contributionAccounting?.recordedByUser ?? []
  const ledgerTitle = 'Your simulated contribution ledger'
  const ledgerNote = 'This ledger always shows the contributions or recycled benefits you recorded. Amounts credited to another person or group are labelled “on behalf of …” and do not count toward your own fund total; your circle is based on total credit to your profile.'
  const totalHumanity = contributionAccounting?.selfHumanityFundTotal ?? 0
  const totalStewardship = contributionAccounting?.selfStewardshipFundTotal ?? 0
  const recycledClaims = personalContributions.filter((entry) => entry.sourceClaimId).reduce((total, entry) => total + entry.amount, 0)
  const personalTotalContributions = contributionAccounting?.selfContributionTotal ?? 0
  const onBehalfContributionTotal = contributionAccounting?.onBehalfContributionTotal ?? 0
  const onBehalfRecognitionTotal = contributionAccounting?.onBehalfRecognitionTotal ?? onBehalfContributionTotal
  const recordedContributionTotal = contributionAccounting?.recordedContributionTotal ?? 0
  const receivedContributionTotal = contributionAccounting?.receivedContributionTotal ?? 0
  const creditedToProfileTotal = contributionAccounting?.creditedToProfileTotal ?? 0
  const onBehalfContributionGroups = [...(contributionAccounting?.onBehalfContributions ?? []).reduce((totals, entry) => {
    const key = entry.profileId ?? entry.recognitionName
    const existing = totals.get(key) ?? { key, label: profiles.find((profile) => profile.id === entry.profileId)?.name ?? entry.recognitionName, amount: 0, humanityFund: 0, stewardshipReserve: 0 }
    existing.amount += entry.amount
    existing.humanityFund += entry.humanityFund
    existing.stewardshipReserve += entry.stewardshipReserve
    totals.set(key, existing)
    return totals
  }, new Map<string, { key: string; label: string; amount: number; humanityFund: number; stewardshipReserve: number }>()).values()].sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label))
  const selectedRecognitionHumanityFundTotal = activeProfile ? contributions.filter((entry) => entry.profileId === activeProfile.id).reduce((total, entry) => total + entry.humanityFund, 0) : 0
  const selectedRecognitionStewardshipFundTotal = activeProfile ? contributions.filter((entry) => entry.profileId === activeProfile.id).reduce((total, entry) => total + entry.stewardshipReserve, 0) : 0
  const currentLevel = contributionCircleLevels.reduce((current, level) => creditedToProfileTotal >= level.threshold ? level : current, contributionCircleLevels[0])
  const currentIndex = contributionCircleLevels.findIndex((level) => level.name === currentLevel.name)
  const nextLevel = contributionCircleLevels[currentIndex + 1] ?? currentLevel
  const nextTierGap = Math.max(0, nextLevel.threshold - creditedToProfileTotal)
  const visibleCircle = contributionCircleLevels.find((level) => level.name === (contributionAnimationLevel || selectedCircle || currentLevel.name)) ?? currentLevel
  const visibleIndex = contributionCircleLevels.findIndex((level) => level.name === visibleCircle.name)
  const fireworkCount = contributionAnimationLevel ? visibleIndex + 1 : 0
  const levelProgress = contributionCircleLevels.length > 1 ? Math.round((visibleIndex / (contributionCircleLevels.length - 1)) * 100) : 0
  const selectedFundLabel = allocationOptions.find((option) => option.id === mode)?.label ?? 'Humanity Fund'
  useEffect(() => {
    if (animationTargetIndex < 0) return undefined
    const path = contributionCircleLevels.slice(0, animationTargetIndex + 1)
    const stageDelay = 1_650
    const timers = path.map((level, index) => window.setTimeout(() => setContributionAnimationLevel(level.name), index * stageDelay))
    const done = window.setTimeout(() => setContributionAnimationLevel(''), Math.max(1, path.length) * stageDelay + 700)
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(done)
    }
  }, [animationNonce, animationTargetIndex])
  const formatContributionAmount = () => {
    if (!amount) return 'Amount not entered yet'
    if (assetType === 'Stock') return `${amountNumber.toLocaleString()} ${amountNumber === 1 ? 'share' : 'shares'} of ${normalizedTicker} at ${formatMoney(stockPrice)} per share = ${formatMoney(contributionValue)}`
    if (assetType === 'Crypto asset') return cryptoSymbol ? `${amountNumber.toLocaleString()} ${cryptoLabel} at ${formatMoney(cryptoPrice)} each = ${formatMoney(contributionValue)}` : `${amountNumber.toLocaleString()} coins — select cryptocurrency for the dollar equivalent`
    return formatMoney(amountNumber)
  }
  const paymentDetailsAreDisabled = true
  const paymentIntro = paymentMethod === 'Crypto wallet'
    ? 'These illustrative wallet fields are intentionally locked. This prototype does not move crypto.'
    : paymentMethod === 'Stock transfer'
      ? 'These illustrative transfer fields are intentionally locked. This prototype does not move shares.'
    : paymentMethod === 'Bill payment'
        ? 'These illustrative bill-payment fields are intentionally locked for the future bank-payment flow.'
      : paymentMethod === 'PayPal'
          ? 'These illustrative PayPal fields are intentionally locked. This prototype does not connect to PayPal.'
          : 'These illustrative card fields are intentionally locked. No real payment is processed.'
  const selectContributionDestination = (destination: string) => {
    setContributionFor(destination)
    setContributionError('')
    if (destination === 'other-person-or-group') setShowContributionProfileModal(true)
  }
  const confirmContribution = async () => {
    if (!paymentMethod) {
      setContributionError('Please choose a payment method before continuing.')
      setShowPaymentDetails(false)
      return
    }
    if (contributionFor === 'other-person-or-group' && !activeProfile) {
      setContributionError('Choose the person or group to recognize before continuing.')
      setShowContributionProfileModal(true)
      return
    }
    setContributionError('')
    const detail = assetType === 'Stock' ? ` · ${amountNumber.toLocaleString()} ${normalizedTicker} shares at ${formatMoney(stockPrice)} per share` : assetType === 'Crypto asset' && cryptoSymbol ? ` · ${amountNumber.toLocaleString()} ${cryptoLabel} at ${formatMoney(cryptoPrice)} each` : ''
    const recognitionProfile = contributionFor === 'other-person-or-group' ? activeProfile : null
    const saved = await onSave(contributionValue, `${paymentMethod || 'Payment method not selected'}${detail}`, contributionTargets, anonymousContribution, recognitionProfile)
    if (saved) {
      const projectedTotal = creditedToProfileTotal + (contributionFor === 'self' ? contributionValue : 0)
      const projectedIndex = contributionCircleLevels.reduce((target, level, index) => projectedTotal >= level.threshold ? index : target, 0)
      setSelectedCircle('')
      setAnimationTargetIndex(projectedIndex)
      setAnimationNonce((nonce) => nonce + 1)
      setAnonymousContribution(false)
      setShowPaymentDetails(false)
    }
  }
  return (
    <div className="screen-content">
      <SectionTitle eyebrow="Contribute" title="Contribute to support humanity through the AI transition.">
        Every contribution can help grow shared ownership, strengthen public stewardship, and support a future where AI progress helps make life better for all humanity.
      </SectionTitle>
      {!loggedInUser && <div className="callout green">Log in or create your account in Connect when you are ready to contribute. The blank fields below show what the contribution flow will ask for, but they stay locked until you are signed in.</div>}
      <div className="card-grid two">
        <div className="soft-card">
          <h3>Contribution details</h3>
          <div className="form-stack">
          {loggedInUser && <label>Who is this contribution for?<select value={contributionFor} onChange={(event) => selectContributionDestination(event.target.value)}><option value="self">My own contribution</option><option disabled={linkedDependents.length === 0} value="all-dependents">All my dependents</option>{linkedDependents.map((dependent) => <option key={dependent.id} value={`dependent:${dependent.id}`}>{dependent.username}</option>)}<option value="other-person-or-group">On behalf of another person or group</option></select></label>}
          {loggedInUser && <label className="checkbox-line"><input checked={anonymousContribution} onChange={(event) => setAnonymousContribution(event.target.checked)} type="checkbox" /> Recognize this contribution anonymously</label>}
          {loggedInUser && contributionFor === 'other-person-or-group' && <div className="callout green selected-recognition"><span>{activeProfile ? <>Recognition will go to <strong>{activeProfile.name}</strong><small>{activeProfile.type} · {activeProfile.country}</small><small>Currently credited to this profile: Humanity {formatMoney(selectedRecognitionHumanityFundTotal)} · Stewardship {formatMoney(selectedRecognitionStewardshipFundTotal)}</small></> : <>Choose a person or group to recognize before making this contribution.</>}</span><button className="secondary" type="button" onClick={() => setShowContributionProfileModal(true)}>{activeProfile ? 'Change person or group' : 'Choose person or group'}</button></div>}
          {loggedInUser && contributionFor === 'all-dependents' && <p className="muted small-note">{contributionValue > 0 ? `Your ${formatMoney(contributionValue)} total will be divided across ${contributionTargets.length} dependents: ${contributionTargets.map((dependent, index) => `${dependent.username} ${formatMoney(dependentContributionAmounts[index] ?? 0)}`).join(' · ')}.` : `Enter a total amount to preview the equal split across ${contributionTargets.length} dependents.`}</p>}
          <div className="form-grid compact contribution-entry-grid">
              <label>{amountLabel}<input disabled={!loggedInUser} min="0" placeholder={amountPlaceholder} type="number" value={loggedInUser ? amount : ''} onChange={(event) => setAmount(event.target.value)} /></label>
              <label>Asset type<select disabled={!loggedInUser} value={formAssetType} onChange={(event) => setAssetType(event.target.value as ContributionAssetType)}>{contributionAssetTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
            </div>
            {formAssetType === 'Stock' && <div className="market-note"><label>Stock ticker<input disabled={!loggedInUser} value={stockTicker} onChange={(event) => setStockTicker(event.target.value.toUpperCase())} /></label><p>{normalizedTicker || 'Ticker'} prototype market price: <b>{formatMoney(stockPrice)}</b> per share. Equivalent value: <b>{formatMoney(contributionValue)}</b>.</p></div>}
            {formAssetType === 'Crypto asset' && <div className="market-note"><label>Cryptocurrency<select disabled={!loggedInUser} value={cryptoSymbol} onChange={(event) => setCryptoSymbol(event.target.value)}>{Object.entries(cryptoPriceExamples).map(([symbol, item]) => <option key={symbol} value={symbol}>{item.label}</option>)}</select></label><p>{cryptoSymbol ? `${cryptoLabel} prototype market price: ${formatMoney(cryptoPrice)} each. Equivalent value: ${formatMoney(contributionValue)}.` : 'Select cryptocurrency to estimate the dollar equivalent.'}</p></div>}
            <div className="fund-guide-group">
              <div className="label-with-info">
                <label>Where do you want to contribute?<select disabled={!loggedInUser} value={mode} onChange={(event) => setMode(event.target.value as AllocationMode)}>{allocationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
                <button className={`info-toggle${fundGuideOpen ? ' active' : ''}`} type="button" aria-expanded={fundGuideOpen} aria-controls="fund-guide-panel" aria-label="More information about contribution funds" onClick={() => setFundGuideOpen((open) => !open)}>i</button>
              </div>
              {fundGuideOpen && <div className="info-panel" id="fund-guide-panel"><strong>Fund guide</strong><p><b>Humanity Fund</b> grows long-term shared ownership and future participant benefits.</p><p><b>Stewardship Fund</b> supports legal, accounting, audit, governance, platform, verification, reporting, agents/tools, insurance, efficient operations, and prudent reserves.</p></div>}
            </div>
            {anonymousContribution && <p className="muted small-note">The contribution will show a stable anonymous contributor alias. The person or group receiving recognition remains visible.</p>}
            <label>How will you make your contribution?<select disabled={!loggedInUser} value={formPaymentMethod} onChange={(event) => { setPaymentMethod(event.target.value); setContributionError('') }} aria-invalid={Boolean(contributionError)}><option value="">Select payment method</option>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
            <button className="primary" disabled={!loggedInUser} type="button" onClick={() => { if (!formPaymentMethod) setContributionError('Please choose a payment method before continuing.'); else { setContributionError(''); setShowPaymentDetails(true) } }}>Make contribution</button>
            {contributionError && <div className="callout compact-callout">{contributionError}</div>}
            {message && <div className="callout green">{message}</div>}
            {loggedInUser && <Metric label="All contributions you recorded" value={formatMoney(recordedContributionTotal)} note="your own contributions plus amounts you recorded on behalf of others" />}
          </div>
        </div>
        {loggedInUser && <div className="soft-card tree-card">
          <h3>Contribution growth</h3>
          <div className="growth-preview-header">
            <span>Previewing {visibleCircle.name}</span>
            <strong style={{ color: visibleCircle.color }}>{visibleCircle.label}</strong>
          </div>
          <div className={`tree-visual growth-art-${visibleCircle.name.toLowerCase()}${contributionAnimationLevel ? ' transforming' : ''}`} style={{ '--circle-color': visibleCircle.color, '--level-progress': `${levelProgress}%` } as React.CSSProperties} aria-label={`Contribution growth artwork previewing ${visibleCircle.name}`}>
            <div className="growth-preview-scrim" />
            {contributionAnimationLevel && <div className="growth-fireworks" key={`${animationNonce}-${contributionAnimationLevel}`} aria-hidden="true">{Array.from({ length: fireworkCount }, (_, index) => <span key={index} />)}</div>}
            <div className="growth-preview-badge">
              <span style={{ background: visibleCircle.color }} />
              <strong>{visibleCircle.name}</strong>
            </div>
          </div>
          <div className="growth-path" aria-label="Contribution circle path">
            {contributionCircleLevels.map((step) => {
              const isCurrent = step.name === currentLevel.name
              const isPreview = step.name === visibleCircle.name
              const isNext = step.name === nextLevel.name && step.name !== currentLevel.name
              return <button className={`${isCurrent ? 'active' : ''}${isNext ? ' next' : ''}${isPreview && !isCurrent ? ' preview' : ''}`} key={step.name} onClick={() => setSelectedCircle(step.name)} style={{ '--chip-color': step.color } as React.CSSProperties} type="button"><span aria-hidden="true" />{step.name}</button>
            })}
          </div>
          <div className="circle-details">
            <strong>{visibleCircle.name}</strong>
            <span>{visibleCircle.label}</span>
            {visibleCircle.name !== currentLevel.name && <small>Preview circle level</small>}
          </div>
          <Metric label="Your current circle" value={currentLevel.name} note={nextTierGap > 0 ? `${formatMoney(nextTierGap)} remaining until ${nextLevel.name}` : 'Rainforest circle reached'} />
        </div>}
      </div>
      {loggedInUser && <>
        <div className="card-grid three contribution-totals-grid"><Metric label="Your Humanity Fund total" value={formatMoney(totalHumanity)} note="your contributions for yourself only" /><Metric label="Your Stewardship Fund total" value={formatMoney(totalStewardship)} note="your contributions for yourself only" /><Metric label="Your own contribution total" value={formatMoney(personalTotalContributions)} note="your contributions before recognition received from other people" /></div>
        <div className="card-grid three contribution-totals-grid"><Metric label="Recognition received for you" value={formatMoney(receivedContributionTotal)} note="contributed by other people on your behalf" /><Metric label="Total credited to your profile" value={formatMoney(creditedToProfileTotal)} note="the basis for your contribution circle" /><Metric label="Your recycled claims" value={formatMoney(recycledClaims)} /></div>
        {onBehalfContributionGroups.length > 0 && <div className="soft-card contribution-on-behalf-summary"><h3>Contributions or recycled benefits you recorded on behalf of others</h3><p className="muted">These entries remain in your ledger, but their fund credit and recognition go to the selected person or group.</p><Metric label="Total recorded on behalf of others" value={formatMoney(onBehalfRecognitionTotal)} /><p className="muted small-note">Recycled rows grant recognition without adding new fund capital.</p><div className="on-behalf-contribution-list">{onBehalfContributionGroups.map((group) => <div className="on-behalf-contribution-row" key={group.key}><strong>{group.label}</strong><span>{formatMoney(group.amount)}</span><small>Humanity {formatMoney(group.humanityFund)} · Stewardship {formatMoney(group.stewardshipReserve)}</small></div>)}</div></div>}
        {ledgerContributions.length > 0 && <div className="soft-card contribution-ledger"><h3>{ledgerTitle}</h3><p className="muted">{ledgerNote}</p><div className="ledger-scroll">{[...ledgerContributions].reverse().map((entry) => <div className="ledger-row" key={entry.id}><strong>{formatMoney(entry.amount)}</strong><span>{getContributionLedgerDescription(entry, loggedInUser)} · {new Date(entry.createdAt ?? Date.now()).toLocaleDateString()}</span><small>Humanity {formatMoney(entry.humanityFund)} · Stewardship {formatMoney(entry.stewardshipReserve)}</small></div>)}</div></div>}
      </>}
      {loggedInUser && <div className="callout">You can proceed to Claim or go back to Connect to adjust your profile.</div>}
      <div className="nav-actions"><button className="secondary continue-cta" type="button" onClick={onBack}>← Back to Connect</button>{loggedInUser && <NextStep onClick={onNext}>Proceed to Claim</NextStep>}</div>
      {showContributionProfileModal && <ContributionProfileModal activeProfile={activeProfile} countryOptions={countryOptions} form={form} loggedInUser={loggedInUser} onChange={onChangeProfileForm} onClearRecognitionProfile={onClearRecognitionProfile} onClose={() => setShowContributionProfileModal(false)} onSave={onSaveProfile} onSelectRecognitionProfile={onSelectRecognitionProfile} onUpdateContributionProfile={onUpdateContributionProfile} profileMessage={profileMessage} profiles={profiles} />}
      {showPaymentDetails && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Contribution details">
        <div className="modal-card payment-modal">
          <button className="modal-close" type="button" onClick={() => setShowPaymentDetails(false)}>×</button>
          <h3>Contribution details</h3>
          <p>{paymentIntro}</p>
          <div className="payment-summary"><strong>{formatContributionAmount()}</strong><span>{selectedFundLabel}</span><span>{paymentMethod}</span></div>
          <p className="muted payment-details-lock-note">Payment-entry fields are intentionally disabled in this simulated prototype. Do not enter personal, payment, wallet, bank, brokerage, or account information.</p>
          <fieldset className="payment-details-fields" disabled={paymentDetailsAreDisabled}>
            {paymentMethod === 'Crypto wallet' ? <div className="form-grid"><label>Cryptocurrency<select value={cryptoSymbol} onChange={(event) => setCryptoSymbol(event.target.value)}>{Object.entries(cryptoPriceExamples).map(([symbol, item]) => <option key={symbol} value={symbol}>{item.label}</option>)}</select></label><label>Wallet address<input placeholder="Paste wallet address" /></label></div> : paymentMethod === 'Stock transfer' ? <div className="form-grid"><label>Stock ticker<input value={stockTicker} onChange={(event) => setStockTicker(event.target.value.toUpperCase())} /></label><label>Number of shares<input min="0" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Broker or transfer agent<input placeholder="Brokerage name" /></label><label>Account reference<input placeholder="Reference number" /></label></div> : paymentMethod === 'Bill payment' ? <div className="form-grid"><label>Bank name<input placeholder="Your bank" /></label><label>Bill payment reference<input placeholder="Reference number" /></label><label>Account holder<input placeholder="Name" /></label><label>Payment date<input type="date" /></label></div> : paymentMethod === 'PayPal' ? <div className="form-grid"><label>PayPal email<input placeholder="name@example.com" type="email" /></label><label>PayPal reference<input placeholder="Reference note" /></label></div> : <div className="form-grid"><label>Cardholder name<input placeholder="Name on card" /></label><label>Card number<input placeholder="4242 4242 4242 4242" inputMode="numeric" /></label><label>Expiry<input placeholder="MM / YY" /></label><label>Security code<input placeholder="CVC" inputMode="numeric" /></label></div>}
          </fieldset>
          <button className="primary full-width" type="button" onClick={() => void confirmContribution()}>Save simulated contribution</button>
          <p className="muted">Prototype only — no real payment, wallet, bank, card, crypto, or stock transfer is processed. Prototype prices are examples for contribution-equivalent estimates.</p>
        </div>
      </div>}
    </div>
  )
}

function ContributionProfileModal({ activeProfile, countryOptions, form, loggedInUser, onChange, onClearRecognitionProfile, onClose, onSave, onSelectRecognitionProfile, onUpdateContributionProfile, profileMessage, profiles }: { activeProfile: Profile | null; countryOptions: string[]; form: ContributionProfileForm; loggedInUser: User | null; onChange: (value: ContributionProfileForm) => void; onClearRecognitionProfile: () => void; onClose: () => void; onSave: () => Promise<Profile | null>; onSelectRecognitionProfile: (profile: Profile) => void; onUpdateContributionProfile: (profileId: string, input: { name: string; type: string; country: string; description: string }) => Promise<Profile | null>; profileMessage: string; profiles: Profile[] }) {
  const [profileMode, setProfileMode] = useState<'search' | 'create' | 'modify'>('search')
  const [profileTypeFilter, setProfileTypeFilter] = useState('')
  const [profileCountryFilter, setProfileCountryFilter] = useState('')
  const [profileSearch, setProfileSearch] = useState('')
  const [draftRecognitionProfile, setDraftRecognitionProfile] = useState<Profile | null>(activeProfile)
  const [recognitionMessage, setRecognitionMessage] = useState('')
  const [recognitionAction, setRecognitionAction] = useState<'confirmed' | 'cleared' | ''>('')
  const [profileBeingModified, setProfileBeingModified] = useState<Profile | null>(null)
  const [profileCreateErrors, setProfileCreateErrors] = useState<{ type?: string; name?: string; country?: string }>({})
  const [selectionVersion, setSelectionVersion] = useState(0)
  const selectedProfileConfirmationRef = useRef<HTMLDivElement>(null)
  const update = (field: keyof ContributionProfileForm, value: string) => onChange({ ...form, [field]: value })
  useEffect(() => {
    if (!form.name) return
    const selected = profiles.find((profile) => profile.name === form.name && (!form.country || profile.country === form.country))
    if (!selected) return
    setDraftRecognitionProfile(selected)
    setProfileTypeFilter(selected.type)
    setProfileCountryFilter(selected.country)
    setProfileSearch(selected.name)
  }, [form.country, form.name, profiles])
  useEffect(() => {
    if (!draftRecognitionProfile || selectionVersion === 0) return undefined
    const frame = window.requestAnimationFrame(() => {
      const confirmation = selectedProfileConfirmationRef.current
      if (!confirmation) return
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
      confirmation.scrollIntoView({ behavior, block: 'center' })
      confirmation.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [draftRecognitionProfile, selectionVersion])
  const hasProfileFilters = Boolean(profileTypeFilter || profileCountryFilter || profileSearch)
  const matchesProfileSearch = (profile: Profile) => {
    const matchesType = !profileTypeFilter || profile.type === profileTypeFilter
    const matchesCountry = !profileCountryFilter || profile.country === profileCountryFilter
    const haystack = `${profile.name} ${profile.country} ${profile.description}`.toLowerCase()
    return matchesType && matchesCountry && haystack.includes(profileSearch.toLowerCase())
  }
  const profileSearchRank = (profile: Profile) => {
    const needle = profileSearch.toLowerCase()
    const name = profile.name.toLowerCase()
    if (!needle) return 2
    if (name.startsWith(needle)) return 0
    if (name.includes(needle)) return 1
    return 2
  }
  const profileMatches = hasProfileFilters ? profiles.filter(matchesProfileSearch).sort((a, b) => profileSearchRank(a) - profileSearchRank(b) || a.name.localeCompare(b.name)) : []
  const ownedContributionProfiles = loggedInUser ? profiles.filter((profile) => profile.createdByUserId === loggedInUser.id).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')) : []
  const canManageDraftRecognitionProfile = Boolean(draftRecognitionProfile?.createdByUserId && loggedInUser?.id && draftRecognitionProfile.createdByUserId === loggedInUser.id)
  const resetContributionProfileForm = () => {
    onChange({ ...form, name: '', type: '', country: '', ageGroup: '', description: '' })
    setProfileCreateErrors({})
    setProfileBeingModified(null)
  }
  const handleProfileModeChange = (mode: 'search' | 'create' | 'modify') => {
    setProfileMode(mode)
    setRecognitionMessage('')
    setRecognitionAction('')
    if (mode === 'create') resetContributionProfileForm()
    if (mode !== 'modify') setProfileBeingModified(null)
  }
  const stageRecognitionProfile = (profile: Profile) => {
    setSelectionVersion((current) => current + 1)
    setDraftRecognitionProfile(profile)
    setRecognitionAction('')
    setRecognitionMessage(`Selected ${profile.name}. Confirm to use this person or group for the contribution.`)
  }
  const confirmRecognitionProfile = () => {
    if (!draftRecognitionProfile) return
    onSelectRecognitionProfile(draftRecognitionProfile)
    setRecognitionAction('confirmed')
    setRecognitionMessage(`${draftRecognitionProfile.name} will receive recognition for this contribution.`)
    onClose()
  }
  const clearRecognitionSelection = () => {
    onClearRecognitionProfile()
    setDraftRecognitionProfile(null)
    setProfileBeingModified(null)
    setRecognitionAction('cleared')
    setRecognitionMessage('The contribution profile selection was cleared.')
  }
  const saveCreatedProfile = async () => {
    const errors: { type?: string; name?: string; country?: string } = {}
    if (!form.type) errors.type = 'Choose a contribution profile type.'
    if (!form.name.trim()) errors.name = 'Enter a person or group name.'
    if (!form.country) errors.country = 'Choose a country.'
    setProfileCreateErrors(errors)
    if (Object.keys(errors).length > 0) return
    const saved = await onSave()
    if (saved) {
      stageRecognitionProfile(saved)
      setProfileMode('search')
    }
  }
  const selectProfileToModify = (profile: Profile) => {
    setProfileBeingModified(profile)
    onChange({ ...form, name: profile.name, type: profile.type, country: profile.country, ageGroup: profile.ageGroup, description: profile.description })
    setProfileCreateErrors({})
    setRecognitionAction('')
    setRecognitionMessage(`Editing ${profile.name}. Save the changes when ready.`)
  }
  const saveModifiedProfile = async () => {
    if (!profileBeingModified) return
    const errors: { type?: string; name?: string; country?: string } = {}
    if (!form.type) errors.type = 'Choose a contribution profile type.'
    if (!form.name.trim()) errors.name = 'Enter a person or group name.'
    if (!form.country) errors.country = 'Choose a country.'
    setProfileCreateErrors(errors)
    if (Object.keys(errors).length > 0) return
    const saved = await onUpdateContributionProfile(profileBeingModified.id, { name: form.name, type: form.type, country: form.country, description: form.description })
    if (saved) {
      stageRecognitionProfile(saved)
      setProfileBeingModified(null)
      setProfileMode('search')
    }
  }

  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Choose a person or group for recognition">
    <div className="modal-card contribution-profile-modal">
      <button className="modal-close" type="button" onClick={onClose}>×</button>
      <h3>Contribute on behalf of or in honour of a person or group</h3>
      <p className="muted">Search existing contribution profiles first. If the person, faith group, organization, memorial, honour profile, family, or community group is not there, create a short public contribution profile so others can identify it correctly.</p>
      <div className="mode-row contribution-profile-mode">
        <button className={`secondary contribution-mode-button${profileMode === 'search' ? ' selected' : ''}`} type="button" onClick={() => handleProfileModeChange('search')}>Search contribution profiles</button>
        <button className={`secondary contribution-mode-button${profileMode === 'create' ? ' selected' : ''}`} type="button" onClick={() => handleProfileModeChange('create')}>Create contribution profile</button>
        <button className={`secondary contribution-mode-button${profileMode === 'modify' ? ' selected' : ''}`} type="button" onClick={() => handleProfileModeChange('modify')}>Modify contribution profile</button>
      </div>

      {profileMode === 'search' && <div className="form-stack">
        <div className="form-grid profile-filter-grid">
          <label>Filter by contribution profile type<select value={profileTypeFilter} onChange={(event) => { setProfileTypeFilter(event.target.value); setDraftRecognitionProfile(null); setRecognitionMessage('') }}><option value="">All contribution profiles</option>{contributionProfileTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label>Filter by country<select value={profileCountryFilter} onChange={(event) => { setProfileCountryFilter(event.target.value); setDraftRecognitionProfile(null); setRecognitionMessage('') }}><option value="">Any country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></label>
          <label className="profile-search-field">Search by name or description<input value={profileSearch} onChange={(event) => { setProfileSearch(event.target.value); setDraftRecognitionProfile(null); setRecognitionMessage('') }} type="search" /></label>
        </div>
        {!hasProfileFilters && <p className="muted empty-results-note">Choose a contribution profile type, country, or start searching to find a contribution profile.</p>}
        {hasProfileFilters && <div className="profile-results">{profileMatches.length > 0 ? profileMatches.map((profile) => <button key={profile.id} type="button" onClick={() => stageRecognitionProfile(profile)}><strong>{profile.name}</strong><span>{profile.type} · {profile.country}</span><small>{profile.description}</small></button>) : <p className="muted">No contribution profiles match those filters yet.</p>}</div>}
        {draftRecognitionProfile && <div aria-label="Selected contribution profile confirmation" className={`callout green selected-recognition ${recognitionAction}`} ref={selectedProfileConfirmationRef} tabIndex={-1}><span>Selected contribution profile: <strong>{draftRecognitionProfile.name}</strong><small>{draftRecognitionProfile.type} · {draftRecognitionProfile.country}</small>{!canManageDraftRecognitionProfile && <small>Locked for editing unless you created this profile.</small>}</span><div className="selected-recognition-actions"><button className={`secondary ${recognitionAction === 'confirmed' ? 'action-clicked' : ''}`} type="button" onClick={confirmRecognitionProfile}>Confirm this contribution profile</button><button className={`secondary ${recognitionAction === 'cleared' ? 'action-clicked' : ''}`} type="button" onClick={clearRecognitionSelection}>Clear this contribution profile</button></div></div>}
        {recognitionMessage && <div className={`callout green compact-callout ${recognitionAction}`}>{recognitionMessage}</div>}
      </div>}

      {profileMode === 'create' && <div className="form-stack">
        <div className="form-grid create-profile-grid">
          <label>Contribution profile type<select id="contribution-profile-type" value={form.type} onChange={(event) => { update('type', event.target.value); setProfileCreateErrors((current) => ({ ...current, type: undefined })) }} aria-invalid={Boolean(profileCreateErrors.type)}><option value="">Select contribution profile type</option>{contributionProfileTypes.map((type) => <option key={type}>{type}</option>)}</select>{profileCreateErrors.type && <small className="field-error">{profileCreateErrors.type}</small>}</label>
          <label>Country<select id="contribution-profile-country" value={form.country} onChange={(event) => { update('country', event.target.value); setProfileCreateErrors((current) => ({ ...current, country: undefined })) }} aria-invalid={Boolean(profileCreateErrors.country)}><option value="">Select country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select>{profileCreateErrors.country && <small className="field-error">{profileCreateErrors.country}</small>}</label>
          <label className="profile-name-field">Name a person or group<input id="contribution-profile-name" value={form.name} onChange={(event) => { update('name', event.target.value); setProfileCreateErrors((current) => ({ ...current, name: undefined })) }} placeholder="Name of person, group, or organization" type="text" aria-invalid={Boolean(profileCreateErrors.name)} />{profileCreateErrors.name && <small className="field-error">{profileCreateErrors.name}</small>}</label>
        </div>
        <label>Short public description<textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="A short description so supporters can identify this contribution profile without collecting sensitive personal details." /></label>
        <button className="secondary" type="button" onClick={() => { void saveCreatedProfile() }}>Save profile to prototype file</button>
        {profileMessage && <div className="callout green">{profileMessage}</div>}
      </div>}

      {profileMode === 'modify' && <div className="form-stack">
        {!loggedInUser && <p className="muted empty-results-note">Log in to modify contribution profiles you created.</p>}
        {loggedInUser && ownedContributionProfiles.length === 0 && <p className="muted empty-results-note">No contribution profiles created by this account yet.</p>}
        {loggedInUser && ownedContributionProfiles.length > 0 && <div className="profile-results">{ownedContributionProfiles.map((profile) => <button key={profile.id} type="button" onClick={() => selectProfileToModify(profile)}><strong>{profile.name}</strong><span>{profile.type} · {profile.country}</span><small>{profile.description || 'No public description yet.'}</small></button>)}</div>}
        {profileBeingModified && <>
          <div className="form-grid create-profile-grid">
            <label>Contribution profile type<select id="contribution-profile-type" value={form.type} onChange={(event) => { update('type', event.target.value); setProfileCreateErrors((current) => ({ ...current, type: undefined })) }} aria-invalid={Boolean(profileCreateErrors.type)}><option value="">Select contribution profile type</option>{contributionProfileTypes.map((type) => <option key={type}>{type}</option>)}</select>{profileCreateErrors.type && <small className="field-error">{profileCreateErrors.type}</small>}</label>
            <label>Country<select id="contribution-profile-country" value={form.country} onChange={(event) => { update('country', event.target.value); setProfileCreateErrors((current) => ({ ...current, country: undefined })) }} aria-invalid={Boolean(profileCreateErrors.country)}><option value="">Select country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select>{profileCreateErrors.country && <small className="field-error">{profileCreateErrors.country}</small>}</label>
            <label className="profile-name-field">Name a person or group<input id="contribution-profile-name" value={form.name} onChange={(event) => { update('name', event.target.value); setProfileCreateErrors((current) => ({ ...current, name: undefined })) }} placeholder="Name of person, group, or organization" type="text" aria-invalid={Boolean(profileCreateErrors.name)} />{profileCreateErrors.name && <small className="field-error">{profileCreateErrors.name}</small>}</label>
          </div>
          <label>Short public description<textarea value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="A short description so supporters can identify this contribution profile without collecting sensitive personal details." /></label>
          <button className="secondary" type="button" onClick={() => { void saveModifiedProfile() }}>Save modified contribution profile</button>
        </>}
        {recognitionMessage && <div className="callout green compact-callout">{recognitionMessage}</div>}
        {profileMessage && <div className="callout green">{profileMessage}</div>}
      </div>}
    </div>
  </div>
}

function ClaimScreen({ method, setMethod, claimPreview, claims, contributions, users, funds, loggedInUser, onBack, onNext, onSaveClaims, onVerifyHuman, profiles }: { method: VerificationMethod; setMethod: (method: VerificationMethod) => void; claimPreview: ReturnType<typeof calculatePayoutScenario>; claims: ClaimRecord[]; contributions: Contribution[]; users: User[]; funds: Funds; loggedInUser: User | null; onBack: () => void; onNext: () => void; onSaveClaims: (input: { action: 'claimed' | 'recycled'; amount: number; targetUserIds: string[]; deliveryMethod?: string; denomination?: string; allocationMode?: AllocationMode; isAnonymous?: boolean; recycleDestinations?: Array<{ profileId: string }> }) => Promise<{ ok: boolean; error?: string; claims?: ClaimRecord[]; contributions?: Contribution[] }>; onVerifyHuman: (input: { verificationMethod: VerificationMethod }) => Promise<{ ok: boolean; error?: string; user?: User }>; profiles: Profile[] }) {
  const linkedDependents = loggedInUser ? users.filter((user) => user.id !== loggedInUser.id && hasGuardianConnection(user, loggedInUser.id, 'accepted')) : []
  const parentGuardianConnections = getGuardianConnections(loggedInUser)
  const acceptedParentGuardianConnections = parentGuardianConnections.filter((connection) => connection.guardianStatus === 'accepted')
  const hasParentGuardian = parentGuardianConnections.some((connection) => connection.guardianStatus === 'pending' || connection.guardianStatus === 'accepted')
  const [claimFor, setClaimFor] = useState('self')
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [showVerificationMethodChooser, setShowVerificationMethodChooser] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showRecycleModal, setShowRecycleModal] = useState(false)
  const [showRecycleRecipientModal, setShowRecycleRecipientModal] = useState(false)
  const [claimMessage, setClaimMessage] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [verifiedForPrototype, setVerifiedForPrototype] = useState(Boolean(loggedInUser?.verifiedHumanAt))
  const [claimDeliveryStep, setClaimDeliveryStep] = useState<'choose' | 'details'>('choose')
  const [claimMethod, setClaimMethod] = useState('E-transfer')
  const [claimDenomination, setClaimDenomination] = useState('My country’s currency')
  const [claimCrypto, setClaimCrypto] = useState('Bitcoin')
  const [recycleAllocationMode, setRecycleAllocationMode] = useState<AllocationMode>('humanity')
  const [recycleAnonymously, setRecycleAnonymously] = useState(false)
  const [recycleFor, setRecycleFor] = useState('self')
  const [recycleRecipientProfile, setRecycleRecipientProfile] = useState<Profile | null>(null)
  const verificationDetailsAreDisabled = true
  const claimDeliveryDetailsAreDisabled = true
  const savedMethod = loggedInUser?.verificationMethod ?? ''
  const effectiveMethod = method || savedMethod
  const methodLabel = effectiveMethod === 'world-id' ? 'World ID proof of human' : effectiveMethod === 'other' ? 'Other proof-of-human path' : effectiveMethod === 'government-id-liveness' ? 'Government ID' : savedMethod === 'world-id' ? 'World ID proof of human' : savedMethod === 'other' ? 'Other proof-of-human path' : 'Government ID'
  const claimPathway = hasParentGuardian ? 'parent-guardian-must-claim' : 'claim-for-self'
  const canSelfClaim = verifiedForPrototype && claimPathway === 'claim-for-self'
  const shouldUseGuardian = verifiedForPrototype && claimPathway === 'parent-guardian-must-claim'
  const guardianClaimPending = shouldUseGuardian && acceptedParentGuardianConnections.length === 0
  const selectedDependent = claimFor.startsWith('dependent:') ? linkedDependents.find((user) => user.id === claimFor.replace('dependent:', '')) : null
  const selectedDependentCount = claimFor === 'all-dependents' ? linkedDependents.length : selectedDependent ? 1 : 0
  const claimAmount = Math.max(0, claimPreview.quarterlyPerClaimant)
  const displayedClaimAmount = claimFor === 'self' ? claimAmount : claimAmount * selectedDependentCount
  const visibleClaimAmount = shouldUseGuardian ? claimAmount : displayedClaimAmount
  const claimTargets = claimFor === 'self' && loggedInUser ? [loggedInUser] : claimFor === 'all-dependents' ? linkedDependents : selectedDependent ? [selectedDependent] : []
  const ownBenefitRecords = loggedInUser ? claims.filter((claim) => claim.userId === loggedInUser.id || claim.profileId === loggedInUser.profileId).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')) : []
  const dependentBenefitGroups = linkedDependents.map((dependent) => ({ dependent, records: claims.filter((claim) => claim.userId === dependent.id || claim.profileId === dependent.profileId).sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')) })).filter((group) => group.records.length > 0)
  const totalOwnBenefits = ownBenefitRecords.reduce((total, claim) => total + claim.amount, 0)
  const recordedBenefitAccounting = loggedInUser ? calculateClaimAccounting(claims, loggedInUser.id, loggedInUser.profileId ?? '', linkedDependents, contributions) : null
  const recordedBenefitNote = (group: { claimedAmount: number; recycledAmount: number }) => `${formatMoney(group.claimedAmount)} claimed · ${formatMoney(group.recycledAmount)} recycled`
  const denominationLabel = claimDenomination === 'Cryptocurrency' ? claimCrypto : claimDenomination
  const claimMethodFields = claimMethod === 'E-transfer'
    ? ['Email or phone for e-transfer', 'Security note / claim reference']
    : claimMethod === 'Bank account'
      ? ['Bank / institution name', 'Account or direct deposit reference']
      : claimMethod === 'Credit card'
        ? ['Cardholder name', 'Card or payment network reference']
        : claimMethod === 'Crypto wallet'
          ? ['Wallet address', 'Network / chain']
          : ['Receiving details', 'Claim reference']
  const selectedRecycleDependent = recycleFor.startsWith('dependent:') ? linkedDependents.find((user) => user.id === recycleFor.replace('dependent:', '')) : null
  const recycleRecipientUsers = recycleFor === 'self' && loggedInUser ? [loggedInUser] : recycleFor === 'all-dependents' ? linkedDependents : selectedRecycleDependent ? [selectedRecycleDependent] : []
  const recycleDestinations = recycleFor === 'other-person-or-group'
    ? recycleRecipientProfile ? [{ profileId: recycleRecipientProfile.id }] : []
    : recycleRecipientUsers.flatMap((user) => user.profileId ? [{ profileId: user.profileId }] : [])
  const recycleRecipientLabel = recycleFor === 'other-person-or-group'
    ? recycleRecipientProfile?.name ?? 'Choose a person or group'
    : recycleFor === 'all-dependents'
      ? 'All my dependents'
      : selectedRecycleDependent?.username ?? loggedInUser?.username ?? 'Myself'

  useEffect(() => {
    setVerifiedForPrototype(Boolean(loggedInUser?.verifiedHumanAt))
    setShowVerificationMethodChooser(false)
    setMethod('')
  }, [loggedInUser?.id, loggedInUser?.verifiedHumanAt, setMethod])

  useEffect(() => {
    if (shouldUseGuardian) setClaimFor('')
    else if (claimFor === 'all-dependents' && linkedDependents.length === 0) setClaimFor(canSelfClaim ? 'self' : '')
    else if (claimFor.startsWith('dependent:') && !selectedDependent) setClaimFor(linkedDependents.length > 0 ? 'all-dependents' : canSelfClaim ? 'self' : '')
  }, [canSelfClaim, claimFor, linkedDependents.length, selectedDependent, shouldUseGuardian])

  const saveVerificationDraft = async () => {
    if (!effectiveMethod) {
      setVerificationError('Please choose a verification method before proceeding.')
      setShowVerificationModal(false)
      return
    }
    const verificationMethod = effectiveMethod
    const result = await onVerifyHuman({ verificationMethod })
    if (!result.ok) return
    setVerifiedForPrototype(true)
    setMethod('')
    setShowVerificationMethodChooser(false)
    if (claimPathway === 'claim-for-self') setClaimFor('self')
    else setClaimFor('')
    setShowVerificationModal(false)
    setVerificationError('')
  }
  const savePrototypeClaim = async () => {
    const result = await onSaveClaims({ action: 'claimed', amount: claimAmount, targetUserIds: claimTargets.map((target) => target.id), deliveryMethod: claimMethod, denomination: denominationLabel })
    if (!result.ok) {
      setClaimMessage(result.error ?? 'Could not save claim.')
      return
    }
    setClaimMessage(`Saved ${result.claims?.length ?? 0} simulated benefit record${result.claims?.length === 1 ? '' : 's'} to the appropriate profile ledger.`)
    setShowClaimModal(false)
    setClaimDeliveryStep('choose')
  }
  const openRecycleBenefit = () => {
    setRecycleFor(claimFor === 'all-dependents' || claimFor.startsWith('dependent:') ? claimFor : 'self')
    setRecycleRecipientProfile(null)
    setShowRecycleModal(true)
  }
  const selectRecycleRecipient = (recipient: string) => {
    setRecycleFor(recipient)
    if (recipient === 'other-person-or-group') setShowRecycleRecipientModal(true)
  }
  const recyclePrototypeClaim = async () => {
    if (recycleDestinations.length === 0) {
      setClaimMessage('Choose who should receive credit for this recycled benefit before saving it.')
      return
    }
    const fundLabel = allocationOptions.find((option) => option.id === recycleAllocationMode)?.label ?? 'Humanity Fund'
    const result = await onSaveClaims({ action: 'recycled', amount: claimAmount, targetUserIds: claimTargets.map((target) => target.id), deliveryMethod: `Recycled into ${fundLabel}`, denomination: `${fundLabel} credit`, allocationMode: recycleAllocationMode, isAnonymous: recycleAnonymously, recycleDestinations })
    if (!result.ok) {
      setClaimMessage(result.error ?? 'Could not recycle benefit.')
      return
    }
    const alias = result.contributions?.find((entry) => entry.isAnonymous)?.anonymousAlias
    setClaimMessage(`Recycled ${result.claims?.length ?? 0} benefit record${result.claims?.length === 1 ? '' : 's'} for ${recycleRecipientLabel}. The corresponding contribution and profile ledgers are updated${alias ? ` anonymously under ${alias}` : ''}.`)
    setRecycleAnonymously(false)
    setShowRecycleModal(false)
  }

  return (
    <div className="screen-content">
      <SectionTitle eyebrow="Claim" title="Claim or recycle your benefit to participate in Equity for Humanity.">
        This is a fictional, local prototype. It records simulated benefit choices and never verifies identity, receives a claim, or moves money.
      </SectionTitle>

      <div className="card-grid two">
        <div className={`soft-card claim-flow-card ${verifiedForPrototype ? 'verified-step' : ''}`}>
          <p className="eyebrow">Step 1</p>
          <h3>{verifiedForPrototype ? 'You have verified your human status' : 'Verify that you are human'}</h3>
          <p className="muted">{verifiedForPrototype ? `Your saved prototype verification method is ${methodLabel}. Review it only when you want to inspect or change the simulated method.` : 'Choose a simulated proof-of-human method before recording a prototype benefit choice. No proof is sent, stored, or verified.'}</p>
          <div className="form-stack">
            {verifiedForPrototype && !showVerificationMethodChooser ? <>
              <div className="callout green compact-callout"><strong>{claimPathway === 'claim-for-self' ? 'Claim for yourself' : 'Parent / guardian must claim'}</strong><small>{claimPathway === 'claim-for-self' ? 'No active parent / guardian connection is identified for this profile.' : guardianClaimPending ? 'A parent / guardian is identified but still needs to accept the connection in Connect.' : 'An active parent / guardian connection is identified for this profile.'}</small></div>
              <button className="secondary" type="button" onClick={() => { setMethod(savedMethod); setShowVerificationMethodChooser(true); setVerificationError('') }}>Review or update saved verification</button>
            </> : <>
              <label>Choose how you want to verify being human<select value={effectiveMethod} onChange={(event) => { setMethod(event.target.value as VerificationMethod); setVerificationError('') }} aria-invalid={Boolean(verificationError)}><option value="">Choose method</option><option value="government-id-liveness">Government ID</option><option value="world-id">World ID</option><option value="other">Other proof-of-human path</option></select></label>
              <div className="nav-actions"><button className="primary" type="button" onClick={() => { if (!effectiveMethod) setVerificationError('Please choose a verification method before proceeding.'); else setShowVerificationModal(true) }}>Confirm verification method</button>{verifiedForPrototype && <button className="secondary" type="button" onClick={() => { setShowVerificationMethodChooser(false); setMethod(''); setVerificationError('') }}>Cancel review</button>}</div>
            </>}
            {verificationError && <div className="callout compact-callout">{verificationError}</div>}
          </div>
        </div>

        <div className={`soft-card claim-flow-card ${!verifiedForPrototype ? 'pending-step' : ''}`}>
          <p className="eyebrow">Step 2</p>
          <h3>Set up the claim</h3>
          {!verifiedForPrototype && <p className="muted">Complete Step 1 first. The benefit options unlock after a simulated verification method is saved to this account.</p>}
          <div className="form-stack">
            {shouldUseGuardian ? <>
              <div className="claim-amount-box"><span>Claim amount that can be claimed on your behalf</span><strong>{formatMoney(visibleClaimAmount)}</strong></div>
              <div className="callout green compact-callout">{guardianClaimPending ? 'A parent / guardian must accept the identified connection in Connect before they can record this benefit.' : 'This profile uses the parent / guardian claim pathway. Log into the accepted parent / guardian account to record the benefit on this profile’s behalf.'}</div>
            </> : <>
              <label>Who is this claim for?<select disabled={!verifiedForPrototype} value={claimFor} onChange={(event) => setClaimFor(event.target.value)}><option disabled={!canSelfClaim} value="self">My own claim</option><option disabled={linkedDependents.length === 0} value="all-dependents">All my dependents</option>{linkedDependents.map((dependent) => <option key={dependent.id} value={`dependent:${dependent.id}`}>{dependent.username}</option>)}</select></label>
              {linkedDependents.length === 0 && <p className="muted">No children or dependents are linked to this guardian account yet. A child or dependent links to you from their own Connect account by entering your username as their parent / guardian account.</p>}
              <div className="claim-amount-box"><span>Claim amount for this selection</span><strong>{formatMoney(visibleClaimAmount)}</strong><small>{claimFor === 'all-dependents' ? `${linkedDependents.length} linked dependent${linkedDependents.length === 1 ? '' : 's'} × ${formatMoney(claimAmount)}` : claimFor.startsWith('dependent:') ? selectedDependent?.username ?? 'Linked dependent' : 'My own claim'}</small></div>
              <div className="claim-action-buttons"><button className="primary" disabled={!verifiedForPrototype || visibleClaimAmount <= 0 || claimTargets.length === 0} type="button" onClick={() => setShowClaimModal(true)}>Make a claim</button><button className="secondary recycle-benefit-button" disabled={!verifiedForPrototype || visibleClaimAmount <= 0 || claimTargets.length === 0} type="button" onClick={openRecycleBenefit}>Recycle benefit</button></div>
            </>}
          </div>
        </div>
      </div>

      <div className="card-grid three claim-summary-grid">
        <Metric label="Illustrative Humanity Fund" value={formatCompactMoney(funds.currentEndowment)} note="current fund value" />
        <Metric label="Quarterly benefit estimate" value={formatMoney(visibleClaimAmount)} note={shouldUseGuardian ? 'recorded by parent / guardian' : claimFor === 'all-dependents' ? `${linkedDependents.length} linked dependent${linkedDependents.length === 1 ? '' : 's'} × ${formatMoney(claimAmount)}` : `based on ${funds.activeClaimants.toLocaleString()} fictional people with profiles`} />
        <Metric label="Your own prototype benefits" value={formatMoney(totalOwnBenefits)} note={`${ownBenefitRecords.length} benefit record${ownBenefitRecords.length === 1 ? '' : 's'} credited to your profile`} />
      </div>
      <p className="claim-formula"><strong>Quarterly estimate:</strong> {formatMoney(funds.currentEndowment)} current illustrative value × {(funds.averageGrowth * 100).toFixed(0)}% modeled annual growth × 30% benefit allocation = {formatMoney(claimPreview.annualPool)} annual pool ({(claimPreview.payoutRate * 100).toFixed(0)}% of the current value), then ÷ {funds.activeClaimants.toLocaleString()} people with profiles ÷ 4 quarters.</p>
      {loggedInUser && recordedBenefitAccounting && <>
        <p className="muted small-note">These are simulated benefits you recorded for yourself, dependents, and others — not all-prototype or fund-wide totals.</p>
        <div className="card-grid three claim-summary-grid"><Metric label="Benefits you recorded for yourself" value={formatMoney(recordedBenefitAccounting.yourself.totalAmount)} note={recordedBenefitNote(recordedBenefitAccounting.yourself)} /><Metric label="Benefits you recorded for dependents" value={formatMoney(recordedBenefitAccounting.dependents.totalAmount)} note={recordedBenefitNote(recordedBenefitAccounting.dependents)} /><Metric label="Benefits you recorded for others" value={formatMoney(recordedBenefitAccounting.others.totalAmount)} note={recordedBenefitNote(recordedBenefitAccounting.others)} /></div>
      </>}
      {claimMessage && <div className="callout green compact-callout">{claimMessage}</div>}
      {loggedInUser && ownBenefitRecords.length > 0 && <div className="soft-card contribution-ledger"><h3>Your simulated benefit ledger</h3><p className="muted">Only benefits credited to your own profile appear here. A parent / guardian can record one on your behalf while it remains credited to you.</p><div className="ledger-scroll">{ownBenefitRecords.map((entry) => <div className="ledger-row" key={entry.id}><strong>{formatMoney(entry.amount)}</strong><span>{getClaimLedgerDescription(entry, loggedInUser, users)} · {new Date(entry.createdAt ?? Date.now()).toLocaleDateString()}</span><small>{entry.deliveryMethod ?? 'Prototype record'}{entry.denomination ? ` · ${entry.denomination}` : ''}</small></div>)}</div></div>}
      {loggedInUser && dependentBenefitGroups.length > 0 && <div className="soft-card dependent-benefit-ledger"><h3>Simulated benefit records for your dependents</h3><p className="muted">These benefits stay in each dependent’s ledger and total; you are shown as the parent / guardian who recorded them.</p><div className="dependent-benefit-groups">{dependentBenefitGroups.map(({ dependent, records }) => <div className="dependent-benefit-group" key={dependent.id}><h4>{dependent.username}</h4>{records.map((entry) => <div className="ledger-row" key={entry.id}><strong>{formatMoney(entry.amount)}</strong><span>{getClaimLedgerDescription(entry, loggedInUser, users)} · {new Date(entry.createdAt ?? Date.now()).toLocaleDateString()}</span><small>{entry.deliveryMethod ?? 'Prototype record'}{entry.denomination ? ` · ${entry.denomination}` : ''}</small></div>)}</div>)}</div></div>}

      <div className="callout green">The claim pathway is automatic: it shows <strong>Claim for yourself</strong> when no active parent / guardian connection is identified, or <strong>Parent / guardian must claim</strong> when one is identified. This is a simulated access route, not an age or identity finding.</div>
      <div className="nav-actions"><button className="secondary continue-cta" type="button" onClick={onBack}>← Back to Contribute</button><NextStep onClick={onNext}>Proceed to Compound</NextStep></div>

      {showVerificationModal && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Human verification details">
        <div className="modal-card claim-modal">
          <button className="modal-close" type="button" onClick={() => setShowVerificationModal(false)}>×</button>
          <h3>{methodLabel} simulated verification</h3>
          <p>These illustrative fields remain visible for the future flow, but are locked in this prototype. Do not enter identity, contact, proof, or account details.</p>
          <fieldset className="claim-verification-details" disabled={verificationDetailsAreDisabled}>
            {effectiveMethod === 'government-id-liveness' ? <div className="form-grid">
              <label>Photo ID type<select defaultValue=""><option value="">Select ID type</option><option>Passport</option><option>Driver's licence</option><option>Government identity card</option><option>Child or dependent identity document</option></select></label>
              <label>Photo ID upload<input type="file" /></label>
              <label>Selfie / liveness check<input type="file" /></label>
            </div> : effectiveMethod === 'world-id' ? <div className="form-grid">
              <label>World ID account<input placeholder="World ID account or proof reference" /></label>
              <label>World ID verification code<input placeholder="One-time verification code" /></label>
            </div> : <div className="form-grid"><label>Other verification partner<input placeholder="Future proof-of-human provider" /></label><label>Verification reference<input placeholder="Reference or token" /></label></div>}
          </fieldset>
          <div className="payment-summary"><strong>Claim pathway</strong><span>{claimPathway === 'claim-for-self' ? 'Claim for yourself' : 'Parent / guardian must claim'}</span><span>{claimPathway === 'claim-for-self' ? 'No active parent / guardian connection identified.' : guardianClaimPending ? 'Connection acceptance is still pending.' : `Accepted parent / guardian: ${acceptedParentGuardianConnections.map((connection) => connection.guardianUsername || 'Selected account').join(', ')}`}</span></div>
          <button className="primary" type="button" onClick={() => { void saveVerificationDraft() }}>Save Prototype Verification Draft</button>
          <div className="verification-privacy-grid">
            <div className="soft-card danger-soft"><h3>Protected and not retained directly by Equity for Humanity</h3><ul>{protectedPrototypeVerificationData.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
        </div>
      </div>}

      {showClaimModal && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Claim receiving details">
        <div className="modal-card claim-modal">
          <button className="modal-close" type="button" onClick={() => { setShowClaimModal(false); setClaimDeliveryStep('choose') }}>×</button>
          <h3>Receive claim</h3>
          <p>Choose how you want to receive this prototype claim. No real money moves here.</p>
          <div className="payment-summary"><strong>{formatMoney(displayedClaimAmount)}</strong><span>{claimFor === 'self' ? 'My own claim' : claimFor === 'all-dependents' ? 'All my dependents' : selectedDependent?.username ?? 'Linked dependent'}</span><span>{denominationLabel}</span></div>
          {claimDeliveryStep === 'choose' ? <>
            <div className="form-grid">
              <label>How do you want to receive this claim?<select value={claimMethod} onChange={(event) => setClaimMethod(event.target.value)}><option>E-transfer</option><option>Bank account</option><option>Credit card</option><option>Crypto wallet</option></select></label>
              <label>What denomination do you want?<select value={claimDenomination} onChange={(event) => setClaimDenomination(event.target.value)}><option>My country’s currency</option><option>US dollars</option><option>Canadian dollars</option><option>Euros</option><option>Cryptocurrency</option><option>Other denomination</option></select></label>
              {claimDenomination === 'Cryptocurrency' && <label>Cryptocurrency<select value={claimCrypto} onChange={(event) => setClaimCrypto(event.target.value)}><option>Bitcoin</option><option>Ethereum</option><option>Solana</option><option>Stablecoin / USDC</option></select></label>}
            </div>
            <button className="primary" type="button" onClick={() => setClaimDeliveryStep('details')}>Next: receiving details</button>
          </> : <>
            <p className="muted">The receiving-detail fields remain visible for the future flow but are locked. Do not enter card, account, wallet, contact, or payment-reference details.</p>
            <fieldset className="claim-delivery-details" disabled={claimDeliveryDetailsAreDisabled}>
              <div className="form-grid">
                <label>{claimMethodFields[0]}<input placeholder={claimMethod === 'Crypto wallet' ? 'Wallet address' : 'Receiving contact or institution'} /></label>
                <label>{claimMethodFields[1]}<input placeholder="Prototype detail" /></label>
              </div>
            </fieldset>
            <div className="nav-actions"><button className="secondary" type="button" onClick={() => setClaimDeliveryStep('choose')}>← Back</button><button className="primary" type="button" onClick={() => { void savePrototypeClaim() }}>Make claim</button></div>
          </>}
        </div>
      </div>}

      {showRecycleModal && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Recycle benefit confirmation">
        <div className="modal-card claim-modal">
          <button className="modal-close" type="button" onClick={() => setShowRecycleModal(false)}>×</button>
          <h3>Recycle this benefit?</h3>
          <p>This records the selected benefit as recycled instead of received. The benefit source remains with the person who claimed it; the recipient below receives the matching contribution credit.</p>
          <label>Recycle this benefit for?<select value={recycleFor} onChange={(event) => selectRecycleRecipient(event.target.value)}><option value="self">Myself</option><option disabled={linkedDependents.length === 0} value="all-dependents">All my dependents</option>{linkedDependents.map((dependent) => <option key={dependent.id} value={`dependent:${dependent.id}`}>{dependent.username}</option>)}<option value="other-person-or-group">On behalf of another person or group</option></select></label>
          {recycleFor === 'other-person-or-group' && <div className="selected-benefit-recipient"><strong>Benefit recipient</strong><span>{recycleRecipientLabel}</span><button className="secondary" type="button" onClick={() => setShowRecycleRecipientModal(true)}>{recycleRecipientProfile ? 'Change person or group' : 'Choose person or group'}</button></div>}
          <label>Where should this recycled benefit go?<select value={recycleAllocationMode} onChange={(event) => setRecycleAllocationMode(event.target.value as AllocationMode)}>{allocationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          <label className="checkbox-line"><input checked={recycleAnonymously} onChange={(event) => setRecycleAnonymously(event.target.checked)} type="checkbox" /> Recycle this benefit anonymously</label>
          <div className="payment-summary"><strong>{formatMoney(visibleClaimAmount)}</strong><span>Benefit source: {claimTargets.map((target) => target.username).join(', ')}</span><span>Contribution credit: {recycleRecipientLabel} · {allocationOptions.find((option) => option.id === recycleAllocationMode)?.label ?? 'Humanity Fund'}{recycleAnonymously ? ' · anonymous recognition' : ''}</span></div>
          <div className="nav-actions"><button className="secondary" type="button" onClick={() => setShowRecycleModal(false)}>Cancel</button><button className="primary" disabled={recycleDestinations.length === 0} type="button" onClick={() => { void recyclePrototypeClaim() }}>Confirm recycle benefit</button></div>
        </div>
      </div>}
      {showRecycleRecipientModal && <BenefitRecipientModal activeProfile={recycleRecipientProfile} onClear={() => setRecycleRecipientProfile(null)} onClose={() => setShowRecycleRecipientModal(false)} onSelect={(profile) => { setRecycleRecipientProfile(profile); setShowRecycleRecipientModal(false) }} profiles={profiles} />}
    </div>
  )
}

function BenefitRecipientModal({ activeProfile, onClear, onClose, onSelect, profiles }: { activeProfile: Profile | null; onClear: () => void; onClose: () => void; onSelect: (profile: Profile) => void; profiles: Profile[] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [draftProfile, setDraftProfile] = useState<Profile | null>(activeProfile)
  const profileTypes = Array.from(new Set(profiles.map((profile) => profile.type).filter(Boolean))).sort()
  const profileCountries = Array.from(new Set(profiles.map((profile) => profile.country).filter(Boolean))).sort()
  const matchingProfiles = profiles.filter((profile) => {
    const query = search.trim().toLocaleLowerCase()
    const matchesSearch = !query || [profile.name, profile.type, profile.country, profile.description].some((value) => value.toLocaleLowerCase().includes(query))
    return matchesSearch && (typeFilter === 'all' || profile.type === typeFilter) && (countryFilter === 'all' || profile.country === countryFilter)
  })

  useEffect(() => {
    setDraftProfile(activeProfile)
  }, [activeProfile])

  return <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Choose benefit recipient">
    <div className="modal-card contribution-profile-modal">
      <button className="modal-close" type="button" onClick={onClose}>×</button>
      <p className="eyebrow">Recycle benefit</p>
      <h3>Choose who should receive contribution credit</h3>
      <p className="muted">Use the same person or group recognition concept as a contribution. Selection stays staged until you confirm it below.</p>
      <div className="form-grid compact">
        <label>Search people and groups<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a person, group, country, or description" /></label>
        <label>Profile type<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">All profile types</option>{profileTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label>Country<select value={countryFilter} onChange={(event) => setCountryFilter(event.target.value)}><option value="all">All countries</option>{profileCountries.map((country) => <option key={country} value={country}>{country}</option>)}</select></label>
      </div>
      <div className="contribution-profile-results" aria-label="Benefit recipient search results">
        {matchingProfiles.length > 0 ? matchingProfiles.map((profile) => <button className={`contribution-profile-result ${draftProfile?.id === profile.id ? 'selected' : ''}`} key={profile.id} type="button" onClick={() => setDraftProfile(profile)}><strong>{profile.name}</strong><span>{profile.type} · {profile.country} · {profile.ageGroup}</span><small>{profile.description}</small></button>) : <p className="muted">No existing profile matches. Choose or create a profile from Contribution before recycling a benefit for it.</p>}
      </div>
      <div className="selected-contribution-profile" aria-label="Selected benefit recipient confirmation" tabIndex={-1}>
        {draftProfile ? <><strong>{draftProfile.name}</strong><span>{draftProfile.type} · {draftProfile.country}</span><div className="nav-actions"><button className="primary" type="button" onClick={() => onSelect(draftProfile)}>Confirm this benefit recipient</button><button className="secondary" type="button" onClick={() => { setDraftProfile(null); onClear() }}>Clear this benefit recipient</button></div></> : <span>Select a person or group above, then confirm the staged benefit recipient here.</span>}
      </div>
    </div>
  </div>
}

function getClaimLedgerDescription(entry: ClaimRecord, loggedInUser: User | null, users: User[]) {
  const actor = entry.actorUserId ? users.find((user) => user.id === entry.actorUserId) : null
  const target = entry.targetName ?? 'this profile'
  const action = entry.action === 'recycled' ? 'Recycled benefit' : 'Claimed benefit'
  if (entry.actorUserId && entry.actorUserId === loggedInUser?.id) return `${action} recorded by you for ${target}`
  if (actor) return `${action} recorded by ${actor.username} for ${target}`
  return `${action} for ${target}`
}


function getSelfContributions(contributions: Contribution[], user: User | null) {
  if (!user) return []
  return calculateContributionAccounting(contributions, user.id, user.profileId ?? '').selfContributions
}

function getRecognitionRecipientDisplayName(entry: Contribution, profiles: Profile[]) {
  return profiles.find((profile) => profile.id === entry.profileId)?.name ?? entry.recognitionName
}

function getContributionLedgerDescription(entry: Contribution, loggedInUser: User | null) {
  const alias = entry.anonymousAlias ?? 'Anonymous'
  const isValueSource = Boolean(loggedInUser && entry.contributorUserId === loggedInUser.id)
  const isRecordedByUser = Boolean(loggedInUser && entry.actorUserId === loggedInUser.id)
  const isOnBehalfOfAnother = Boolean((isValueSource || isRecordedByUser) && entry.profileId && entry.profileId !== loggedInUser?.profileId)
  const onBehalfText = isOnBehalfOfAnother ? ` on behalf of ${entry.recognitionName}` : ''
  const ownPrefix = isValueSource || isRecordedByUser ? 'You' : entry.recognitionName
  const benefitSource = entry.contributedByName ?? 'the represented participant'
  if (entry.sourceClaimId && isRecordedByUser && !isValueSource) return entry.isAnonymous ? `You recycled ${benefitSource}'s benefit anonymously under ${alias}${onBehalfText}` : `You recycled ${benefitSource}'s benefit${onBehalfText}`
  if (entry.sourceClaimId && isValueSource && entry.actorUserId && entry.actorUserId !== loggedInUser?.id) return entry.isAnonymous ? `A parent / guardian recycled your benefit anonymously under ${alias}${onBehalfText}` : `A parent / guardian recycled your benefit${onBehalfText}`
  if (entry.isAnonymous && entry.sourceClaimId) return `${ownPrefix} recycled this benefit anonymously under ${alias}${onBehalfText}`
  if (entry.isAnonymous) return `${ownPrefix} contributed anonymously under ${alias}${onBehalfText}`
  if (entry.sourceClaimId) return isValueSource ? `You recycled this benefit${onBehalfText}` : `${entry.recognitionName}'s recycled benefit`
  return `${entry.paymentMethod ?? 'Simulated contribution'}${onBehalfText}`
}

function getContributionCircle(total: number) {
  return contributionCircleLevels.reduce((current, level) => total >= level.threshold ? level : current, contributionCircleLevels[0])
}

function getConnectorCircle(total: number) {
  return connectorRippleCircleLevels.reduce((current, level) => total >= level.threshold ? level : current, connectorRippleCircleLevels[0])
}

function getConnectorRippleOrders(user: User | null, users: User[]) {
  const directConnections = user ? users.filter((item) => item.id !== user.id && item.connector === user.username) : []
  const directNames = new Set(directConnections.map((item) => item.username))
  const secondConnections = users.filter((item) => item.id !== user?.id && directNames.has(item.connector ?? '') && !directNames.has(item.username))
  const secondNames = new Set(secondConnections.map((item) => item.username))
  const thirdConnections = users.filter((item) => item.id !== user?.id && secondNames.has(item.connector ?? '') && !directNames.has(item.username) && !secondNames.has(item.username))
  const directMultiplier = directConnections.length > 0 ? secondConnections.length / directConnections.length : 0
  const secondMultiplier = secondConnections.length > 0 ? thirdConnections.length / secondConnections.length : directMultiplier
  const rippleMultiplier = Math.max(directMultiplier, secondMultiplier, 1)
  const fourthRipple = Math.round(Math.max(0, thirdConnections.length * rippleMultiplier))
  const fifthRipple = Math.round(Math.max(0, fourthRipple * rippleMultiplier))
  return [
    { label: 'Direct connectors', value: directConnections.length, note: 'people who named you directly', celebratory: false },
    { label: 'Second-order ripple', value: secondConnections.length, note: 'people reached through your direct connectors', celebratory: true },
    { label: 'Third-order ripple', value: thirdConnections.length, note: 'one more step through the network', celebratory: true },
    { label: 'Fourth-order ripple', value: fourthRipple, note: 'prototype projection if the pattern continues', celebratory: true },
    { label: 'Fifth-order ripple', value: fifthRipple, note: 'another possible wave of connection', celebratory: true },
  ].map((item, index, orders) => ({ ...item, runningTotal: orders.slice(0, index + 1).reduce((total, order) => total + order.value, 0) }))
}


function getPersonalClaims(claims: ClaimRecord[], user: User | null) {
  if (!user) return []
  return claims.filter((claim) => claim.userId === user.id || claim.profileId === user.profileId || claim.targetName === user.username)
}

function selectIncludes(options: string[], value: string) {
  return options.includes('All') || options.includes(value)
}

function toggleFilterOption(current: string[], option: string) {
  if (option === 'All') return ['All']
  const base = current.filter((item) => item !== 'All')
  const next = base.includes(option) ? base.filter((item) => item !== option) : [...base, option]
  return next.length === 0 ? ['All'] : next
}

const countryContinents: Record<string, string> = {
  Afghanistan: 'Asia', Albania: 'Europe', Algeria: 'Africa', Argentina: 'South America', Australia: 'Oceania', Bangladesh: 'Asia', Brazil: 'South America', Canada: 'North America', China: 'Asia', Colombia: 'South America', 'Democratic Republic of the Congo': 'Africa', Egypt: 'Africa', Ethiopia: 'Africa', France: 'Europe', Germany: 'Europe', Ghana: 'Africa', India: 'Asia', Indonesia: 'Asia', Iran: 'Asia', Iraq: 'Asia', Italy: 'Europe', Japan: 'Asia', Kenya: 'Africa', Lebanon: 'Asia', Mexico: 'North America', Morocco: 'Africa', Nigeria: 'Africa', Pakistan: 'Asia', Philippines: 'Asia', Poland: 'Europe', Russia: 'Europe', 'Saudi Arabia': 'Asia', 'South Africa': 'Africa', 'South Korea': 'Asia', Spain: 'Europe', Sweden: 'Europe', Tanzania: 'Africa', Turkey: 'Asia', Ukraine: 'Europe', 'United Kingdom': 'Europe', 'United States': 'North America', Vietnam: 'Asia', Digital: 'Digital',
}

function getContinent(country: string) {
  return countryContinents[country] ?? 'Other'
}

function CheckFilter({ label, options, values, onChange }: { label: string; options: string[]; values: string[]; onChange: (values: string[]) => void }) {
  return <div className="check-filter"><div className="filter-heading"><strong>{label}</strong><button className="secondary tiny-filter-button" type="button" onClick={() => onChange(['All'])}>Clear</button></div><div className="check-filter-options"><label className="check-option"><input type="checkbox" checked={values.includes('All')} onChange={() => onChange(['All'])} /> All</label>{options.map((option) => <label className="check-option" key={option}><input type="checkbox" checked={!values.includes('All') && values.includes(option)} onChange={() => onChange(toggleFilterOption(values, option))} /> {option}</label>)}</div></div>
}

function CompoundScreen({ averageGrowth, setAverageGrowth, onBack, onNext, onRefresh, claims, contributions, loggedInUser, users }: { averageGrowth: number; setAverageGrowth: (value: number) => void; onBack: () => void; onNext: () => void; onRefresh: () => Promise<PrototypeSnapshot | null>; claims: ClaimRecord[]; contributions: Contribution[]; loggedInUser: User | null; users: User[] }) {
  const projectionYears = Array.from({ length: 30 }, (_, index) => index + 1)
  const [selectedProjectionYear, setSelectedProjectionYear] = useState(30)
  const [rippleAnimationNonce, setRippleAnimationNonce] = useState(0)
  const [rippleStepIndex, setRippleStepIndex] = useState(0)
  const contributionAccounting = loggedInUser ? calculateContributionAccounting(contributions, loggedInUser.id, loggedInUser.profileId ?? '') : null
  const personalContributions = contributionAccounting?.selfFundContributions ?? []
  const onBehalfContributions = contributionAccounting?.onBehalfContributions ?? []
  const personalClaims = getPersonalClaims(claims, loggedInUser)
  const totalClaimedSoFar = personalClaims.reduce((total, claim) => total + claim.amount, 0)
  const ownContributionTotal = personalContributions.reduce((total, item) => total + item.amount, 0)
  const stewardshipTotal = personalContributions.reduce((total, item) => total + item.stewardshipReserve, 0)
  const onBehalfPrincipal = onBehalfContributions.reduce((total, item) => total + item.amount, 0)
  const safeGrowth = Math.max(1, Math.round(averageGrowth))
  const annualGrowthRate = safeGrowth / 100
  const vtAnnualGrowthRate = VT_FIVE_YEAR_AVERAGE_GROWTH / 100
  const now = Date.now()
  const grownValueFromDates = (entries: Contribution[]) => entries.reduce((total, item) => {
    const contributedAt = item.createdAt ? new Date(item.createdAt).getTime() : now
    const yearsSoFar = Math.max(0, (now - contributedAt) / (365.25 * 24 * 60 * 60 * 1000))
    return total + item.amount * (1 + vtAnnualGrowthRate) ** yearsSoFar
  }, 0)
  const currentContributionValue = grownValueFromDates(personalContributions)
  const grownSoFar = Math.max(0, currentContributionValue - ownContributionTotal)
  const onBehalfCurrentValue = grownValueFromDates(onBehalfContributions)
  const onBehalfGrownSoFar = Math.max(0, onBehalfCurrentValue - onBehalfPrincipal)
  const currentClaimPotentialForOthers = Math.max(0, grownSoFar * 0.3)
  const peopleReachedSoFar = Math.floor(currentClaimPotentialForOthers / MINIMUM_CLAIM_DOLLARS)
  const projectedYears = projectionYears.map((year) => {
    const grownValue = currentContributionValue * (1 + annualGrowthRate) ** year
    const startOfYearValue = currentContributionValue * (1 + annualGrowthRate) ** Math.max(0, year - 1)
    const annualClaimable = Math.max(0, grownValue - startOfYearValue) * 0.3
    const cumulativeClaimable = Math.max(0, grownValue - currentContributionValue) * 0.3
    const peopleReached = Math.floor(cumulativeClaimable / MINIMUM_CLAIM_DOLLARS)
    return { year, grownValue, annualClaimable, cumulativeClaimable, peopleReached }
  })
  const selectedProjection = projectedYears.find((item) => item.year === selectedProjectionYear) ?? projectedYears[projectedYears.length - 1]
  const maxProjection = Math.max(...projectedYears.map((year) => year.grownValue + year.cumulativeClaimable), 1)
  const finalProjection = projectedYears[projectedYears.length - 1]
  const rippleOrders = getConnectorRippleOrders(loggedInUser, users)
  const rippleTotals = rippleOrders.filter((item) => item.runningTotal > 0).map((item) => item.runningTotal)
  const rippleTotalsKey = rippleTotals.join('|')
  const rippleTotal = rippleOrders[rippleOrders.length - 1]?.runningTotal ?? 0
  const animatedRippleTotal = rippleTotals[rippleStepIndex] ?? rippleTotal
  const replayRipple = async () => { await onRefresh(); setRippleStepIndex(0); setRippleAnimationNonce((nonce) => nonce + 1) }
  useEffect(() => {
    const animatedTotals = rippleTotalsKey.split('|').filter(Boolean).map(Number)
    if (animatedTotals.length <= 1) return undefined
    setRippleStepIndex(0)
    const timers = animatedTotals.slice(1).map((_, index) => window.setTimeout(() => setRippleStepIndex(index + 1), (index + 1) * 950))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [rippleAnimationNonce, rippleTotalsKey])
  const stewardshipBreakdown = [
    { label: 'Long-term reserve', percent: 55, note: 'kept growing so stewardship can become self-sustaining' },
    { label: 'Operations and people support', percent: 15, note: 'lean staffing and day-to-day care' },
    { label: 'Verification and fraud prevention', percent: 10, note: 'protects the claim system' },
    { label: 'Outreach and education', percent: 8, note: 'helps more people understand and join' },
    { label: 'Governance, audit, and reporting', percent: 7, note: 'independent oversight and transparency' },
    { label: 'Platform and support tools', percent: 5, note: 'software, hosting, and participant support' },
  ]

  return <div className="screen-content">
    <SectionTitle eyebrow="Compound" title="See your contribution ripple through time.">Your contribution can grow, open future claim potential, and widen the circle of people reached.</SectionTitle>
    <div className="compound-stack">
      <div className="soft-card ripple-card prominent-ripple-card compact-ripple-card">
        <h3>Connector ripple total</h3>
        <div className="compound-ripple-split">
          <div className="compound-ripple-visual">
            <div className="pond-ripple celebratory-ripple" aria-label={`Animated connector ripple total of ${rippleTotal} people across visible orders`}>
              <span className="wave wave-one" /><span className="wave wave-two" /><span className="wave wave-three" />
              {rippleTotal > 0 && <div className="growth-fireworks ripple-fireworks" aria-hidden="true">{Array.from({ length: Math.min(10, Math.max(4, rippleOrders.filter((item) => item.value > 0).length + 2)) }, (_, index) => <span key={index} />)}</div>}
              <strong className={animatedRippleTotal === rippleTotal ? 'final-ripple-total' : ''}><span>{animatedRippleTotal.toLocaleString()}</span><small>{animatedRippleTotal === rippleTotal ? 'ripple total' : 'ripple growing'}</small></strong>
            </div>
            <button className="secondary ripple-refresh" type="button" onClick={() => { void replayRipple() }}>Refresh ripple</button>
          </div>
          <div className="compound-ripple-list">
            <div className="ripple-stats scroll-ripple-stats">
              {rippleOrders.map((item, index) => <span key={item.label}><b>{index === 0 ? item.value.toLocaleString() : `+ ${item.value.toLocaleString()} = ${item.runningTotal.toLocaleString()}`}</b> {item.label} {item.celebratory && item.value > 0 ? '🎉' : ''}<small>{item.note}</small></span>)}
            </div>
            <p className="muted small-note">Direct through third order uses prototype account data. Fourth and fifth are simple projections.</p>
          </div>
        </div>
      </div>
      <div className="compound-growth-sections">
        <div className="soft-card compound-current-growth-card">
          <h3>Your current contribution growth</h3>
          <div className="card-grid three compact-metrics current-growth-primary">
            <Metric label="Your own contributions" value={formatMoney(ownContributionTotal)} note={loggedInUser ? `${personalContributions.length} saved contribution${personalContributions.length === 1 ? '' : 's'}` : 'log in to use your saved contribution total'} />
            <Metric label="Growth so far" value={formatMoney(grownSoFar)} note={`from saved dates using the ${VT_FIVE_YEAR_AVERAGE_GROWTH}% benchmark`} />
            <Metric label="Total current amount" value={formatMoney(currentContributionValue)} note="contributions plus estimated growth so far" />
          </div>
          <div className="card-grid three compact-metrics current-growth-secondary">
            <Metric label="Total claimed so far" value={formatMoney(totalClaimedSoFar)} note={`${personalClaims.length} saved claim${personalClaims.length === 1 ? '' : 's'}`} />
            <Metric label="Claim potential created for others" value={formatMoney(currentClaimPotentialForOthers)} note="30% of your contribution growth so far" />
            <Metric label="People reached so far" value={peopleReachedSoFar.toLocaleString()} note={`based on claim potential and a ${formatMoney(MINIMUM_CLAIM_DOLLARS)} minimum claim offer`} />
          </div>
        </div>
        <div className="soft-card compound-current-growth-card">
          <h3>Contributions you recorded on behalf of others</h3>
          <div className="card-grid three compact-metrics current-growth-primary">
            <Metric label="Total recorded on behalf of others" value={formatMoney(onBehalfPrincipal)} note={loggedInUser ? `${onBehalfContributions.length} recorded amount${onBehalfContributions.length === 1 ? '' : 's'}` : 'log in to see amounts you recorded for others'} />
            <Metric label="Growth so far" value={formatMoney(onBehalfGrownSoFar)} note={`from saved dates using the ${VT_FIVE_YEAR_AVERAGE_GROWTH}% benchmark`} />
            <Metric label="Total current amount" value={formatMoney(onBehalfCurrentValue)} note="principal plus estimated growth so far" />
          </div>
          <p className="muted small-note">This is your own view of work you recorded for others. Recognition belongs to them.</p>
        </div>
        <div className="soft-card compound-control-card">
          <h3>Projected growth of your contributions</h3>
          <label className="growth-rate-label">
            <span>Annual growth rate <b>{safeGrowth}%</b> <button aria-label="Annual growth rate information" className="info-badge" title={`The prototype default is ${VT_FIVE_YEAR_AVERAGE_GROWTH}%, based on VT — Vanguard Total World Stock ETF. Equity for Humanity would use a rolling 5-year average annual growth benchmark.`} type="button">i</button></span>
            <input max="30" min="1" type="range" value={safeGrowth} onChange={(event) => setAverageGrowth(Math.max(1, Number(event.target.value)))} />
          </label>
          <p className="muted small-note">Default: {VT_FIVE_YEAR_AVERAGE_GROWTH}% using a rounded VT total-world-stock-market proxy.</p>
          <label className="projection-year-select">Projection year<select value={selectedProjectionYear} onChange={(event) => setSelectedProjectionYear(Number(event.target.value))}>{projectionYears.map((year) => <option key={year} value={year}>Year {year}</option>)}</select></label>
          <div className="card-grid two compact-metrics projected-growth-metrics">
            <Metric label={`${selectedProjection.year}-year projected value`} value={formatMoney(selectedProjection.grownValue)} note="from today at the selected rate" />
            <Metric label={`Claim potential in year ${selectedProjection.year}`} value={formatMoney(selectedProjection.annualClaimable)} note="that year only" />
          </div>
          <div className="compound-chart compact-compound-chart" aria-label="Contribution growth projection from today">
            {projectedYears.map((item) => {
              const growthHeight = Math.max(2, Math.round((item.grownValue / maxProjection) * 100))
              const claimHeight = Math.max(2, Math.round((item.cumulativeClaimable / maxProjection) * 100))
              return <div className="compound-year" key={item.year}>
                <div className="compound-bar" title={`Year ${item.year}: ${formatMoney(item.grownValue)} projected value, ${formatMoney(item.cumulativeClaimable)} cumulative claim potential`}>
                  <span className="claim-portion" style={{ height: `${claimHeight}%` }} />
                  <span className="growth-portion" style={{ height: `${growthHeight}%` }} />
                </div>
                <small>{item.year}</small>
              </div>
            })}
          </div>
          <div className="chart-callout"><strong>Hover any bar</strong> to compare projected value and cumulative claim potential.</div>
        </div>
      </div>
    </div>
    <div className="soft-card projection-card">
      <h3>Cumulative contribution potential</h3>
      <p className="muted">According to the annual growth rate you selected above, by year 30, your contributions could create {formatMoney(finalProjection?.cumulativeClaimable ?? 0)} in total claim potential and reach about {(finalProjection?.peopleReached ?? 0).toLocaleString()} people.</p>
      <div className="chart-callout"><strong>Prototype rule</strong> <span>30% of investment growth becomes claim potential. Claims are estimated using a {formatMoney(MINIMUM_CLAIM_DOLLARS)} minimum offer per person.</span></div>
      <div className="card-grid three compact-metrics">
        <Metric label="30-year cumulative claim potential" value={formatMoney(finalProjection?.cumulativeClaimable ?? 0)} />
        <Metric label="Minimum claim offer" value={formatMoney(MINIMUM_CLAIM_DOLLARS)} />
        <Metric label="Estimated people reached" value={(finalProjection?.peopleReached ?? 0).toLocaleString()} />
      </div>
    </div>
    <div className="soft-card projection-card stewardship-card">
      <h3>Stewardship fund</h3>
      <p className="muted">Your stewardship contribution supports the shared system behind the fund, with a large reserve so future costs can be covered by growth.</p>
      <div className="card-grid three compact-metrics"><Metric label="Your stewardship contribution" value={formatMoney(stewardshipTotal)} note="from your saved contributions" /><Metric label="Reserve target" value="55%" note="largest share kept growing" /><Metric label="Self-sustaining forecast" value="Year 3" note="if costs stay near this prototype rate" /></div>
      <div className="stewardship-breakdown">
        {stewardshipBreakdown.map((item) => <div className="stewardship-row" key={item.label}><div><strong>{item.label}</strong><small>{formatMoney(stewardshipTotal * item.percent / 100)} · {item.note}</small></div><span>{item.percent}%</span><i style={{ width: `${item.percent}%` }} /></div>)}
      </div>
      <p className="muted small-note">These are educated prototype assumptions based on lean charity/nonprofit operating patterns; real ratios would be set by audited budgets and public reporting.</p>
    </div>
    <div className="nav-actions"><button className="secondary continue-cta" type="button" onClick={onBack}>← Back to Claim</button><NextStep onClick={onNext}>Proceed to Recognition</NextStep></div>
  </div>
}


function RecognitionScreen({ funds, countries, ageRows, claims, contributions, loggedInUser, onBack, profileRows, profiles, users }: { funds: Funds; countries: CountryRow[]; ageRows: AgeRow[]; claims: ClaimRecord[]; contributions: Contribution[]; loggedInUser: User | null; onBack: () => void; profileRows: ProfileTypeRow[]; profiles: Profile[]; users: User[] }) {
  const [selectedContributionCircle, setSelectedContributionCircle] = useState(contributionCircleLevels[contributionCircleLevels.length - 1].name)
  const [selectedConnectorCircle, setSelectedConnectorCircle] = useState(connectorRippleCircleLevels[connectorRippleCircleLevels.length - 1].name)
  const [filterContributionCircles, setFilterContributionCircles] = useState<string[]>(['All'])
  const [filterConnectorCircles, setFilterConnectorCircles] = useState<string[]>(['All'])
  const [filterAgeGroups, setFilterAgeGroups] = useState<string[]>(['All'])
  const [filterProfileTypes, setFilterProfileTypes] = useState<string[]>(['All'])
  const [filterCountries, setFilterCountries] = useState<string[]>(['All'])
  const [filterContinents, setFilterContinents] = useState<string[]>(['All'])
  const [contributionReplayIndex, setContributionReplayIndex] = useState(0)
  const [connectorReplayIndex, setConnectorReplayIndex] = useState(0)
  const [contributionReplayNonce, setContributionReplayNonce] = useState(0)
  const [connectorReplayNonce, setConnectorReplayNonce] = useState(0)
  const personalContributions = getSelfContributions(contributions, loggedInUser)
  const personalContributionTotal = personalContributions.reduce((total, item) => total + item.amount, 0)
  const personalContributionAccounting = calculateContributionAccounting(contributions, loggedInUser?.id ?? '', loggedInUser?.profileId ?? '')
  const totalCreditedToProfile = personalContributionAccounting.creditedToProfileTotal
  const personalCircle = getContributionCircle(totalCreditedToProfile)
  const personalCircleIndex = contributionCircleLevels.findIndex((level) => level.name === personalCircle.name)
  useEffect(() => {
    setContributionReplayIndex(Math.max(0, personalCircleIndex))
  }, [personalCircleIndex])
  useEffect(() => {
    if (contributionReplayNonce === 0) return undefined
    setContributionReplayIndex(0)
    const targetIndex = Math.max(0, personalCircleIndex)
    const timers = Array.from({ length: targetIndex }, (_, index) => window.setTimeout(() => setContributionReplayIndex(index + 1), (index + 1) * 1050))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [contributionReplayNonce, personalCircleIndex])
  const replayContributionCircle = contributionCircleLevels[Math.min(contributionReplayIndex, Math.max(0, personalCircleIndex))] ?? personalCircle
  const personalRippleOrders = getConnectorRippleOrders(loggedInUser, users)
  const personalRippleTotal = personalRippleOrders[personalRippleOrders.length - 1]?.runningTotal ?? 0
  const personalConnectorCircle = getConnectorCircle(personalRippleTotal)
  const connectorCircleIndex = connectorRippleCircleLevels.findIndex((level) => level.name === personalConnectorCircle.name)
  useEffect(() => {
    setConnectorReplayIndex(Math.max(0, connectorCircleIndex))
  }, [connectorCircleIndex])
  useEffect(() => {
    if (connectorReplayNonce === 0) return undefined
    setConnectorReplayIndex(0)
    const targetIndex = Math.max(0, connectorCircleIndex)
    const timers = Array.from({ length: targetIndex }, (_, index) => window.setTimeout(() => setConnectorReplayIndex(index + 1), (index + 1) * 1050))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [connectorReplayNonce, connectorCircleIndex])
  const replayConnectorCircle = connectorRippleCircleLevels[Math.min(connectorReplayIndex, Math.max(0, connectorCircleIndex))] ?? personalConnectorCircle
  const claimedAmount = claims.filter((claim) => claim.action === 'claimed').reduce((total, claim) => total + claim.amount, 0)
  const recycledAmount = claims.filter((claim) => claim.action === 'recycled').reduce((total, claim) => total + claim.amount, 0)
  const claimPeople = new Set(claims.map((claim) => claim.userId || claim.profileId)).size
  const verifiedPeople = users.filter((user) => user.verifiedHumanAt).length
  const connectorsRecognized = users.filter((user) => user.connector).length
  const modeledGrowth = funds.modeledGrowth
  const stewardshipBreakdown = [
    { label: 'Long-term reserve', percent: 55, note: 'kept growing so stewardship can become self-sustaining' },
    { label: 'Operations and people support', percent: 15, note: 'lean staffing and participant care' },
    { label: 'Verification and fraud prevention', percent: 10, note: 'protects the claim system' },
    { label: 'Outreach and education', percent: 8, note: 'helps more people understand and join' },
    { label: 'Governance, audit, and reporting', percent: 7, note: 'independent oversight and transparency' },
    { label: 'Platform and support tools', percent: 5, note: 'software, hosting, and participant support' },
  ]
  const contributionTotalsByRecognitionProfile = new Map<string, { key: string; label: string; amount: number; humanity: number; stewardship: number; country: string; ageGroup: string; profileType: string }>()
  contributions.forEach((entry) => {
    const key = entry.profileId || entry.recognitionName
    const profile = profiles.find((item) => item.id === entry.profileId)
    const existing = contributionTotalsByRecognitionProfile.get(key) ?? { key, label: getRecognitionRecipientDisplayName(entry, profiles), amount: 0, humanity: 0, stewardship: 0, country: profile?.country ?? entry.country, ageGroup: profile?.ageGroup ?? entry.ageGroup, profileType: profile?.type ?? 'Individual' }
    existing.amount += entry.amount
    existing.humanity += entry.humanityFund
    existing.stewardship += entry.stewardshipReserve
    existing.country = profile?.country ?? entry.country
    existing.ageGroup = profile?.ageGroup ?? entry.ageGroup
    existing.profileType = profile?.type ?? existing.profileType
    contributionTotalsByRecognitionProfile.set(key, existing)
  })
  const contributionRecognitions = [...contributionTotalsByRecognitionProfile.values()].map((item) => ({ ...item, circle: getContributionCircle(item.amount) })).sort((a, b) => b.amount - a.amount)
  const connectorRecognitions = users.map((user) => {
    const orders = getConnectorRippleOrders(user, users)
    const total = orders[orders.length - 1]?.runningTotal ?? 0
    return { user, total, circle: getConnectorCircle(total) }
  }).filter((item) => item.total > 0).sort((a, b) => b.total - a.total)
  const browseContributors = contributionRecognitions.filter((item) => item.circle.name === selectedContributionCircle)
  const browseConnectors = connectorRecognitions.filter((item) => item.circle.name === selectedConnectorCircle)
  const countryNames = countries.map((row) => row.country)
  const continentNames = [...new Set(countryNames.map(getContinent))].sort()
  const countryMatches = (country: string) => selectIncludes(filterCountries, country) && selectIncludes(filterContinents, getContinent(country))
  const filteredContributors = contributionRecognitions.filter((item) => selectIncludes(filterContributionCircles, item.circle.name) && selectIncludes(filterAgeGroups, item.ageGroup) && selectIncludes(filterProfileTypes, item.profileType) && countryMatches(item.country))
  const filteredConnectors = connectorRecognitions.filter((item) => selectIncludes(filterConnectorCircles, item.circle.name) && selectIncludes(filterAgeGroups, item.user.ageGroup) && countryMatches(item.user.country))
  const filteredHumanity = filteredContributors.reduce((total, item) => total + item.humanity, 0)
  const filteredStewardship = filteredContributors.reduce((total, item) => total + item.stewardship, 0)
  const filteredCountryRows = countries.filter((row) => countryMatches(row.country))
  const orderedAgeGroupOptions = [...ageBrackets, ...ageRows.map((row) => row.group).filter((group) => !ageBrackets.includes(group))]
  const shouldAggregateContinents = !filterContinents.includes('All')
  const countryViewRows = shouldAggregateContinents
    ? [...filteredCountryRows.reduce((map, row) => {
      const continent = getContinent(row.country)
      const existing = map.get(continent) ?? { country: continent, people: 0, contributions: 0, connectors: 0, claimants: 0 }
      existing.people += row.people
      existing.contributions += row.contributions
      existing.connectors += row.connectors
      existing.claimants += row.claimants
      map.set(continent, existing)
      return map
    }, new Map<string, CountryRow>()).values()].sort((a, b) => a.country.localeCompare(b.country))
    : filteredCountryRows

  return <div className="screen-content recognition-screen">
    <SectionTitle eyebrow="Recognition" title="Recognize contribution and connector ripple.">Contribution recognition is credited to the selected person or group. Anonymous contributors still count without revealing their account.</SectionTitle>
    <div className="card-grid two recognition-personal-grid aligned-recognition-cards">
      <div className="soft-card tree-card recognition-hero-card">
        <div className="recognition-card-heading"><h3>Your contribution circle</h3><button className="secondary mini-refresh" type="button" onClick={() => setContributionReplayNonce((nonce) => nonce + 1)}>Refresh circle</button></div>
        <p className="muted">Thank you for reaching <strong>{personalCircle.name}</strong> through total credit to your profile: your self-directed contributions plus contributions others made on your behalf.</p>
        <div key={`contribution-${contributionReplayIndex}`} className={`tree-visual growth-art-${replayContributionCircle.name.toLowerCase()}`} style={{ '--circle-color': replayContributionCircle.color, '--level-progress': `${Math.max(0, contributionCircleLevels.findIndex((level) => level.name === replayContributionCircle.name)) / (contributionCircleLevels.length - 1) * 100}%` } as React.CSSProperties}>
          <div className="growth-preview-scrim" />
          <div className="growth-fireworks" aria-hidden="true">{Array.from({ length: Math.max(1, contributionReplayIndex + 1) }, (_, index) => <span key={index} />)}</div>
          <div className="growth-preview-badge"><span style={{ background: replayContributionCircle.color }} /><strong>{replayContributionCircle.name}</strong></div>
        </div>
        <Metric label="Total credited to your profile" value={formatMoney(totalCreditedToProfile)} note={`${personalCircle.label} · your own self-directed total is ${formatMoney(personalContributionTotal)}`} />
      </div>
      <div className="soft-card recognition-hero-card">
        <div className="recognition-card-heading"><h3>Your connector ripple circle</h3><button className="secondary mini-refresh" type="button" onClick={() => setConnectorReplayNonce((nonce) => nonce + 1)}>Refresh circle</button></div>
        <p className="muted">This recognizes the ripple you helped start — direct connectors plus later waves through the network.</p>
        <div key={`connector-${connectorReplayIndex}`} className="pond-ripple celebratory-ripple recognition-ripple" style={{ '--circle-color': replayConnectorCircle.color } as React.CSSProperties}>
          <span className="wave wave-one" /><span className="wave wave-two" /><span className="wave wave-three" />
          {personalRippleTotal > 0 && <div className="growth-fireworks ripple-fireworks" aria-hidden="true">{Array.from({ length: Math.max(4, connectorReplayIndex + 3) }, (_, index) => <span key={index} />)}</div>}
          <strong><span>{personalRippleTotal.toLocaleString()}</span><small>{replayConnectorCircle.name}</small></strong>
        </div>
        <Metric label="Connector ripple total" value={personalRippleTotal.toLocaleString()} note={personalConnectorCircle.label} />
      </div>
    </div>

    <div className="recognition-metric-groups">
      <div className="soft-card recognition-metric-group"><h3>Global contributions and fund growth</h3><p className="muted small-note">Only new simulated contributions are fund inflows. Recycled benefits remain traceable benefit-choice reallocations and do not add new fund money. The current illustrative fund value adds modeled growth and subtracts benefits recorded as received. Recycle to Stewardship moves value from Humanity to Stewardship without increasing the overall fund.</p><div className="card-grid three wide-metric-row"><Metric label="Humanity Fund contributions" value={formatCompactMoney(funds.humanityFundContributions)} /><Metric label="Stewardship contributions" value={formatCompactMoney(funds.stewardshipContributions)} /><Metric label="Total contributions" value={formatCompactMoney(funds.totalContributions)} /></div><div className="card-grid three wide-metric-row"><Metric label="Modeled growth" value={formatCompactMoney(modeledGrowth)} note={`${(funds.averageGrowth * 100).toFixed(0)}% illustrative annual growth`} /><Metric label="Benefits recorded as received" value={formatCompactMoney(funds.cumulativeParticipantBenefits)} note="subtracted from current value" /><Metric label="Current fund value" value={formatCompactMoney(funds.currentEndowment)} note="contributions + modeled growth − received benefits" /></div><div className="card-grid three wide-metric-row"><Metric label="Current Humanity Fund" value={formatCompactMoney(funds.humanityFundBalance ?? Math.max(0, funds.currentEndowment - (funds.stewardshipFundBalance ?? funds.stewardshipContributions)))} note="current value after recycled Stewardship transfers" /><Metric label="Current Stewardship Fund" value={formatCompactMoney(funds.stewardshipFundBalance ?? funds.stewardshipContributions)} note="inflows plus recycled Stewardship transfers" /><Metric label="Recycled into Stewardship" value={formatCompactMoney(funds.recycledStewardshipTransfers ?? 0)} note="moved from Humanity without new capital" /></div></div>
      <div className="soft-card recognition-metric-group"><h3>Benefits</h3><p className="muted small-note">Claimed and recycled benefits remain separate so a recycled amount is not double-counted as a payment.</p><div className="card-grid four wide-metric-row"><Metric label="Benefits claimed" value={formatCompactMoney(claimedAmount)} /><Metric label="Benefits recycled" value={formatCompactMoney(recycledAmount)} /><Metric label="Benefit records" value={claims.length.toLocaleString()} /><Metric label="People with benefit records" value={claimPeople.toLocaleString()} /></div></div>
      <div className="soft-card recognition-metric-group"><h3>People connected and verified</h3><p className="muted small-note">The human-profile side of recognition.</p><div className="card-grid three wide-metric-row"><Metric label="People with profiles" value={funds.activeClaimants.toLocaleString()} /><Metric label="Verified people" value={verifiedPeople.toLocaleString()} /><Metric label="Connectors recognized" value={connectorsRecognized.toLocaleString()} /></div></div>
    </div>

    <div className="card-grid two">
      <div className="soft-card recognition-browser"><h3>Recognition profiles by contribution circle</h3><p className="muted small-note">Shows people and groups receiving recognition in the selected circle level.</p><label>Circle level<select value={selectedContributionCircle} onChange={(event) => setSelectedContributionCircle(event.target.value)}>{[...contributionCircleLevels].reverse().map((level) => <option key={level.name}>{level.name}</option>)}</select></label><div className="recognition-list">{browseContributors.length > 0 ? browseContributors.map((item) => <span key={item.key}><b>{item.label}</b><small>{formatMoney(item.amount)} · {item.circle.name}</small></span>) : <p className="muted">No recognition profiles are in this exact level yet.</p>}</div></div>
      <div className="soft-card recognition-browser"><h3>Recognition of connector ripple circles</h3><p className="muted small-note">Shows only people currently in the selected connector-ripple level.</p><label>Circle level<select value={selectedConnectorCircle} onChange={(event) => setSelectedConnectorCircle(event.target.value)}>{[...connectorRippleCircleLevels].reverse().map((level) => <option key={level.name}>{level.name}</option>)}</select></label><div className="recognition-list">{browseConnectors.length > 0 ? browseConnectors.map((item) => <span key={item.user.id}><b>{item.user.username}</b><small>{item.total.toLocaleString()} ripple · {item.circle.name}</small></span>) : <p className="muted">No connector ripples at this exact level yet.</p>}</div></div>
    </div>

    <div className="soft-card recognition-filters compact-filter-card">
      <div className="filter-title-row"><div><h3>Filter recognition</h3><p className="muted small-note">Check one or more boxes. Leave All selected to include everything.</p></div><button className="secondary" type="button" onClick={() => { setFilterContributionCircles(['All']); setFilterConnectorCircles(['All']); setFilterAgeGroups(['All']); setFilterProfileTypes(['All']); }}>Clear all filters</button></div>
      <div className="recognition-filter-grid checkbox-filter-grid"><CheckFilter label="Contribution circles" options={contributionCircleLevels.map((level) => level.name)} values={filterContributionCircles} onChange={setFilterContributionCircles} /><CheckFilter label="Age groups" options={orderedAgeGroupOptions} values={filterAgeGroups} onChange={setFilterAgeGroups} /><CheckFilter label="Profile types" options={profileRows.map((row) => row.type)} values={filterProfileTypes} onChange={setFilterProfileTypes} /><CheckFilter label="Connector circles" options={connectorRippleCircleLevels.map((level) => level.name)} values={filterConnectorCircles} onChange={setFilterConnectorCircles} /></div>
      <div className="card-grid four"><Metric label="Filtered Humanity Fund" value={formatMoney(filteredHumanity)} /><Metric label="Filtered Stewardship Fund" value={formatMoney(filteredStewardship)} /><Metric label="Filtered contribution total" value={formatMoney(filteredHumanity + filteredStewardship)} /><Metric label="Filtered connector recognitions" value={filteredConnectors.length.toLocaleString()} /></div>
      <div className="recognition-results-grid"><div><h4>Contribution recognition</h4><div className="recognition-list compact-recognition-list">{filteredContributors.slice(0, 12).map((item) => <span key={item.key}><b>{item.label}</b><small>{item.country} · {item.ageGroup} · {formatMoney(item.amount)}</small></span>)}</div></div><div><h4>Connector recognition</h4><div className="recognition-list compact-recognition-list">{filteredConnectors.slice(0, 12).map((item) => <span key={item.user.id}><b>{item.user.username}</b><small>{item.user.country} · {item.user.ageGroup} · {item.total.toLocaleString()} ripple</small></span>)}</div></div></div>
    </div>

    <div className="soft-card country-filter-card"><div className="filter-title-row"><div><h3>Continent / country view filter</h3><p className="muted small-note">Compare countries or aggregate selected continents into continent totals.</p></div><button className="secondary" type="button" onClick={() => { setFilterCountries(['All']); setFilterContinents(['All']); }}>Clear country filters</button></div><div className="country-filter-grid"><CheckFilter label="Continents" options={continentNames} values={filterContinents} onChange={setFilterContinents} /><CheckFilter label="Countries" options={countryNames} values={filterCountries} onChange={setFilterCountries} /></div></div>
    <div className="globe-panel"><div className="globe" aria-label="Prototype interactive globe">🌍</div><div><h3>Continent / country view prototype</h3><p>Future version: turn the globe, click a continent or country, and see people connected, contributions, connectors, claimants, age groups, and profile types. When a continent filter is selected, this list rolls matching countries into continent totals.</p><div className="country-list">{countryViewRows.map((row) => <span key={row.country}><strong>{row.country}</strong> {formatCompactMoney(row.contributions)} · {row.people.toLocaleString()} people · {row.connectors.toLocaleString()} connectors · {row.claimants.toLocaleString()} claimants</span>)}</div></div></div>

    <div className="soft-card projection-card stewardship-card global-stewardship-card">
      <h3>Global stewardship fund details</h3>
      <p className="muted">This shows how the full prototype stewardship fund could be stewarded across reserves, operations, verification, outreach, governance, and platform support.</p>
      <div className="card-grid three compact-metrics"><Metric label="Total stewardship contributions" value={formatMoney(funds.stewardshipContributions)} /><Metric label="Reserve target" value={formatMoney(funds.stewardshipContributions * 0.55)} note="55% long-term reserve" /><Metric label="Available support budget" value={formatMoney(funds.stewardshipContributions * 0.45)} note="prototype operating share" /></div>
      <div className="stewardship-breakdown">{stewardshipBreakdown.map((item) => <div className="stewardship-row" key={item.label}><div><strong>{item.label}</strong><small>{formatMoney(funds.stewardshipContributions * item.percent / 100)} · {item.note}</small></div><span>{item.percent}%</span><i style={{ width: `${item.percent}%` }} /></div>)}</div>
    </div>
    <div className="nav-actions"><button className="secondary continue-cta" type="button" onClick={onBack}>← Back to Compound</button></div>
  </div>
}

export default App
