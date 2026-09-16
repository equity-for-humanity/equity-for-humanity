import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const appPath = new URL('../src/App.tsx', import.meta.url)
const appSource = await readFile(appPath, 'utf8')
const claimStart = appSource.indexOf('function ClaimScreen')
const compoundStart = appSource.indexOf('function CompoundScreen')
const claimSource = appSource.slice(claimStart, compoundStart)

describe('claim prototype safeguards and attribution UI', () => {
  it('keeps illustrative verification and claim-delivery detail fields visible but disabled', () => {
    expect(claimSource).toContain('const verificationDetailsAreDisabled = true')
    expect(claimSource).toContain('<fieldset className="claim-verification-details" disabled={verificationDetailsAreDisabled}>')
    expect(claimSource).toContain('const claimDeliveryDetailsAreDisabled = true')
    expect(claimSource).toContain('<fieldset className="claim-delivery-details" disabled={claimDeliveryDetailsAreDisabled}>')
  })

  it('hides a saved verification method chooser until the user explicitly reviews or updates it', () => {
    expect(claimSource).toContain('showVerificationMethodChooser')
    expect(claimSource).toContain('Review or update saved verification')
    expect(claimSource).toContain('Confirm verification method')
    expect(claimSource).toContain("setShowVerificationMethodChooser(true)")
  })

  it('uses an automatic two-route claim pathway and removes stale claim-record copy', () => {
    expect(claimSource).toContain("'claim-for-self'")
    expect(claimSource).toContain("'parent-guardian-must-claim'")
    expect(claimSource).not.toContain('Verified age / status')
    expect(claimSource).not.toContain('Claim verification and claim record')
  })

  it('calls recycled claims benefits and exposes the same recipient choices as contribution', () => {
    expect(claimSource).toContain('Recycle benefit')
    expect(claimSource).toContain('Recycle this benefit')
    expect(claimSource).toContain('Where should this recycled benefit go?')
    expect(claimSource).toContain('Recycle this benefit for')
    expect(claimSource).toContain('On behalf of another person or group')
  })

  it('summarizes benefits the signed-in user recorded by recipient, not all-prototype totals', () => {
    expect(claimSource).toContain('calculateClaimAccounting')
    expect(claimSource).toContain('Benefits you recorded for yourself')
    expect(claimSource).toContain('Benefits you recorded for dependents')
    expect(claimSource).toContain('Benefits you recorded for others')
    expect(claimSource).toContain('claimed · ')
    expect(claimSource).toContain('not all-prototype or fund-wide totals')
    expect(claimSource).not.toContain('All prototype benefit choices')
    expect(claimSource).not.toContain('totalClaimedAcrossProfiles')
    expect(claimSource).not.toContain('totalRecycledAcrossProfiles')
  })
})
