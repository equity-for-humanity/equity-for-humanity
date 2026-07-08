import { useCallback, useEffect, useState } from 'react'
import './App.css'
import {
  ageGroupSamples as fallbackAgeGroupSamples,
  allocationOptions,
  countrySamples as fallbackCountrySamples,
  dashboardSample,
  profileTypeSamples as fallbackProfileTypeSamples,
} from './mockData'
import {
  calculatePayoutScenario,
  formatCompactMoney,
  formatMoney,
  type AllocationMode,
} from './model'
import { createSimulatedVerificationDraft, type AgeBracket, type VerificationMethod } from './verificationAdapter'

type ScreenId = 'welcome' | 'connect' | 'contribute' | 'claim' | 'compound' | 'recognition'
type ContributionAssetType = 'Dollars' | 'Crypto asset' | 'Stock'
type User = { id: string; username: string; password?: string; country: string; ageGroup: string; connector?: string; guardianUsername?: string; profileId?: string; createdAt?: string; verifiedHumanAt?: string; verificationMethod?: VerificationMethod; verificationStatus?: '16_plus' | '0_15' | 'dependent' }
type Profile = { id: string; name: string; type: string; country: string; ageGroup: string; description: string; connector: string; createdAt?: string; createdByUserId?: string }
type Contribution = { id: string; recognitionName: string; amount: number; humanityFund: number; stewardshipReserve: number; country: string; ageGroup: string; contributorUserId?: string; profileId?: string; paymentMethod?: string; sourceClaimId?: string; createdAt?: string; isAnonymous?: boolean; anonymousAlias?: string }
type ClaimRecord = { id: string; actorUserId?: string; userId?: string; profileId: string; targetName?: string; amount: number; action: 'claimed' | 'recycled'; deliveryMethod?: string; denomination?: string; country?: string; ageGroup?: string; createdAt?: string }
type CountryRow = { country: string; people: number; contributions: number; connectors: number; claimants: number }
type AgeRow = { group: string; people: number }
type ProfileTypeRow = { type: string; count: number }
type Funds = typeof dashboardSample
type ContributionLedgerFocus = { label: string; userIds: string[]; profileIds: string[]; isGuardianView: boolean }
type LoginResult = { ok: boolean; error?: string; user?: User; profile?: Profile; contributions?: Contribution[]; claims?: ClaimRecord[] }
type UpdateUserProfileResult = { ok: boolean; error?: string; user?: User; profile?: Profile }
type UpdateUserVerificationResult = { ok: boolean; error?: string; user?: User; profile?: Profile }
type UpdateContributionProfileResult = { ok: boolean; error?: string; profile?: Profile }
type CreateClaimsResult = { ok: boolean; error?: string; claims?: ClaimRecord[]; contributions?: Contribution[] }
type PrototypeSnapshot = { users: User[]; profiles: Profile[]; contributions: Contribution[]; claims?: ClaimRecord[]; countries: CountryRow[]; ageGroups: AgeRow[]; profileTypes: ProfileTypeRow[]; funds: Funds }

const API_BASE = import.meta.env.VITE_EFH_API_BASE || 'http://127.0.0.1:8787'

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

function App() {
  const [screen, setScreen] = useState<ScreenId>('welcome')
  const [snapshot, setSnapshot] = useState<PrototypeSnapshot | null>(null)
  const [averageGrowth, setAverageGrowth] = useState(VT_FIVE_YEAR_AVERAGE_GROWTH)
  const [allocationMode, setAllocationMode] = useState<AllocationMode>('humanity')
  const [contributionAmount, setContributionAmount] = useState('')
  const [contributionAssetType, setContributionAssetType] = useState<ContributionAssetType>('Dollars')
  const [verifyMethod, setVerifyMethod] = useState<VerificationMethod>('')
  const [ageBracket, setAgeBracket] = useState<AgeBracket>('18_plus')
  const [profileForm, setProfileForm] = useState({ name: '', type: '', country: '', ageGroup: '', description: '', connector: '' })
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [profileMessage, setProfileMessage] = useState('')
  const [accountMessage, setAccountMessage] = useState('')
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null)
  const [contributionLedgerFocus, setContributionLedgerFocus] = useState<ContributionLedgerFocus | null>(null)

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
  const verificationDraft = createSimulatedVerificationDraft(verifyMethod || 'government-id-liveness', ageBracket)
  const claimPreview = calculatePayoutScenario({
    endowmentValue: funds.currentEndowment,
    averageGrowth: funds.averageGrowth,
    activeClaimants: 100_000,
    recycleRate: funds.recycleRate,
  })

  const createUser = async (input: { username: string; password: string; repeatPassword: string; ageGroup: string; country: string; connector: string; guardianUsername?: string }) => {
    setAccountMessage('')
    try {
      const response = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
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
      if (!response.ok || !data.ok || !data.user) throw new Error(data.error || 'Invalid username or password.')
      setLoggedInUser(data.user)
      setVerifyMethod('')
      setContributionMessage('')
      setContributionLedgerFocus(null)
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
    setAccountMessage('')
    setContributionMessage('')
    setContributionLedgerFocus(null)
    setVerifyMethod('')
  }

  const updateLoggedInUserProfile = async (patch: { username?: string; password?: string; country?: string; ageGroup?: string; connector?: string; guardianUsername?: string }) => {
    if (!loggedInUser) return { ok: false, error: 'No logged-in user.' }
    const nextUser = { ...loggedInUser, ...patch }
    setLoggedInUser(nextUser)
    setProfileForm((current) => ({ ...current, country: nextUser.country, ageGroup: nextUser.ageGroup, connector: nextUser.connector ?? '' }))
    if (activeProfile) setActiveProfile({ ...activeProfile, country: nextUser.country, ageGroup: nextUser.ageGroup, connector: nextUser.connector ?? '' })
    try {
      const response = await fetch(`${API_BASE}/api/users/profile`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: loggedInUser.id, username: patch.username, password: patch.password, country: nextUser.country, ageGroup: nextUser.ageGroup, connector: nextUser.connector ?? '', guardianUsername: nextUser.guardianUsername ?? '' }),
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


  const updateLoggedInUserVerification = async (input: { verificationMethod: VerificationMethod; verificationStatus: '16_plus' | '0_15' | 'dependent'; guardianUsername: string }) => {
    if (!loggedInUser) return { ok: false, error: 'Please log in before saving verified-human status.' }
    try {
      const response = await fetch(`${API_BASE}/api/users/verification`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
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
        headers: { 'content-type': 'application/json' },
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
        headers: { 'content-type': 'application/json' },
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

  const saveContribution = async (contributionValue = contributionAmountValue, contributionPaymentMethod = paymentMethod, targetUsers?: User[], isAnonymous = false) => {
    if (!loggedInUser) {
      setContributionMessage('Please sign in first, or create a login and profile in Connect before making a contribution.')
      return false
    }
    const selectedRecognitionProfile = activeProfile && activeProfile.id !== loggedInUser.profileId ? activeProfile : null
    const contributionTargets = targetUsers && targetUsers.length > 0 ? targetUsers : [loggedInUser]
    setContributionMessage('Saving simulated contribution…')
    try {
      const savedContributions: Contribution[] = []
      for (const targetUser of contributionTargets) {
        const response = await fetch(`${API_BASE}/api/contributions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            profileId: selectedRecognitionProfile?.id ?? targetUser.profileId ?? 'manual-profile',
            recognitionName: selectedRecognitionProfile ? recognitionName : targetUser.username,
            amount: contributionValue,
            allocationMode,
            paymentMethod: contributionPaymentMethod,
            stewardshipTip: 0,
            contributorUserId: targetUser.id,
            country: selectedRecognitionProfile?.country ?? targetUser.country ?? profileForm.country,
            ageGroup: selectedRecognitionProfile?.ageGroup ?? targetUser.ageGroup ?? profileForm.ageGroup,
            isAnonymous: isAnonymous && contributionTargets.length === 1 && targetUser.id === loggedInUser.id && !selectedRecognitionProfile,
          }),
        })
        if (!response.ok) throw new Error(`API ${response.status}`)
        savedContributions.push(await response.json() as Contribution)
      }
      const targetNames = contributionTargets.map((target) => target.username)
      const isGuardianView = contributionTargets.some((target) => target.id !== loggedInUser.id)
      if (isGuardianView) {
        setContributionLedgerFocus({
          label: targetNames.length === 1 ? targetNames[0] : 'Selected dependents',
          userIds: contributionTargets.map((target) => target.id),
          profileIds: contributionTargets.map((target) => target.profileId).filter(Boolean) as string[],
          isGuardianView,
        })
      } else setContributionLedgerFocus(null)
      const totalSaved = savedContributions.reduce((total, contribution) => total + contribution.amount, 0)
      const behalfText = isGuardianView ? ` on behalf of ${targetNames.join(', ')}` : ''
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

  const saveClaims = async (input: { action: 'claimed' | 'recycled'; amount: number; targetUserIds: string[]; deliveryMethod?: string; denomination?: string; allocationMode?: AllocationMode; isAnonymous?: boolean }) => {
    if (!loggedInUser) return { ok: false, error: 'Please sign in before making a claim.' }
    try {
      const response = await fetch(`${API_BASE}/api/claims`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ actorUserId: loggedInUser.id, ...input }),
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
        const recycledNames = recycledClaims.map((claim) => claim.targetName ?? 'selected person')
        const focusLabel = recycledNames.length === 1 ? recycledNames[0] : 'Selected dependents'
        const isGuardianView = recycledClaims.some((claim) => claim.userId && claim.userId !== loggedInUser.id)
        setContributionLedgerFocus(recycledClaims.length > 0 ? {
          label: focusLabel,
          userIds: recycledClaims.map((claim) => claim.userId).filter(Boolean) as string[],
          profileIds: recycledClaims.map((claim) => claim.profileId).filter(Boolean),
          isGuardianView,
        } : null)
        const behalfText = recycledNames.length > 0 ? ` on behalf of ${recycledNames.join(', ')}` : ''
        const accountText = isGuardianView && recycledNames.length === 1 ? ` Go to ${recycledNames[0]}'s account to see it there.` : isGuardianView ? ' Go to each child or dependent account to see it there.' : ''
        const aliasText = input.isAnonymous && data.contributions?.[0]?.anonymousAlias ? ` anonymously under ${data.contributions[0].anonymousAlias}` : ''
        setContributionMessage(`Recycled ${formatMoney(input.amount * input.targetUserIds.length)}${aliasText} into ${fundLabel}${behalfText}. The contribution ledger now includes ${input.targetUserIds.length} recycled claim entr${input.targetUserIds.length === 1 ? 'y' : 'ies'}.${accountText}`)
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
      <header className="hero-panel" id="top">
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
          {screen === 'connect' && <ConnectScreen accountMessage={accountMessage} claims={snapshot?.claims ?? []} contributions={contributions} countryOptions={countryOptions} form={profileForm} loggedInUser={loggedInUser} message={profileMessage} onChange={setProfileForm} onClaim={() => setScreen('claim')} onClearRecognitionProfile={clearRecognitionProfile} onCreateUser={createUser} onLogin={loginUser} onLogout={logoutUser} onNext={() => setScreen('contribute')} onSave={saveProfile} onSelectRecognitionProfile={selectRecognitionProfile} onUpdateContributionProfile={updateContributionProfile} onUpdateUserProfile={updateLoggedInUserProfile} profiles={snapshot?.profiles ?? []} users={snapshot?.users ?? []} />}
          {screen === 'contribute' && <ContributeScreen activeProfile={activeProfile && activeProfile.id !== loggedInUser?.profileId ? activeProfile : null} amount={contributionAmount} assetType={contributionAssetType} contributions={contributions} ledgerFocus={contributionLedgerFocus} loggedInUser={loggedInUser} message={contributionMessage} mode={allocationMode} onBack={() => setScreen('connect')} onNext={() => setScreen('claim')} onSave={saveContribution} paymentMethod={paymentMethod} recognitionName={recognitionName} setAmount={setContributionAmount} setAssetType={setContributionAssetType} setMode={setAllocationMode} setPaymentMethod={setPaymentMethod} setRecognitionName={setRecognitionName} users={snapshot?.users ?? []} />}
          {screen === 'claim' && <ClaimScreen claimPreview={claimPreview} claims={snapshot?.claims ?? []} dependents={snapshot?.users ?? []} funds={funds} loggedInUser={loggedInUser} method={verifyMethod} onBack={() => setScreen('contribute')} onNext={() => setScreen('compound')} onSaveClaims={saveClaims} onVerifyHuman={updateLoggedInUserVerification} setAgeBracket={setAgeBracket} setMethod={setVerifyMethod} users={snapshot?.users ?? []} verificationDraft={verificationDraft} />}
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

function ConnectScreen({ accountMessage, claims, contributions, countryOptions, form, loggedInUser, onChange, onClaim, onClearRecognitionProfile, onCreateUser, onLogin, onLogout, onSave, onNext, onSelectRecognitionProfile, onUpdateContributionProfile, onUpdateUserProfile, message, profiles, users }: { accountMessage: string; claims: ClaimRecord[]; contributions: Contribution[]; countryOptions: string[]; form: { name: string; type: string; country: string; ageGroup: string; description: string; connector: string }; loggedInUser: User | null; onChange: (value: { name: string; type: string; country: string; ageGroup: string; description: string; connector: string }) => void; onClaim: () => void; onClearRecognitionProfile: () => void; onCreateUser: (input: { username: string; password: string; repeatPassword: string; ageGroup: string; country: string; connector: string; guardianUsername?: string }) => Promise<{ ok: boolean; error?: string }>; onLogin: (input: { username: string; password: string }) => Promise<{ ok: boolean; error?: string }>; onLogout: () => void; onSave: () => Promise<Profile | null>; onNext: () => void; onSelectRecognitionProfile: (profile: Profile) => void; onUpdateContributionProfile: (profileId: string, input: { name: string; type: string; country: string; description: string }) => Promise<Profile | null>; onUpdateUserProfile: (patch: { username?: string; password?: string; country?: string; ageGroup?: string; connector?: string; guardianUsername?: string }) => Promise<{ ok: boolean; error?: string }>; message: string; profiles: Profile[]; users: User[] }) {
  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [newAgeGroup, setNewAgeGroup] = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newGuardianUsername, setNewGuardianUsername] = useState('')
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
  const [draftGuardianUsername, setDraftGuardianUsername] = useState('')
  const [guardianSearch, setGuardianSearch] = useState('')
  const [guardianCountry, setGuardianCountry] = useState('')
  const [guardianAgeGroup, setGuardianAgeGroup] = useState('')
  const [selfDirectedSelected, setSelfDirectedSelected] = useState(false)
  const [profileUpdateMessage, setProfileUpdateMessage] = useState('')
  const [profileMode, setProfileMode] = useState<'search' | 'create' | 'modify'>('search')
  const [profileTypeFilter, setProfileTypeFilter] = useState('')
  const [profileCountryFilter, setProfileCountryFilter] = useState('')
  const [profileSearch, setProfileSearch] = useState('')
  const [draftRecognitionProfile, setDraftRecognitionProfile] = useState<Profile | null>(null)
  const [recognitionMessage, setRecognitionMessage] = useState('')
  const [recognitionAction, setRecognitionAction] = useState<'confirmed' | 'cleared' | ''>('')
  const [profileBeingModified, setProfileBeingModified] = useState<Profile | null>(null)
  const [profileCreateErrors, setProfileCreateErrors] = useState<{ type?: string; name?: string; country?: string }>({})

  const update = (field: keyof typeof form, value: string) => onChange({ ...form, [field]: value })
  useEffect(() => {
    setDraftCountry(loggedInUser?.country ?? '')
    setDraftAgeGroup(loggedInUser?.ageGroup ?? '')
    setDraftUsername(loggedInUser?.username ?? '')
    setDraftPassword('')
    setDraftRepeatPassword('')
    setDraftConnector(loggedInUser?.connector === loggedInUser?.username ? '' : loggedInUser?.connector ?? '')
    setDraftGuardianUsername(loggedInUser?.guardianUsername ?? '')
    setGuardianSearch(loggedInUser?.guardianUsername ?? '')
    setSelfDirectedSelected(false)
    setProfileUpdateMessage('')
  }, [loggedInUser])
  useEffect(() => {
    if (!form.name) return
    const selected = profiles.find((profile) => profile.name === form.name && (!form.country || profile.country === form.country))
    if (!selected) return
    setDraftRecognitionProfile(selected)
    setProfileTypeFilter(selected.type)
    setProfileCountryFilter(selected.country)
    setProfileSearch(selected.name)
  }, [form.country, form.name, profiles])
  const loginMatches = loginUsername ? users.filter((user) => user.username.toLowerCase().startsWith(loginUsername.toLowerCase())).slice(0, 6) : []
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
    return !isLoggedInUser && !isNewAccountUser && matchesText && matchesCountry && matchesAge
  }).slice(0, 6)
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
  const passwordIssues = validatePasswordDraft(newPassword)
  const draftPasswordIssues = validatePasswordDraft(draftPassword)
  const personalContributions = loggedInUser ? contributions.filter((item) => item.contributorUserId === loggedInUser.id || item.profileId === loggedInUser.profileId || item.recognitionName === loggedInUser.username) : []
  const personalClaims = loggedInUser ? claims.filter((item) => item.userId === loggedInUser.id || item.profileId === loggedInUser.profileId || item.targetName === loggedInUser.username) : []
  const personalContributionTotal = personalContributions.reduce((total, item) => total + item.amount, 0)
  const personalClaimTotal = personalClaims.reduce((total, item) => total + item.amount, 0)
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
  const handleLogout = () => {
    setLoginUsername('')
    setLoginPassword('')
    onLogout()
  }
  const hasConnectorFilters = Boolean(connectorSearch || connectorCountry || connectorAgeGroup)
  const hasGuardianFilters = Boolean(guardianSearch || guardianCountry || guardianAgeGroup)
  const profileDraftChanged = Boolean(loggedInUser && (draftUsername !== loggedInUser.username || Boolean(draftPassword || draftRepeatPassword) || draftCountry !== loggedInUser.country || draftAgeGroup !== loggedInUser.ageGroup || draftConnector !== (loggedInUser.connector ?? '') || draftGuardianUsername !== (loggedInUser.guardianUsername ?? '') || selfDirectedSelected))
  const clearConnector = () => {
    setDraftConnector('')
    setSelfDirectedSelected(false)
    setConnectorSearch('')
    update('connector', '')
    setProfileUpdateMessage('Connector cleared locally. Press Confirm update to save it.')
  }
  const selectConnector = (user: User) => {
    if (loggedInUser && user.username === loggedInUser.username) return
    setDraftConnector(user.username)
    setSelfDirectedSelected(false)
    setConnectorSearch(user.username)
    update('connector', user.username)
    if (loggedInUser) setProfileUpdateMessage('Connector selected locally. Press Confirm update to save it.')
  }
  const selectGuardian = (user: User) => {
    if (loggedInUser && user.username === loggedInUser.username) return
    setDraftGuardianUsername(user.username)
    setNewGuardianUsername(user.username)
    setGuardianSearch(user.username)
    setProfileUpdateMessage(loggedInUser ? 'Parent / guardian selected locally. Press Confirm update to save it.' : '')
  }
  const clearGuardian = () => {
    setDraftGuardianUsername('')
    setNewGuardianUsername('')
    setGuardianSearch('')
    setProfileUpdateMessage(loggedInUser ? 'Parent / guardian cleared locally. Press Confirm update to save it.' : '')
  }
  const selectSelfDirectedConnection = () => {
    setDraftConnector('')
    setSelfDirectedSelected(true)
    setConnectorSearch('')
    update('connector', '')
    setProfileUpdateMessage('')
  }
  const confirmProfileUpdate = async () => {
    if (!draftUsername.trim()) return setProfileUpdateMessage('Username is required.')
    if (draftPasswordIssues.length > 0) return setProfileUpdateMessage(draftPasswordIssues.join(' '))
    if (draftPassword && draftPassword !== draftRepeatPassword) return setProfileUpdateMessage('Passwords must match.')
    const safeConnector = draftConnector === loggedInUser?.username ? '' : draftConnector
    const result = await onUpdateUserProfile({ username: draftUsername, password: draftPassword, country: draftCountry, ageGroup: draftAgeGroup, connector: safeConnector, guardianUsername: draftGuardianUsername })
    if (result.ok) setSelfDirectedSelected(false)
    if (result.ok) { setDraftPassword(''); setDraftRepeatPassword('') }
    const usernameChanged = result.ok && draftUsername.trim() !== loggedInUser?.username
    setProfileUpdateMessage(result.ok ? usernameChanged ? 'Username updated. This account, contribution history, claims, connector links, and parent / guardian links stayed attached.' : 'Updated.' : result.error ?? 'Could not update profile.')
  }
  const stageRecognitionProfile = (profile: Profile) => {
    setDraftRecognitionProfile(profile)
    setProfileTypeFilter(profile.type)
    setProfileCountryFilter(profile.country)
    setProfileSearch(profile.name)
    setRecognitionMessage('Press confirm to use this profile for the contribution.')
    setRecognitionAction('')
  }
  const confirmRecognitionProfile = () => {
    if (!draftRecognitionProfile) return
    onSelectRecognitionProfile(draftRecognitionProfile)
    setRecognitionMessage(`Confirmed contribution profile: ${draftRecognitionProfile.name}.`)
    setRecognitionAction('confirmed')
  }
  const clearRecognitionSelection = () => {
    setDraftRecognitionProfile(null)
    setProfileTypeFilter('')
    setProfileCountryFilter('')
    setProfileSearch('')
    setRecognitionMessage('Contribution profile cleared.')
    setRecognitionAction('cleared')
    onClearRecognitionProfile()
  }
  const saveCreatedProfile = async () => {
    const nextErrors = {
      type: form.type ? undefined : 'Select a contribution profile type.',
      name: form.name.trim() ? undefined : 'Name is required.',
      country: form.country ? undefined : 'Select a country.',
    }
    setProfileCreateErrors(nextErrors)
    if (nextErrors.type || nextErrors.name || nextErrors.country) {
      setRecognitionMessage('Complete the required contribution profile fields before saving.')
      if (nextErrors.type) document.getElementById('contribution-profile-type')?.focus()
      else if (nextErrors.country) document.getElementById('contribution-profile-country')?.focus()
      else document.getElementById('contribution-profile-name')?.focus()
      return
    }
    const profile = await onSave()
    if (!profile) return
    setProfileMode('search')
    stageRecognitionProfile(profile)
    setRecognitionMessage('Profile saved. Confirm this profile to contribute on behalf of it.')
    setProfileCreateErrors({})
    onChange({ ...form, name: '', type: '', country: '', ageGroup: '', description: '' })
  }
  const selectProfileToModify = (profile: Profile) => {
    setProfileBeingModified(profile)
    onChange({ ...form, name: profile.name, type: profile.type, country: profile.country, ageGroup: profile.ageGroup, description: profile.description })
    setProfileCreateErrors({})
    setRecognitionMessage('Modify this contribution profile, then save changes.')
    setRecognitionAction('')
  }
  const saveModifiedProfile = async () => {
    if (!profileBeingModified) return
    const nextErrors = {
      type: form.type ? undefined : 'Select a contribution profile type.',
      name: form.name.trim() ? undefined : 'Name is required.',
      country: form.country ? undefined : 'Select a country.',
    }
    setProfileCreateErrors(nextErrors)
    if (nextErrors.type || nextErrors.name || nextErrors.country) return
    const profile = await onUpdateContributionProfile(profileBeingModified.id, { name: form.name, type: form.type, country: form.country, description: form.description })
    if (!profile) return
    setProfileBeingModified(profile)
    stageRecognitionProfile(profile)
    setRecognitionMessage('Contribution profile updated.')
  }
  const submitCreate = async () => {
    if (!newUsername || !newAgeGroup || !newCountry) return setLocalError('Complete username, age group, and country. Password can stay blank in this prototype and will default to Test123#.')
    if (passwordIssues.length > 0) return setLocalError(passwordIssues.join(' '))
    if (newPassword && newPassword !== repeatPassword) return setLocalError('Passwords must match.')
    const result = await onCreateUser({ username: newUsername, password: newPassword, repeatPassword, ageGroup: newAgeGroup, country: newCountry, connector: form.connector, guardianUsername: newGuardianUsername })
    if (result.ok) {
      setShowCreateAccount(false)
      setLoginUsername(newUsername)
      setLoginPassword('')
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
              <PasswordField label="Password" value={loginPassword} onChange={setLoginPassword} placeholder="Test123#" />
              <button className="primary" type="button" onClick={() => void onLogin({ username: loginUsername, password: loginPassword })}>Log in</button>
              <div className="auth-row">
                <button className="secondary" type="button">Log in with Google</button>
                <button className="secondary" type="button">Log in with Apple</button>
                <button className="secondary" type="button">Log in with Facebook</button>
              </div>
              <button className="secondary create-account-button" type="button" onClick={() => setShowCreateAccount(true)}>Create a new account</button>
            </div>
          </> : <>
            <h3>Logged in as {loggedInUser.username}</h3>
            <div className="form-grid compact logged-in-profile-fields account-settings-grid">
              <label className="account-settings-row">Username<input value={draftUsername} onChange={(event) => { setDraftUsername(event.target.value); setProfileUpdateMessage('Press Confirm update to save account changes.') }} placeholder="Username" /></label>
              <div className="account-settings-row"><PasswordField label="New password" value={draftPassword} onChange={(value) => { setDraftPassword(value); setProfileUpdateMessage('Press Confirm update to save account changes.') }} placeholder="Leave blank to keep current password" /></div>
              <div className="account-settings-row"><PasswordField label="Repeat new password" value={draftRepeatPassword} onChange={(value) => { setDraftRepeatPassword(value); setProfileUpdateMessage('Press Confirm update to save account changes.') }} placeholder="Repeat only if changing password" /></div>
              {(draftPasswordIssues.length > 0 || (draftPassword && draftPassword !== draftRepeatPassword)) && <div className="password-rules compact-password-rules account-settings-row"><strong>Password update</strong>{draftPasswordIssues.length > 0 && <ul>{draftPasswordIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}{draftPassword && draftPassword !== draftRepeatPassword && <p>Passwords must match.</p>}</div>}
              <label>Country<select value={draftCountry} onChange={(event) => { setDraftCountry(event.target.value); setProfileUpdateMessage('Press Confirm update to save profile changes.') }}><option value="">Select country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></label>
              <label>Age group<select value={draftAgeGroup} onChange={(event) => { setDraftAgeGroup(event.target.value); setProfileUpdateMessage('Press Confirm update to save profile changes.') }}><option value="">Select age group or AI agent</option>{ageBrackets.map((age) => <option key={age}>{age}</option>)}</select></label>
            </div>
            <div className="guardian-picker">
              <details className="info-disclosure"><summary><span>Connect to a parent / guardian account (optional)</span><span className="info-toggle small-info-toggle" aria-label="More information about parent or guardian accounts">i</span></summary><p className="muted info-panel">Children or dependents can search and confirm the parent or guardian account that will claim on their behalf. You can modify this at any time when you log in.</p></details>
              <div className="form-grid compact connector-filter-grid">
                <label>Filter by country<select value={guardianCountry} onChange={(event) => setGuardianCountry(event.target.value)}><option value="">Any country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></label>
                <label>Filter by age group<select value={guardianAgeGroup} onChange={(event) => setGuardianAgeGroup(event.target.value)}><option value="">Any age group</option>{ageBrackets.map((age) => <option key={age}>{age}</option>)}</select></label>
              </div>
              <label>Search parent / guardian by name<input value={guardianSearch} onChange={(event) => setGuardianSearch(event.target.value)} placeholder="Start typing guardian name" type="search" /></label>
              {hasGuardianFilters && <div className="result-list compact-results">{guardianMatches.length > 0 ? guardianMatches.map((user) => <button key={user.id} type="button" onClick={() => selectGuardian(user)}>{user.username}<small>{user.country} · {user.ageGroup}</small></button>) : <p className="muted">No guardian accounts match those filters yet.</p>}</div>}
              {draftGuardianUsername && <div className="callout green selected-connector"><span>Selected parent / guardian: <strong>{draftGuardianUsername}</strong></span><button className="secondary" type="button" onClick={clearGuardian}>Clear guardian</button></div>}
            </div>
            <button className="secondary full-width confirm-update" disabled={!profileDraftChanged} type="button" onClick={() => { void confirmProfileUpdate() }}>Confirm update</button>
            {profileUpdateMessage && <div className="callout green compact-callout">{profileUpdateMessage}</div>}
            <div className="card-grid two login-metrics"><button className="metric-card metric-link" type="button" onClick={onNext}><span>Your contributions</span><strong>{formatMoney(personalContributionTotal)}</strong><small>{personalContributions.length} contribution{personalContributions.length === 1 ? '' : 's'} — go to Contribute</small></button><button className="metric-card metric-link" type="button" onClick={onClaim}><span>Total claimed</span><strong>{formatMoney(personalClaimTotal)}</strong><small>{personalClaims.length} claim{personalClaims.length === 1 ? '' : 's'} — go to Claim</small></button></div>
            <button className="primary full-width logout-button" type="button" onClick={handleLogout}>Log out</button>
          </>}
          {accountMessage && !loggedInUser && <div className="callout green">{accountMessage}</div>}
        </div>
        <div className="soft-card">
          <h3>Recognize your connector</h3>
          <p>If someone helped you connect with Equity for Humanity, search and select their connector username so their service can be recognized. If you found Equity for Humanity yourself, please press the button below and Confirm update. Your benefit is always yours.</p>
          <button className={`secondary full-width self-directed-button${selfDirectedSelected ? ' selected' : ''}`} type="button" onClick={selectSelfDirectedConnection}>I found Equity for Humanity myself</button>
          <div className="form-grid compact connector-filter-grid">
            <label>Filter by country<select value={connectorCountry} onChange={(event) => setConnectorCountry(event.target.value)}><option value="">Any country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></label>
            <label>Filter by age group<select value={connectorAgeGroup} onChange={(event) => setConnectorAgeGroup(event.target.value)}><option value="">Any age group</option>{ageBrackets.map((age) => <option key={age}>{age}</option>)}</select></label>
          </div>
          <label>Connector username<input value={connectorSearch} onChange={(event) => setConnectorSearch(event.target.value)} placeholder="Start typing a name" type="search" /></label>
          {hasConnectorFilters && <div className="result-list">{connectorMatches.length > 0 ? connectorMatches.map((user) => <button key={user.id} type="button" onClick={() => selectConnector(user)}>{user.username}<small>{user.country} · {user.ageGroup}</small></button>) : <p className="muted">No connectors match those filters yet.</p>}</div>}
          {loggedInUser && <button className="secondary full-width confirm-update" disabled={!profileDraftChanged} type="button" onClick={() => { void confirmProfileUpdate() }}>Confirm update</button>}
          {profileUpdateMessage && loggedInUser && <div className="callout green compact-callout">{profileUpdateMessage}</div>}
          {draftConnector && <div className="callout green selected-connector"><span>Selected connector: <strong>{draftConnector}</strong></span><button className="secondary" type="button" onClick={clearConnector}>Clear connector</button></div>}
        </div>
      </div>

      <div className="soft-card profile-builder">
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
          {draftRecognitionProfile && <div className={`callout green selected-recognition ${recognitionAction}`}><span>Selected contribution profile: <strong>{draftRecognitionProfile.name}</strong><small>{draftRecognitionProfile.type} · {draftRecognitionProfile.country}</small>{!canManageDraftRecognitionProfile && <small>Locked for editing unless you created this profile.</small>}</span><div className="selected-recognition-actions"><button className={`secondary ${recognitionAction === 'confirmed' ? 'action-clicked' : ''}`} type="button" onClick={confirmRecognitionProfile}>Confirm this contribution profile</button><button className={`secondary ${recognitionAction === 'cleared' ? 'action-clicked' : ''}`} type="button" onClick={clearRecognitionSelection}>Clear this contribution profile</button></div></div>}
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
          {message && <div className="callout green">{message}</div>}
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
          {message && <div className="callout green">{message}</div>}
        </div>}
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
            <PasswordField label="Password" value={newPassword} onChange={setNewPassword} placeholder="Optional — defaults to Test123#" />
            <PasswordField label="Repeat password" value={repeatPassword} onChange={setRepeatPassword} placeholder="Repeat only if you typed a password" />
            <div className="password-rules"><strong>Prototype password</strong><span>You can leave password blank. New accounts default to Test123#. If you type a custom password, use at least 8 characters, one capital letter, one number, and one special character.</span>{passwordIssues.length > 0 && <ul>{passwordIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>}{newPassword && newPassword !== repeatPassword && <p>Passwords must match.</p>}</div>
            <label>Age group<select value={newAgeGroup} onChange={(event) => setNewAgeGroup(event.target.value)}><option value="">Select age group or AI agent</option>{ageBrackets.map((age) => <option key={age}>{age}</option>)}</select></label>
            <label>Country<select value={newCountry} onChange={(event) => setNewCountry(event.target.value)}><option value="">Select country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></label>
            <div className="guardian-picker modal-guardian-picker">
              <h4>For children or dependents, please link your account to a parent or guardian account.</h4>
              <p className="muted">Search by name, country, and age group, then confirm the right parent or guardian account. This is so the parent or guardian can claim on behalf of their children or dependents, since children and dependents are unable to claim for themselves.</p>
              <div className="form-grid compact connector-filter-grid">
                <label>Filter by country<select value={guardianCountry} onChange={(event) => setGuardianCountry(event.target.value)}><option value="">Any country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></label>
                <label>Filter by age group<select value={guardianAgeGroup} onChange={(event) => setGuardianAgeGroup(event.target.value)}><option value="">Any age group</option>{ageBrackets.map((age) => <option key={age}>{age}</option>)}</select></label>
              </div>
              <label>Search guardian name<input value={guardianSearch} onChange={(event) => setGuardianSearch(event.target.value)} placeholder="Start typing guardian name" type="search" /></label>
              {hasGuardianFilters && <div className="result-list compact-results">{guardianMatches.length > 0 ? guardianMatches.map((user) => <button key={user.id} type="button" onClick={() => selectGuardian(user)}>{user.username}<small>{user.country} · {user.ageGroup}</small></button>) : <p className="muted">No guardian accounts match those filters yet.</p>}</div>}
              {newGuardianUsername && <div className="callout green selected-connector"><span>Confirmed parent / guardian: <strong>{newGuardianUsername}</strong></span><button className="secondary" type="button" onClick={clearGuardian}>Clear guardian</button></div>}
            </div>
          </div>
          {localError && <div className="callout">{localError}</div>}
          <button className="primary" type="button" onClick={() => void submitCreate()}>Create account in prototype</button>
        </div>
      </div>}
    </div>
  )
}

function ContributeScreen({ amount, setAmount, assetType, setAssetType, mode, setMode, onBack, onNext, onSave, message, activeProfile, recognitionName, setRecognitionName, paymentMethod, setPaymentMethod, loggedInUser, contributions, ledgerFocus, users }: { amount: string; setAmount: (value: string) => void; assetType: ContributionAssetType; setAssetType: (value: ContributionAssetType) => void; mode: AllocationMode; setMode: (value: AllocationMode) => void; onBack: () => void; onNext: () => void; onSave: (contributionValue?: number, contributionPaymentMethod?: string, targetUsers?: User[], isAnonymous?: boolean) => Promise<boolean>; message: string; activeProfile: Profile | null; recognitionName: string; setRecognitionName: (value: string) => void; paymentMethod: string; setPaymentMethod: (value: string) => void; loggedInUser: User | null; contributions: Contribution[]; ledgerFocus: ContributionLedgerFocus | null; users: User[] }) {
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
  const linkedDependents = loggedInUser ? users.filter((user) => user.id !== loggedInUser.id && (user.guardianUsername === loggedInUser.username || (!user.guardianUsername && user.connector === loggedInUser.username && isChildAgeGroup(user.ageGroup)))) : []
  const selectedContributionDependent = contributionFor.startsWith('dependent:') ? linkedDependents.find((user) => user.id === contributionFor.replace('dependent:', '')) : null
  const contributionTargets = contributionFor === 'self' && loggedInUser ? [loggedInUser] : contributionFor === 'all-dependents' ? linkedDependents : selectedContributionDependent ? [selectedContributionDependent] : loggedInUser ? [loggedInUser] : []
  const personalContributions = loggedInUser ? contributions.filter((entry) => entry.contributorUserId === loggedInUser.id || entry.profileId === loggedInUser.profileId || entry.recognitionName === loggedInUser.username) : []
  const selectedContributionFocus = contributionFor !== 'self' && contributionTargets.length > 0 ? { label: contributionTargets.length === 1 ? contributionTargets[0].username : 'Selected dependents', userIds: contributionTargets.map((target) => target.id), profileIds: contributionTargets.map((target) => target.profileId).filter(Boolean) as string[], isGuardianView: true } : null
  const activeLedgerFocus = ledgerFocus ?? selectedContributionFocus
  const focusedContributions = activeLedgerFocus ? contributions.filter((entry) => activeLedgerFocus.userIds.includes(entry.contributorUserId ?? '') || activeLedgerFocus.profileIds.includes(entry.profileId ?? '')) : []
  const ledgerContributions = activeLedgerFocus ? focusedContributions : personalContributions
  const ledgerTitle = activeLedgerFocus ? activeLedgerFocus.label === 'Selected dependents' ? 'Selected dependents’ simulated contribution ledger' : `${activeLedgerFocus.label}'s simulated contribution ledger` : 'Your simulated contribution ledger'
  const ledgerNote = activeLedgerFocus?.isGuardianView ? `Showing the contribution ledger for ${activeLedgerFocus.label} because this contribution or recycled benefit is allocated to that child or dependent account.` : ''
  const totalHumanity = personalContributions.reduce((total, entry) => total + entry.humanityFund, 0)
  const totalStewardship = personalContributions.reduce((total, entry) => total + entry.stewardshipReserve, 0)
  const recycledClaims = personalContributions.filter((entry) => entry.sourceClaimId).reduce((total, entry) => total + entry.amount, 0)
  const personalTotalContributions = totalHumanity + totalStewardship
  const currentLevel = contributionCircleLevels.reduce((current, level) => personalTotalContributions >= level.threshold ? level : current, contributionCircleLevels[0])
  const currentIndex = contributionCircleLevels.findIndex((level) => level.name === currentLevel.name)
  const nextLevel = contributionCircleLevels[currentIndex + 1] ?? currentLevel
  const nextTierGap = Math.max(0, nextLevel.threshold - personalTotalContributions)
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
  const paymentIntro = paymentMethod === 'Crypto wallet'
    ? 'Connect a wallet or paste a wallet address. This prototype does not move crypto.'
    : paymentMethod === 'Stock transfer'
      ? 'Enter transfer details for a future brokerage or transfer-agent flow. This prototype does not move shares.'
      : paymentMethod === 'Bill payment'
        ? 'Use these draft bill-payment details for a future bank payment flow.'
        : paymentMethod === 'PayPal'
          ? 'Use the draft PayPal details below. This prototype does not connect to PayPal.'
          : 'Enter draft card details for the prototype contribution flow. No real payment is processed.'
  const confirmContribution = async () => {
    if (!paymentMethod) {
      setContributionError('Please choose a payment method before continuing.')
      setShowPaymentDetails(false)
      return
    }
    setContributionError('')
    const detail = assetType === 'Stock' ? ` · ${amountNumber.toLocaleString()} ${normalizedTicker} shares at ${formatMoney(stockPrice)} per share` : assetType === 'Crypto asset' && cryptoSymbol ? ` · ${amountNumber.toLocaleString()} ${cryptoLabel} at ${formatMoney(cryptoPrice)} each` : ''
    const saved = await onSave(contributionValue, `${paymentMethod || 'Payment method not selected'}${detail}`, contributionTargets, anonymousContribution)
    if (saved) {
      const projectedTotal = personalTotalContributions + contributionValue
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
          {loggedInUser && <label>Who is this contribution for?<select value={contributionFor} onChange={(event) => setContributionFor(event.target.value)}><option value="self">My own contribution</option><option disabled={linkedDependents.length === 0} value="all-dependents">All my dependents</option>{linkedDependents.map((dependent) => <option key={dependent.id} value={`dependent:${dependent.id}`}>{dependent.username}</option>)}</select></label>}
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
            {activeProfile && loggedInUser && <label>Recognition goes to<input value={recognitionName} onChange={(event) => setRecognitionName(event.target.value)} /></label>}
            {loggedInUser && contributionFor === 'self' && !activeProfile && <label className="checkbox-line"><input checked={anonymousContribution} onChange={(event) => setAnonymousContribution(event.target.checked)} type="checkbox" /> Recognize this contribution anonymously</label>}
            {anonymousContribution && <p className="muted small-note">Recognition will show an alias like Anonymous 1. You will still see that the alias is yours when logged in.</p>}
            <label>How will you make your contribution?<select disabled={!loggedInUser} value={formPaymentMethod} onChange={(event) => { setPaymentMethod(event.target.value); setContributionError('') }} aria-invalid={Boolean(contributionError)}><option value="">Select payment method</option>{paymentMethods.map((method) => <option key={method}>{method}</option>)}</select></label>
            <button className="primary" disabled={!loggedInUser} type="button" onClick={() => { if (!formPaymentMethod) setContributionError('Please choose a payment method before continuing.'); else { setContributionError(''); setShowPaymentDetails(true) } }}>Make contribution</button>
            {contributionError && <div className="callout compact-callout">{contributionError}</div>}
            {message && <div className="callout green">{message}</div>}
            {loggedInUser && <Metric label="Your total contributions" value={formatMoney(personalTotalContributions)} />}
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
      {loggedInUser && <div className="card-grid three contribution-totals-grid"><Metric label="Your Humanity Fund total" value={formatMoney(totalHumanity)} /><Metric label="Your Stewardship Fund total" value={formatMoney(totalStewardship)} /><Metric label="Your recycled claims" value={formatMoney(recycledClaims)} /></div>}
      {loggedInUser && ledgerContributions.length > 0 && <div className="soft-card contribution-ledger"><h3>{ledgerTitle}</h3>{ledgerNote && <p className="muted">{ledgerNote}</p>}<div className="ledger-scroll">{[...ledgerContributions].reverse().map((entry) => <div className="ledger-row" key={entry.id}><strong>{formatMoney(entry.amount)}</strong><span>{getContributionLedgerDescription(entry, loggedInUser)} · {new Date(entry.createdAt ?? Date.now()).toLocaleDateString()}</span><small>Humanity {formatMoney(entry.humanityFund)} · Stewardship {formatMoney(entry.stewardshipReserve)}</small></div>)}</div></div>}
      {loggedInUser && <div className="callout">You can proceed to Claim or go back to Connect to adjust your profile.</div>}
      <div className="nav-actions"><button className="secondary continue-cta" type="button" onClick={onBack}>← Back to Connect</button>{loggedInUser && <NextStep onClick={onNext}>Proceed to Claim</NextStep>}</div>
      {showPaymentDetails && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Contribution details"><div className="modal-card payment-modal"><button className="modal-close" type="button" onClick={() => setShowPaymentDetails(false)}>×</button><h3>Contribution details</h3><p>{paymentIntro}</p><div className="payment-summary"><strong>{formatContributionAmount()}</strong><span>{selectedFundLabel}</span><span>{paymentMethod}</span></div>{paymentMethod === 'Crypto wallet' ? <div className="form-grid"><label>Cryptocurrency<select value={cryptoSymbol} onChange={(event) => setCryptoSymbol(event.target.value)}>{Object.entries(cryptoPriceExamples).map(([symbol, item]) => <option key={symbol} value={symbol}>{item.label}</option>)}</select></label><label>Wallet address<input placeholder="Paste wallet address" /></label></div> : paymentMethod === 'Stock transfer' ? <div className="form-grid"><label>Stock ticker<input value={stockTicker} onChange={(event) => setStockTicker(event.target.value.toUpperCase())} /></label><label>Number of shares<input min="0" type="number" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label>Broker or transfer agent<input placeholder="Brokerage name" /></label><label>Account reference<input placeholder="Reference number" /></label></div> : paymentMethod === 'Bill payment' ? <div className="form-grid"><label>Bank name<input placeholder="Your bank" /></label><label>Bill payment reference<input placeholder="Reference number" /></label><label>Account holder<input placeholder="Name" /></label><label>Payment date<input type="date" /></label></div> : paymentMethod === 'PayPal' ? <div className="form-grid"><label>PayPal email<input placeholder="name@example.com" type="email" /></label><label>PayPal reference<input placeholder="Reference note" /></label></div> : <div className="form-grid"><label>Cardholder name<input placeholder="Name on card" /></label><label>Card number<input placeholder="4242 4242 4242 4242" inputMode="numeric" /></label><label>Expiry<input placeholder="MM / YY" /></label><label>Security code<input placeholder="CVC" inputMode="numeric" /></label></div>}<button className="primary full-width" type="button" onClick={() => void confirmContribution()}>Save simulated contribution</button><p className="muted">Prototype only — no real payment, wallet, bank, card, crypto, or stock transfer is processed. Prototype prices are examples for contribution-equivalent estimates.</p></div></div>}
    </div>
  )
}

function isChildAgeGroup(ageGroup: string) {
  return ['0–5', '6–10', '11–15'].includes(ageGroup)
}

function ClaimScreen({ method, setMethod, setAgeBracket, claimPreview, claims, dependents, funds, loggedInUser, users, verificationDraft, onBack, onNext, onSaveClaims, onVerifyHuman }: { method: VerificationMethod; setMethod: (method: VerificationMethod) => void; setAgeBracket: (ageBracket: AgeBracket) => void; claimPreview: ReturnType<typeof calculatePayoutScenario>; claims: ClaimRecord[]; dependents: User[]; funds: Funds; loggedInUser: User | null; users: User[]; verificationDraft: ReturnType<typeof createSimulatedVerificationDraft>; onBack: () => void; onNext: () => void; onSaveClaims: (input: { action: 'claimed' | 'recycled'; amount: number; targetUserIds: string[]; deliveryMethod?: string; denomination?: string; allocationMode?: AllocationMode; isAnonymous?: boolean }) => Promise<{ ok: boolean; error?: string; claims?: ClaimRecord[]; contributions?: Contribution[] }>; onVerifyHuman: (input: { verificationMethod: VerificationMethod; verificationStatus: '16_plus' | '0_15' | 'dependent'; guardianUsername: string }) => Promise<{ ok: boolean; error?: string; user?: User }> }) {
  const linkedDependents = loggedInUser ? dependents.filter((user) => user.id !== loggedInUser.id && (user.guardianUsername === loggedInUser.username || (!user.guardianUsername && user.connector === loggedInUser.username && isChildAgeGroup(user.ageGroup)))) : []
  const [claimFor, setClaimFor] = useState('self')
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [showRecycleModal, setShowRecycleModal] = useState(false)
  const [claimMessage, setClaimMessage] = useState('')
  const [verificationError, setVerificationError] = useState('')
  const [verifiedForPrototype, setVerifiedForPrototype] = useState(Boolean(loggedInUser?.verifiedHumanAt))
  const [verifiedStatus, setVerifiedStatus] = useState<'16_plus' | '0_15' | 'dependent'>(loggedInUser?.verificationStatus ?? '16_plus')
  const [guardianAccount, setGuardianAccount] = useState(loggedInUser?.guardianUsername ?? '')
  const [twoStepEmail, setTwoStepEmail] = useState('')
  const [twoStepPhone, setTwoStepPhone] = useState('')
  const [guardianSearch, setGuardianSearch] = useState(loggedInUser?.guardianUsername ?? '')
  const [guardianCountry, setGuardianCountry] = useState('')
  const [guardianAgeGroup, setGuardianAgeGroup] = useState('')
  const [claimDeliveryStep, setClaimDeliveryStep] = useState<'choose' | 'details'>('choose')
  const [claimMethod, setClaimMethod] = useState('E-transfer')
  const [claimDenomination, setClaimDenomination] = useState('My country’s currency')
  const [claimCrypto, setClaimCrypto] = useState('Bitcoin')
  const [recycleAllocationMode, setRecycleAllocationMode] = useState<AllocationMode>('humanity')
  const [recycleAnonymously, setRecycleAnonymously] = useState(false)
  const [claimContact, setClaimContact] = useState('')
  const [claimAccount, setClaimAccount] = useState('')
  const effectiveMethod = method
  const savedMethod = loggedInUser?.verificationMethod ?? ''
  const methodLabel = effectiveMethod === 'world-id' ? 'World ID proof of human' : effectiveMethod === 'other' ? 'Other proof-of-human path' : effectiveMethod === 'government-id-liveness' ? 'Government ID' : savedMethod === 'world-id' ? 'World ID proof of human' : savedMethod === 'other' ? 'Other proof-of-human path' : 'Government ID'
  const canSelfClaim = verifiedForPrototype && verifiedStatus === '16_plus'
  const shouldUseGuardian = verifiedForPrototype && verifiedStatus !== '16_plus'
  const inferredStatus = loggedInUser && isChildAgeGroup(loggedInUser.ageGroup) ? '0_15' : loggedInUser?.verificationStatus ?? '16_plus'
  const selectedDependent = claimFor.startsWith('dependent:') ? linkedDependents.find((user) => user.id === claimFor.replace('dependent:', '')) : null
  const selectedDependentCount = claimFor === 'all-dependents' ? linkedDependents.length : selectedDependent ? 1 : 0
  const claimAmount = Math.max(0, claimPreview.quarterlyPerClaimant)
  const displayedClaimAmount = claimFor === 'self' ? claimAmount : claimAmount * selectedDependentCount
  const visibleClaimAmount = shouldUseGuardian ? claimAmount : displayedClaimAmount
  const claimTargets = claimFor === 'self' && loggedInUser ? [loggedInUser] : claimFor === 'all-dependents' ? linkedDependents : selectedDependent ? [selectedDependent] : []
  const selectedClaimLedgerUsers = shouldUseGuardian && loggedInUser ? [loggedInUser] : claimFor === 'self' && loggedInUser ? [loggedInUser] : claimFor === 'all-dependents' ? linkedDependents : selectedDependent ? [selectedDependent] : []
  const visibleProfileIds = new Set(selectedClaimLedgerUsers.map((user) => user.profileId).filter(Boolean) as string[])
  const visibleClaimRecords = claims.filter((claim) => visibleProfileIds.has(claim.profileId) && claim.action === 'claimed').sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  const totalClaimed = visibleClaimRecords.reduce((total, claim) => total + claim.amount, 0)
  const guardianMatches = users.filter((user) => {
    const isLoggedInUser = Boolean(loggedInUser && user.id === loggedInUser.id)
    const matchesText = !guardianSearch || user.username.toLowerCase().startsWith(guardianSearch.toLowerCase())
    const matchesCountry = !guardianCountry || user.country === guardianCountry
    const matchesAge = !guardianAgeGroup || user.ageGroup === guardianAgeGroup
    return !isLoggedInUser && matchesText && matchesCountry && matchesAge
  }).slice(0, 6)
  const hasGuardianFilters = Boolean(guardianSearch || guardianCountry || guardianAgeGroup)
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

  useEffect(() => {
    setVerifiedForPrototype(Boolean(loggedInUser?.verifiedHumanAt))
    setVerifiedStatus(inferredStatus)
    setGuardianAccount(loggedInUser?.guardianUsername ?? '')
    setGuardianSearch(loggedInUser?.guardianUsername ?? '')
    setMethod('')
  }, [inferredStatus, loggedInUser, setMethod])

  useEffect(() => {
    if (claimFor === 'all-dependents' && linkedDependents.length === 0) setClaimFor(canSelfClaim ? 'self' : '')
    if (claimFor.startsWith('dependent:') && !selectedDependent) setClaimFor(linkedDependents.length > 0 ? 'all-dependents' : canSelfClaim ? 'self' : '')
  }, [canSelfClaim, claimFor, linkedDependents.length, selectedDependent])

  const saveVerificationDraft = async () => {
    if (!effectiveMethod) {
      setVerificationError('Please choose a verification method before proceeding.')
      setShowVerificationModal(false)
      return
    }
    const verificationMethod = effectiveMethod
    const result = await onVerifyHuman({ verificationMethod, verificationStatus: verifiedStatus, guardianUsername: guardianAccount })
    if (!result.ok) return
    setVerifiedForPrototype(true)
    setMethod('')
    if (verifiedStatus === '16_plus') setClaimFor('self')
    else setClaimFor('')
    setShowVerificationModal(false)
    setVerificationError('')
  }
  const selectGuardianForVerification = (user: User) => {
    setGuardianAccount(user.username)
    setGuardianSearch(user.username)
  }
  const savePrototypeClaim = async () => {
    const result = await onSaveClaims({ action: 'claimed', amount: claimAmount, targetUserIds: claimTargets.map((target) => target.id), deliveryMethod: claimMethod, denomination: denominationLabel })
    if (!result.ok) {
      setClaimMessage(result.error ?? 'Could not save claim.')
      return
    }
    setClaimMessage(`Saved ${result.claims?.length ?? 0} claim record${result.claims?.length === 1 ? '' : 's'} to the prototype ledger.`)
    setShowClaimModal(false)
    setClaimDeliveryStep('choose')
  }
  const recyclePrototypeClaim = async () => {
    const fundLabel = allocationOptions.find((option) => option.id === recycleAllocationMode)?.label ?? 'Humanity Fund'
    const result = await onSaveClaims({ action: 'recycled', amount: claimAmount, targetUserIds: claimTargets.map((target) => target.id), deliveryMethod: `Recycled into ${fundLabel}`, denomination: `${fundLabel} credit`, allocationMode: recycleAllocationMode, isAnonymous: recycleAnonymously })
    if (!result.ok) {
      setClaimMessage(result.error ?? 'Could not recycle claim.')
      return
    }
    const alias = result.contributions?.find((entry) => entry.isAnonymous)?.anonymousAlias
    setClaimMessage(`Recycled ${result.claims?.length ?? 0} claim record${result.claims?.length === 1 ? '' : 's'} into the contribution ledger${alias ? ` anonymously under ${alias}` : ''}.`)
    setRecycleAnonymously(false)
    setShowRecycleModal(false)
  }

  return (
    <div className="screen-content">
      <SectionTitle eyebrow="Claim" title="Claim or recycle your benefit to participate in Equity for Humanity.">
        Before anyone can claim, please first verify that you are a unique human once. Once that one-time verification is connected to the account, eligible people can claim for themselves or for any children or dependents that are linked to their account.
      </SectionTitle>

      <div className="card-grid two">
        <div className={`soft-card claim-flow-card ${verifiedForPrototype ? 'verified-step' : ''}`}>
          <p className="eyebrow">Step 1</p>
          <h3>{verifiedForPrototype ? 'You have verified your human status' : 'Verify that you are human'}</h3>
          <p className="muted">{verifiedForPrototype ? `You have verified yourself with your ${methodLabel}. This verified-human status is saved to your account, so you can go straight to claim setup when you log in again.` : 'This happens once per person before claiming. The verification checks age/status too: ages 0–15 need a parent or guardian claim, while 16+ can claim for themselves.'}</p>
          <div className="form-stack">
            <label>Choose how you want to verify being human<select value={effectiveMethod} onChange={(event) => { setMethod(event.target.value as VerificationMethod); setVerificationError('') }} aria-invalid={Boolean(verificationError)}><option value="">Choose method</option><option value="government-id-liveness">Government ID</option><option value="world-id">World ID</option><option value="other">Other proof-of-human path</option></select></label>
            <button className="primary" type="button" onClick={() => { if (!effectiveMethod) setVerificationError('Please choose a verification method before proceeding.'); else setShowVerificationModal(true) }}>{verifiedForPrototype ? 'Review or update saved verification' : 'Verify human status'}</button>
            {verificationError && <div className="callout compact-callout">{verificationError}</div>}
            {verifiedForPrototype && <div className="callout green compact-callout">{verifiedStatus === '16_plus' ? 'This account can make its own claim.' : 'This account needs a parent or guardian account to claim the benefit.'}</div>}
          </div>
        </div>

        <div className={`soft-card claim-flow-card ${!verifiedForPrototype ? 'pending-step' : ''}`}>
          <p className="eyebrow">Step 2</p>
          <h3>Set up the claim</h3>
          {!verifiedForPrototype && <p className="muted">Complete Step 1 first. The claim options unlock after verified-human status and age/status are attached to the account.</p>}
          <div className="form-stack">
            {shouldUseGuardian ? <>
              <div className="claim-amount-box"><span>Claim amount that can be claimed on your behalf</span><strong>{formatMoney(visibleClaimAmount)}</strong></div>
              <div className="callout green compact-callout">This verified person cannot make an independent claim yet. Log into the parent or guardian account to claim the benefit on their behalf.</div>
            </> : <>
              <label>Who is this claim for?<select disabled={!verifiedForPrototype} value={claimFor} onChange={(event) => setClaimFor(event.target.value)}><option disabled={!canSelfClaim} value="self">My own claim</option><option disabled={linkedDependents.length === 0} value="all-dependents">All my dependents</option>{linkedDependents.map((dependent) => <option key={dependent.id} value={`dependent:${dependent.id}`}>{dependent.username}</option>)}</select></label>
              {linkedDependents.length === 0 && <p className="muted">No children or dependents are linked to this guardian account yet. A child or dependent links to you from their own Connect account by entering your username as their parent / guardian account.</p>}
              <div className="claim-amount-box"><span>Claim amount for this selection</span><strong>{formatMoney(visibleClaimAmount)}</strong><small>{claimFor === 'all-dependents' ? `${linkedDependents.length} linked dependent${linkedDependents.length === 1 ? '' : 's'} × ${formatMoney(claimAmount)}` : claimFor.startsWith('dependent:') ? selectedDependent?.username ?? 'Linked dependent' : 'My own claim'}</small></div>
              <div className="claim-action-buttons"><button className="primary" disabled={!verifiedForPrototype || visibleClaimAmount <= 0 || claimTargets.length === 0} type="button" onClick={() => setShowClaimModal(true)}>Make a claim</button><button className="secondary" disabled={!verifiedForPrototype || visibleClaimAmount <= 0 || claimTargets.length === 0} type="button" onClick={() => setShowRecycleModal(true)}>Recycle contribution</button></div>
            </>}
          </div>
        </div>
      </div>

      <div className="card-grid three claim-summary-grid">
        <Metric label="Illustrative Humanity Fund" value={formatCompactMoney(funds.currentEndowment)} note="current fund value" />
        <Metric label="Claim amount" value={formatMoney(visibleClaimAmount)} note={shouldUseGuardian ? 'claimable by guardian' : claimFor === 'all-dependents' ? `${linkedDependents.length} linked dependent${linkedDependents.length === 1 ? '' : 's'} × ${formatMoney(claimAmount)}` : 'quarterly estimate if 100,000 people participate'} />
        <Metric label="Your prototype claims" value={formatMoney(totalClaimed)} note={`${visibleClaimRecords.length} saved claim record${visibleClaimRecords.length === 1 ? '' : 's'}`} />
      </div>
      {claimMessage && <div className="callout green compact-callout">{claimMessage}</div>}
      {loggedInUser && visibleClaimRecords.length > 0 && <div className="soft-card contribution-ledger"><h3>{selectedClaimLedgerUsers.length === 1 && selectedClaimLedgerUsers[0].id !== loggedInUser.id ? `${selectedClaimLedgerUsers[0].username}'s simulated claim ledger` : selectedClaimLedgerUsers.length > 1 ? 'Selected dependents’ simulated claim ledger' : 'Your simulated claim ledger'}</h3><div className="ledger-scroll">{visibleClaimRecords.map((entry) => <div className="ledger-row" key={entry.id}><strong>{formatMoney(entry.amount)}</strong><span>Claimed · {entry.targetName ?? 'Claim target'} · {new Date(entry.createdAt ?? Date.now()).toLocaleDateString()}</span><small>{entry.deliveryMethod ?? 'Prototype record'}{entry.denomination ? ` · ${entry.denomination}` : ''}</small></div>)}</div></div>}

      <div className="callout green">Children 0–15 and guardian-supported dependents are claimed through a parent / guardian account, but each represented person must still pass their own identity proof so the system cannot be gamed.</div>
      <div className="nav-actions"><button className="secondary continue-cta" type="button" onClick={onBack}>← Back to Contribute</button><NextStep onClick={onNext}>Proceed to Compound</NextStep></div>

      {showVerificationModal && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Human verification details">
        <div className="modal-card claim-modal">
          <button className="modal-close" type="button" onClick={() => setShowVerificationModal(false)}>×</button>
          <h3>{methodLabel}</h3>
          <p>This is the one-time human verification step before claiming. This prototype keeps the fields visible but does not upload, store, or process any real proof.</p>
          {effectiveMethod === 'government-id-liveness' ? <div className="form-grid">
            <label>Photo ID type<select defaultValue=""><option value="">Select ID type</option><option>Passport</option><option>Driver's licence</option><option>Government identity card</option><option>Child or dependent identity document</option></select></label>
            <label>Photo ID upload<input type="file" disabled /></label>
            <label>Selfie / liveness check<input type="file" disabled /></label>
          </div> : effectiveMethod === 'world-id' ? <div className="form-grid">
            <label>World ID account<input placeholder="World ID account or proof reference" /></label>
            <label>World ID verification code<input placeholder="One-time verification code" /></label>
          </div> : <div className="form-grid"><label>Other verification partner<input placeholder="Future proof-of-human provider" /></label><label>Verification reference<input placeholder="Reference or token" /></label></div>}
          <div className="form-grid compact">
            <label>Verified age / status<select value={verifiedStatus} onChange={(event) => { const next = event.target.value as '16_plus' | '0_15' | 'dependent'; setVerifiedStatus(next); setAgeBracket(next === '16_plus' ? '18_plus' : 'under_16') }}><option value="16_plus">16+ / can claim for myself</option><option value="0_15">0–15 / parent or guardian must claim</option><option value="dependent">Dependent / guardian-supported claim</option></select></label>
            <label>Email for two-step verification<input value={twoStepEmail} onChange={(event) => setTwoStepEmail(event.target.value)} placeholder="name@example.com" type="email" /></label>
            <label>Phone for two-step verification<input value={twoStepPhone} onChange={(event) => setTwoStepPhone(event.target.value)} placeholder="Optional phone number" type="tel" /></label>
            {verifiedStatus !== '16_plus' && <div className="guardian-picker modal-guardian-picker">
              <h4>Parent / guardian account</h4>
              <p className="muted">Search by name, country, and age group, then confirm the guardian account that can claim on this person’s behalf.</p>
              <div className="form-grid compact connector-filter-grid">
                <label>Filter by country<select value={guardianCountry} onChange={(event) => setGuardianCountry(event.target.value)}><option value="">Any country</option>{countryOptions.map((country) => <option key={country}>{country}</option>)}</select></label>
                <label>Filter by age group<select value={guardianAgeGroup} onChange={(event) => setGuardianAgeGroup(event.target.value)}><option value="">Any age group</option>{ageBrackets.map((age) => <option key={age}>{age}</option>)}</select></label>
              </div>
              <label>Search guardian name<input value={guardianSearch} onChange={(event) => setGuardianSearch(event.target.value)} placeholder="Start typing guardian name" type="search" /></label>
              {hasGuardianFilters && <div className="result-list compact-results">{guardianMatches.length > 0 ? guardianMatches.map((user) => <button key={user.id} type="button" onClick={() => selectGuardianForVerification(user)}>{user.username}<small>{user.country} · {user.ageGroup}</small></button>) : <p className="muted">No guardian accounts match those filters yet.</p>}</div>}
              {guardianAccount && <div className="callout green selected-connector"><span>Confirmed parent / guardian: <strong>{guardianAccount}</strong></span><button className="secondary" type="button" onClick={() => { setGuardianAccount(''); setGuardianSearch('') }}>Clear guardian</button></div>}
            </div>}
          </div>
          <div className="payment-summary"><strong>Verified-human status {verifiedForPrototype ? 'is connected to this account' : 'will connect to this account'}</strong><span>{methodLabel}</span><span>{verifiedStatus === '16_plus' ? 'Own claim enabled after verification.' : 'Guardian claim required after verification.'}</span></div>
          <button className="primary" type="button" onClick={() => { void saveVerificationDraft() }}>{verifiedForPrototype ? 'Save updated verification' : 'Save prototype verification draft'}</button>
          <div className="card-grid two verification-privacy-grid">
            <div className="soft-card"><h3>Claim verification and claim record</h3><ul>{verificationDraft.retainedClaims.map((claim) => <li key={claim}>{claim}</li>)}</ul></div>
            <div className="soft-card danger-soft"><h3>Protected and not retained directly by Equity for Humanity</h3><ul>{verificationDraft.prohibitedData.map((item) => <li key={item}>{item}</li>)}</ul></div>
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
            <div className="form-grid">
              <label>{claimMethodFields[0]}<input value={claimContact} onChange={(event) => setClaimContact(event.target.value)} placeholder={claimMethod === 'Crypto wallet' ? 'Wallet address' : 'Receiving contact or institution'} /></label>
              <label>{claimMethodFields[1]}<input value={claimAccount} onChange={(event) => setClaimAccount(event.target.value)} placeholder="Prototype detail" /></label>
            </div>
            <div className="nav-actions"><button className="secondary" type="button" onClick={() => setClaimDeliveryStep('choose')}>← Back</button><button className="primary" type="button" onClick={() => { void savePrototypeClaim() }}>Make claim</button></div>
          </>}
        </div>
      </div>}

      {showRecycleModal && <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Recycle claim confirmation">
        <div className="modal-card claim-modal">
          <button className="modal-close" type="button" onClick={() => setShowRecycleModal(false)}>×</button>
          <h3>Recycle this claim?</h3>
          <p>This records the benefit as recycled instead of received. Confirming creates matching contribution ledger entr{claimTargets.length === 1 ? 'y' : 'ies'} for the selected person{claimTargets.length === 1 ? '' : 's'}.</p>
          <label>Where should this recycled claim go?<select value={recycleAllocationMode} onChange={(event) => setRecycleAllocationMode(event.target.value as AllocationMode)}>{allocationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label>
          <label className="checkbox-line"><input checked={recycleAnonymously} onChange={(event) => setRecycleAnonymously(event.target.checked)} type="checkbox" /> Recycle this claim anonymously</label>
          <div className="payment-summary"><strong>{formatMoney(visibleClaimAmount)}</strong><span>{claimTargets.map((target) => target.username).join(', ')}</span><span>{allocationOptions.find((option) => option.id === recycleAllocationMode)?.label ?? 'Humanity Fund'} credit{recycleAnonymously ? ' · anonymous recognition' : ''}</span></div>
          <div className="nav-actions"><button className="secondary" type="button" onClick={() => setShowRecycleModal(false)}>Cancel</button><button className="primary" type="button" onClick={() => { void recyclePrototypeClaim() }}>Confirm recycle</button></div>
        </div>
      </div>}
    </div>
  )
}


function getPersonalContributions(contributions: Contribution[], user: User | null) {
  if (!user) return []
  return contributions.filter((item) => item.contributorUserId === user.id || item.profileId === user.profileId || item.recognitionName === user.username)
}

function getContributionDisplayName(entry: Contribution, loggedInUser: User | null) {
  if (entry.isAnonymous) return `${entry.anonymousAlias ?? 'Anonymous'}${loggedInUser && entry.contributorUserId === loggedInUser.id ? ' (you)' : ''}`
  return entry.recognitionName
}

function getContributionLedgerDescription(entry: Contribution, loggedInUser: User | null) {
  const alias = entry.anonymousAlias ?? 'Anonymous'
  const isOwnAlias = Boolean(loggedInUser && entry.contributorUserId === loggedInUser.id)
  const ownPrefix = isOwnAlias ? 'You' : entry.recognitionName
  if (entry.isAnonymous && entry.sourceClaimId) return `${ownPrefix} recycled this claim anonymously under ${alias}`
  if (entry.isAnonymous) return `${ownPrefix} contributed anonymously under ${alias}`
  if (entry.sourceClaimId) return `${entry.recognitionName}'s recycled benefit`
  return entry.paymentMethod ?? 'Simulated contribution'
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
  const personalContributions = getPersonalContributions(contributions, loggedInUser)
  const personalClaims = getPersonalClaims(claims, loggedInUser)
  const totalClaimedSoFar = personalClaims.reduce((total, claim) => total + claim.amount, 0)
  const ownContributionTotal = personalContributions.reduce((total, item) => total + item.amount, 0)
  const stewardshipTotal = personalContributions.reduce((total, item) => total + item.stewardshipReserve, 0)
  const safeGrowth = Math.max(1, Math.round(averageGrowth))
  const annualGrowthRate = safeGrowth / 100
  const vtAnnualGrowthRate = VT_FIVE_YEAR_AVERAGE_GROWTH / 100
  const now = Date.now()
  const currentContributionValue = personalContributions.reduce((total, item) => {
    const contributedAt = item.createdAt ? new Date(item.createdAt).getTime() : now
    const yearsSoFar = Math.max(0, (now - contributedAt) / (365.25 * 24 * 60 * 60 * 1000))
    return total + item.amount * (1 + vtAnnualGrowthRate) ** yearsSoFar
  }, 0)
  const grownSoFar = Math.max(0, currentContributionValue - ownContributionTotal)
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
  const personalContributions = getPersonalContributions(contributions, loggedInUser)
  const personalContributionTotal = personalContributions.reduce((total, item) => total + item.amount, 0)
  const personalCircle = getContributionCircle(personalContributionTotal)
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
  const claimPeople = new Set(claims.map((claim) => claim.userId || claim.profileId)).size
  const verifiedPeople = users.filter((user) => user.verifiedHumanAt).length
  const connectorsRecognized = users.filter((user) => user.connector).length
  const totalGrowthSoFar = Math.max(0, funds.currentEndowment - funds.totalContributions)
  const stewardshipBreakdown = [
    { label: 'Long-term reserve', percent: 55, note: 'kept growing so stewardship can become self-sustaining' },
    { label: 'Operations and people support', percent: 15, note: 'lean staffing and participant care' },
    { label: 'Verification and fraud prevention', percent: 10, note: 'protects the claim system' },
    { label: 'Outreach and education', percent: 8, note: 'helps more people understand and join' },
    { label: 'Governance, audit, and reporting', percent: 7, note: 'independent oversight and transparency' },
    { label: 'Platform and support tools', percent: 5, note: 'software, hosting, and participant support' },
  ]
  const contributionTotalsByPerson = new Map<string, { key: string; label: string; amount: number; humanity: number; stewardship: number; country: string; ageGroup: string; profileType: string; contributorUserId?: string }>()
  contributions.forEach((entry) => {
    const key = entry.isAnonymous ? entry.anonymousAlias ?? entry.id : entry.contributorUserId || entry.profileId || entry.recognitionName
    const user = users.find((item) => item.id === entry.contributorUserId)
    const profile = profiles.find((item) => item.id === entry.profileId)
    const existing = contributionTotalsByPerson.get(key) ?? { key, label: getContributionDisplayName(entry, loggedInUser), amount: 0, humanity: 0, stewardship: 0, country: entry.country, ageGroup: entry.ageGroup, profileType: profile?.type ?? 'Individual', contributorUserId: entry.contributorUserId }
    existing.amount += entry.amount
    existing.humanity += entry.humanityFund
    existing.stewardship += entry.stewardshipReserve
    existing.country = user?.country ?? entry.country
    existing.ageGroup = user?.ageGroup ?? entry.ageGroup
    existing.profileType = profile?.type ?? existing.profileType
    contributionTotalsByPerson.set(key, existing)
  })
  const contributionRecognitions = [...contributionTotalsByPerson.values()].map((item) => ({ ...item, circle: getContributionCircle(item.amount) })).sort((a, b) => b.amount - a.amount)
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
    <SectionTitle eyebrow="Recognition" title="Recognize contribution and connector ripple.">Recognition thanks people for growing shared ownership and for helping the idea reach others. Anonymous contributors still count, without revealing their account.</SectionTitle>
    <div className="card-grid two recognition-personal-grid aligned-recognition-cards">
      <div className="soft-card tree-card recognition-hero-card">
        <div className="recognition-card-heading"><h3>Your contribution circle</h3><button className="secondary mini-refresh" type="button" onClick={() => setContributionReplayNonce((nonce) => nonce + 1)}>Refresh circle</button></div>
        <p className="muted">Thank you for reaching <strong>{personalCircle.name}</strong> through total contributions across the Humanity and Stewardship Funds.</p>
        <div key={`contribution-${contributionReplayIndex}`} className={`tree-visual growth-art-${replayContributionCircle.name.toLowerCase()}`} style={{ '--circle-color': replayContributionCircle.color, '--level-progress': `${Math.max(0, contributionCircleLevels.findIndex((level) => level.name === replayContributionCircle.name)) / (contributionCircleLevels.length - 1) * 100}%` } as React.CSSProperties}>
          <div className="growth-preview-scrim" />
          <div className="growth-fireworks" aria-hidden="true">{Array.from({ length: Math.max(1, contributionReplayIndex + 1) }, (_, index) => <span key={index} />)}</div>
          <div className="growth-preview-badge"><span style={{ background: replayContributionCircle.color }} /><strong>{replayContributionCircle.name}</strong></div>
        </div>
        <Metric label="Recognized total" value={formatMoney(personalContributionTotal)} note={personalCircle.label} />
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
      <div className="soft-card recognition-metric-group"><h3>Global contributions and fund growth</h3><p className="muted small-note">Money contributed, stewardship support, and growth in current fund value.</p><div className="card-grid three wide-metric-row"><Metric label="Humanity Fund contributions" value={formatCompactMoney(funds.humanityFundContributions)} /><Metric label="Stewardship contributions" value={formatCompactMoney(funds.stewardshipContributions)} /><Metric label="Total contributions" value={formatCompactMoney(funds.totalContributions)} /></div><div className="card-grid two wide-metric-row"><Metric label="Total growth so far" value={formatCompactMoney(totalGrowthSoFar)} /><Metric label="Current fund value" value={formatCompactMoney(funds.currentEndowment)} /></div></div>
      <div className="soft-card recognition-metric-group"><h3>Claims</h3><p className="muted small-note">Benefits already claimed or recycled in the prototype record.</p><div className="card-grid three wide-metric-row"><Metric label="Total amount claimed" value={formatCompactMoney(claimedAmount)} /><Metric label="Claim records" value={claims.length.toLocaleString()} /><Metric label="People making claims" value={claimPeople.toLocaleString()} /></div></div>
      <div className="soft-card recognition-metric-group"><h3>People connected and verified</h3><p className="muted small-note">The human network side of recognition.</p><div className="card-grid three wide-metric-row"><Metric label="People connected" value={users.length.toLocaleString()} /><Metric label="Verified people" value={verifiedPeople.toLocaleString()} /><Metric label="Connectors recognized" value={connectorsRecognized.toLocaleString()} /></div></div>
    </div>

    <div className="card-grid two">
      <div className="soft-card recognition-browser"><h3>Recognition of contribution circles</h3><p className="muted small-note">Shows only people currently in the selected circle level.</p><label>Circle level<select value={selectedContributionCircle} onChange={(event) => setSelectedContributionCircle(event.target.value)}>{[...contributionCircleLevels].reverse().map((level) => <option key={level.name}>{level.name}</option>)}</select></label><div className="recognition-list">{browseContributors.length > 0 ? browseContributors.map((item) => <span key={item.key}><b>{item.label}</b><small>{formatMoney(item.amount)} · {item.circle.name}</small></span>) : <p className="muted">No recognized contributors at this exact level yet.</p>}</div></div>
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
