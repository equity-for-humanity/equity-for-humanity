import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const appSource = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8')

describe('contribution destination behavior', () => {
  it('allocates one total amount evenly across selected dependents before saving ledger entries', () => {
    expect(appSource).toContain('const contributionAmounts = splitContributionEqually(contributionValue, contributionTargets.length)')
    expect(appSource).toContain('amount: contributionAmounts[targetIndex]')
    expect(appSource).toContain('contributorUserId: loggedInUser.id')
  })

  it('moves person or group recognition to a contribution modal and puts anonymity below the destination choice', () => {
    const connectStart = appSource.indexOf('function ConnectScreen')
    const contributeStart = appSource.indexOf('function ContributeScreen')
    const claimStart = appSource.indexOf('function ClaimScreen')
    const connectSource = appSource.slice(connectStart, contributeStart)
    const contributionSource = appSource.slice(contributeStart, claimStart)
    const recipientChoiceIndex = contributionSource.indexOf('Who is this contribution for?')
    const anonymousChoiceIndex = contributionSource.indexOf('Recognize this contribution anonymously')
    const amountEntryIndex = contributionSource.indexOf('className="form-grid compact contribution-entry-grid"')

    expect(connectSource).not.toContain('Contribute on behalf of or in honour of a person or group')
    expect(contributionSource).toContain('<option value="other-person-or-group">On behalf of another person or group</option>')
    expect(contributionSource).toContain('setShowContributionProfileModal(true)')
    expect(contributionSource).toContain('<ContributionProfileModal')
    expect(appSource).toContain('className="modal-card contribution-profile-modal"')
    expect(recipientChoiceIndex).toBeGreaterThan(-1)
    expect(anonymousChoiceIndex).toBeGreaterThan(recipientChoiceIndex)
    expect(anonymousChoiceIndex).toBeLessThan(amountEntryIndex)
  })

  it('keeps the contributor separate from the person or group receiving recognition', () => {
    expect(appSource).toContain('contributorUserId: loggedInUser.id')
    expect(appSource).toContain('const ledgerContributions = contributionAccounting?.recordedByUser ?? []')
    expect(appSource).not.toContain('ContributionLedgerFocus')
    expect(appSource).toContain('on behalf of ${entry.recognitionName}')
    expect(appSource).toContain('getRecognitionRecipientDisplayName(entry, profiles)')
    expect(appSource).toContain('const key = entry.profileId || entry.recognitionName')
  })

  it('bases a contribution circle on total credit to the profile, including recognition received from others', () => {
    const contributeStart = appSource.indexOf('function ContributeScreen')
    const claimStart = appSource.indexOf('function ClaimScreen')
    const contributionSource = appSource.slice(contributeStart, claimStart)

    expect(contributionSource).toContain('creditedToProfileTotal >= level.threshold')
    expect(contributionSource).toContain('nextLevel.threshold - creditedToProfileTotal')
    expect(contributionSource).toContain('note="the basis for your contribution circle"')
  })

  it('moves a selected long-list profile directly to its confirmation controls', () => {
    expect(appSource).toContain("confirmation.scrollIntoView({ behavior, block: 'center' })")
    expect(appSource).toContain('confirmation.focus({ preventScroll: true })')
    expect(appSource).not.toContain("confirmation.querySelector<HTMLButtonElement>('button')?.focus")
    expect(appSource).toContain('ref={selectedProfileConfirmationRef}')
    expect(appSource).toContain('Confirm this contribution profile')
    expect(appSource).toContain('Clear this contribution profile')
  })

  it('keeps illustrative payment fields visible but disabled for every payment method', () => {
    expect(appSource).toContain('const paymentDetailsAreDisabled = true')
    expect(appSource).toContain('<fieldset className="payment-details-fields" disabled={paymentDetailsAreDisabled}>')
    expect(appSource).toContain('Payment-entry fields are intentionally disabled')
    expect(appSource).toContain('placeholder="name@example.com"')
    expect(appSource).toContain('Save simulated contribution')
  })
})