import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')
const cssSource = await readFile(new URL('../src/App.css', import.meta.url), 'utf8')

describe('Connect profile summary UI contract', () => {
  it('keeps account identity fields hidden until the profile toggle is opened', () => {
    const summaryIndex = appSource.indexOf('<h3>Profile summary</h3>')
    const profileToggleLabel = "{accountEditorOpen ? 'Close update user profile' : 'Open update user profile'}"
    const buttonIndex = appSource.indexOf(profileToggleLabel)
    const editorGate = '{accountEditorOpen && <div className="form-stack account-profile-editor" id="account-profile-editor">'
    const editorIndex = appSource.indexOf(editorGate)
    const metricsIndex = appSource.indexOf('<div className="card-grid two login-metrics"', editorIndex)

    expect(summaryIndex).toBeGreaterThan(-1)
    expect(buttonIndex).toBeGreaterThan(summaryIndex)
    expect(editorIndex).toBeGreaterThan(buttonIndex)
    expect(metricsIndex).toBeGreaterThan(editorIndex)

    const defaultLoggedInSource = appSource.slice(summaryIndex, editorIndex)
    expect(defaultLoggedInSource).toContain('Logged in as <strong>{loggedInUser.username}</strong>')
    expect(defaultLoggedInSource).toContain('<dt>Country</dt><dd>{loggedInUser.country || \'Not selected\'}</dd>')
    expect(defaultLoggedInSource).toContain('<dt>Age group</dt><dd>{loggedInUser.ageGroup || \'Not selected\'}</dd>')
    expect(defaultLoggedInSource).not.toContain('account-settings-row">Username')
    expect(defaultLoggedInSource).not.toContain('New password')
    expect(defaultLoggedInSource).not.toContain('Repeat new password')
    expect(defaultLoggedInSource).not.toContain('<label>Country<select value={draftCountry}')
    expect(defaultLoggedInSource).not.toContain('<label>Age group<select value={draftAgeGroup}')
    expect(appSource).toContain('aria-expanded={accountEditorOpen}')
    expect(appSource).toContain('aria-controls="account-profile-editor"')
    expect(appSource).toContain('onClick={() => setAccountEditorOpen((open) => !open)}')
  })

  it('renders the expanded profile editor directly below its control before guardian information', () => {
    const profileToggleLabel = "{accountEditorOpen ? 'Close update user profile' : 'Open update user profile'}"
    const guardianToggleLabel = "{guardianEditorOpen ? 'Close update parent / guardian connection' : 'Open update parent / guardian connection'}"
    const summaryIndex = appSource.indexOf('<div className="account-profile-summary"')
    const profileToggleIndex = appSource.indexOf(profileToggleLabel)
    const profileEditorGate = '{accountEditorOpen && <div className="form-stack account-profile-editor" id="account-profile-editor">'
    const profileEditorIndex = appSource.indexOf(profileEditorGate)
    const guardianSummaryIndex = appSource.indexOf('<div className="guardian-connection-summary"')
    const guardianToggleIndex = appSource.indexOf(guardianToggleLabel)

    expect(summaryIndex).toBeGreaterThan(-1)
    expect(profileToggleIndex).toBeGreaterThan(summaryIndex)
    expect(profileEditorIndex).toBeGreaterThan(profileToggleIndex)
    expect(profileEditorIndex).toBeLessThan(guardianSummaryIndex)
    expect(guardianSummaryIndex).toBeGreaterThan(profileToggleIndex)
    expect(guardianToggleIndex).toBeGreaterThan(guardianSummaryIndex)
  })

  it('requires a parent or guardian to explicitly accept a child connection request', () => {
    const profileToggleLabel = "{accountEditorOpen ? 'Close update user profile' : 'Open update user profile'}"
    const guardianToggleLabel = "{guardianEditorOpen ? 'Close update parent / guardian connection' : 'Open update parent / guardian connection'}"
    const profileToggleIndex = appSource.indexOf(profileToggleLabel)
    const guardianToggleIndex = appSource.indexOf(guardianToggleLabel)
    const profileEditorGate = '{accountEditorOpen && <div className="form-stack account-profile-editor" id="account-profile-editor">'
    const guardianEditorGate = '{guardianEditorOpen && <div className="form-stack guardian-account-editor" id="guardian-account-editor">'
    const profileEditorIndex = appSource.indexOf(profileEditorGate)
    const guardianEditorIndex = appSource.indexOf(guardianEditorGate)

    expect(profileToggleIndex).toBeGreaterThan(-1)
    expect(guardianToggleIndex).toBeGreaterThan(profileToggleIndex)
    expect(guardianToggleIndex).toBeGreaterThan(profileEditorIndex)
    expect(guardianEditorIndex).toBeGreaterThan(profileEditorIndex)

    const guardianSummaryIndex = appSource.indexOf('<div className="guardian-connection-summary"')
    const profileEditorSource = appSource.slice(profileEditorIndex, guardianSummaryIndex)
    expect(profileEditorSource).not.toContain('guardian-picker')
    expect(profileEditorSource).not.toContain('guardian-account-editor')
    expect(appSource).toContain('guardianConnections?: GuardianConnection[]')
    expect(appSource).toContain("const acceptedChildren = users.filter((user) => hasGuardianConnection(user, loggedInUser?.id, 'accepted'))")
    expect(appSource).toContain("const pendingGuardianRequests = users.filter((user) => hasGuardianConnection(user, loggedInUser?.id, 'pending'))")
    expect(appSource).toContain('No parent / guardian identified.')
    expect(appSource).toContain('child / ward request')
    expect(appSource).toContain('No child / ward connections accepted.')
    expect(appSource).toContain('const confirmGuardianConnection = async () =>')
    expect(appSource).toContain('onRequestGuardianConnection(connection.guardianUserId)')
    expect(appSource).toContain("const stageChildWardUpdate = (childUserId: string, action: ChildWardDraftAction) => {")
    expect(appSource).toContain('const confirmChildWardUpdates = async () => {')
    expect(appSource).not.toContain('onUpdateUserProfile({ guardianUsername: draftGuardianUsername })')
    expect(appSource).toContain('>Confirm parent / guardian selection</button>')
    expect(appSource).toContain('>Submit parent / guardian request</button>')
    expect(appSource).toContain('>Accept child / ward connection</button>')
    expect(appSource).toContain('>Decline child / ward connection</button>')
    expect(appSource).toContain('>Remove child / ward connection</button>')
    expect(appSource).toContain('aria-expanded={guardianEditorOpen}')
    expect(appSource).toContain('aria-controls="guardian-account-editor"')
    expect(appSource).toContain('onClick={toggleGuardianEditor}')
    expect(cssSource).toContain('.guardian-account-editor { margin-top: 14px;')
    expect(cssSource).toContain('.guardian-connection-summary')
  })

  it('discards an unconfirmed guardian selection when the editor closes or is cancelled', () => {
    const discardDraftDeclaration = 'const discardGuardianConnectionDraft = () => {'
    const toggleDeclaration = 'const toggleGuardianEditor = () => {'
    const discardDraftIndex = appSource.indexOf(discardDraftDeclaration)
    const toggleIndex = appSource.indexOf(toggleDeclaration)

    expect(discardDraftIndex).toBeGreaterThan(-1)
    expect(toggleIndex).toBeGreaterThan(discardDraftIndex)

    const discardDraftSource = appSource.slice(discardDraftIndex, toggleIndex)
    expect(discardDraftSource).toContain('setDraftGuardianConnections(savedGuardianConnections)')
    expect(discardDraftSource).toContain('setGuardianSelectionConfirmed(false)')
    expect(discardDraftSource).toContain('setGuardianEditorOpen(false)')
    expect(appSource).toContain('if (guardianEditorOpen) return discardGuardianConnectionDraft()')
    expect(appSource).toContain('onClick={toggleGuardianEditor}')
    expect(appSource).toContain('onClick={discardGuardianConnectionDraft}>Cancel parent / guardian connection</button>')
  })

  it('keeps a logged-in guardian draft separate from the create-account selection', () => {
    const selectGuardianStart = appSource.indexOf('const selectGuardian = (user: User) => {')
    const selectGuardianEnd = appSource.indexOf('const clearGuardian = (guardianUserId: string) => {', selectGuardianStart)

    expect(selectGuardianStart).toBeGreaterThan(-1)
    expect(selectGuardianEnd).toBeGreaterThan(selectGuardianStart)

    const selectGuardianSource = appSource.slice(selectGuardianStart, selectGuardianEnd)
    expect(selectGuardianSource).toContain('if (loggedInUser) {')
    expect(selectGuardianSource).toContain('setDraftGuardianConnections')
    expect(selectGuardianSource).toContain('setNewGuardianConnections')
  })

  it('models up to two direct guardian connections and confirms a staged removal explicitly', () => {
    expect(appSource).toContain('const MAX_DIRECT_GUARDIAN_CONNECTIONS = 2')
    expect(appSource).toContain('guardianConnections?: GuardianConnection[]')
    expect(appSource).toContain('const acceptedChildren = users.filter((user) => hasGuardianConnection(user, loggedInUser?.id, \'accepted\'))')
    expect(appSource).toContain('An account with an accepted child / ward connection cannot identify a parent / guardian.')
    expect(appSource).toContain('>Confirm cancel parent / guardian request</button>')
    expect(appSource).toContain('>Confirm remove parent / guardian connection</button>')
    expect(appSource).toContain('onRemoveGuardianConnection(loggedInUser.id, connection.guardianUserId)')
  })

  it('uses a staged connector status and disclosure with explicit confirmation', () => {
    expect(appSource).toContain('connectorSelfDirected?: boolean')
    expect(appSource).toContain('const [connectorEditorOpen, setConnectorEditorOpen] = useState(false)')
    expect(appSource).toContain('No connector identified.')
    expect(appSource).toContain('You found Equity for Humanity yourself.')
    expect(appSource).toContain('Someone helped me connect to Equity for Humanity')
    expect(appSource).toContain('>Confirm connector update</button>')
    expect(appSource).toContain('>Cancel connector update</button>')
    expect(appSource).toContain('const connectorSelfDirected = Boolean(draftConnectorSelfDirected && !safeConnector)')
    expect(appSource).toContain('onUpdateUserProfile({ connector: safeConnector, connectorSelfDirected })')
  })

  it('stages child or ward responses and removals until a guardian confirms the update', () => {
    expect(appSource).toContain("const [childWardDraftChanges, setChildWardDraftChanges] = useState<ChildWardDraftChange[]>([])")
    expect(appSource).toContain("const stageChildWardUpdate = (childUserId: string, action: ChildWardDraftAction) => {")
    expect(appSource).toContain('const confirmChildWardUpdates = async () => {')
    expect(appSource).toContain('const confirmedChildWardIds = new Set<string>()')
    expect(appSource).toContain("childWardDraftChanges.filter((change) => change.action === 'remove')")
    expect(appSource).toContain("childWardDraftChanges.filter((change) => change.action !== 'remove')")
    expect(appSource).toContain('>Confirm child / ward update</button>')
    expect(appSource).toContain('>Cancel child / ward update</button>')
    expect(appSource).toContain("onClick={() => stageChildWardUpdate(child.id, 'accepted')}")
    expect(appSource).toContain("onClick={() => stageChildWardUpdate(child.id, 'declined')}")
    expect(appSource).toContain("onClick={() => stageChildWardUpdate(child.id, 'remove')}")

    const stageStart = appSource.indexOf('const stageChildWardUpdate = (childUserId: string, action: ChildWardDraftAction) => {')
    const confirmStart = appSource.indexOf('const confirmChildWardUpdates = async () => {', stageStart)
    expect(stageStart).toBeGreaterThan(-1)
    expect(confirmStart).toBeGreaterThan(stageStart)
    expect(appSource.slice(stageStart, confirmStart)).not.toContain('onRemoveGuardianConnection(')
    expect(appSource.slice(stageStart, confirmStart)).not.toContain('onRespondGuardianConnection(')
    expect(appSource).toContain('setChildWardDraftChanges((changes) => changes.filter((change) => !confirmedChildWardIds.has(change.childUserId)))')
    expect(appSource).toContain('setChildWardDraftChanges([])')
  })

  it('lets a self-directed connector status be cleared as a draft before confirmation', () => {
    expect(appSource).toContain('>Clear self-directed status</button>')
    expect(appSource).toContain('onClick={clearConnector}>Clear self-directed status</button>')
    expect(appSource).toContain('Connector cleared locally. Confirm connector update to save it.')
  })

  it('uses parent or guardian search wording and shows the ten-child ward capacity', () => {
    expect(appSource).toContain('const MAX_ACTIVE_CHILD_WARD_CONNECTIONS = 10')
    expect(appSource).toContain('const activeChildWardCount = acceptedChildren.length + pendingGuardianRequests.length')
    expect(appSource.match(/Search parent \/ guardian name/g)).toHaveLength(2)
    expect(appSource.match(/placeholder="Start typing a parent \/ guardian name"/g)).toHaveLength(2)
    expect(appSource).toContain('of {MAX_ACTIVE_CHILD_WARD_CONNECTIONS} active child / ward connections')
  })
})
