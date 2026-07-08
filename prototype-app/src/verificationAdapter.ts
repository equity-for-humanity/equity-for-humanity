export type VerificationMethod = '' | 'world-id' | 'government-id-liveness' | 'other'

export type AgeBracket = 'under_16' | '16_17' | '18_plus'

export type VerificationDraft = {
  method: VerificationMethod
  ageBracket: AgeBracket
  simulated: true
  retainedClaims: string[]
  prohibitedData: string[]
}

export function createSimulatedVerificationDraft(
  method: VerificationMethod,
  ageBracket: AgeBracket,
): VerificationDraft {
  return {
    method,
    ageBracket,
    simulated: true,
    retainedClaims: [
      'Account-linked verified-human status and verification method',
      'Unique-human token / provider reference, not raw proof documents',
      'Verification timestamp and latest review timestamp',
      'Age eligibility: adult / under 16 / dependent status',
      'For children or dependents: legal name, guardian link, and birth date or 16th-birthday review date so claim control can transfer at 16',
      'Claim history and payout / recycling choice for auditability',
      'Payment or wallet routing references only when needed to deliver an approved claim, preferably tokenized through a payment provider',
    ],
    prohibitedData: [
      'Government ID images after verification is complete',
      'Raw ID numbers unless a regulator or verification provider requires controlled retention',
      'Biometric / liveness media after the proof check is complete',
      'Wallet private keys or seed phrases',
      'Full card, bank, or payment credentials stored directly by E4H when a tokenized provider record can be used instead',
      'Extra guardian identity documents beyond what is needed to prove authority and protect the represented person',
    ],
  }
}
