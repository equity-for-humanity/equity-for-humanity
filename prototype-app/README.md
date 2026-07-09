# Equity for Humanity — App Prototype

Local beta app/dashboard prototype for Equity for Humanity.

## Status

Prototype / concept validator only. This is not a live charity, foundation, trust, securities offering, investment product, donation platform, wallet, identity processor, verification provider, or payout system.

## Run locally

```bash
npm install
npm run dev
```

`npm run dev` starts both pieces together:

- App: <http://127.0.0.1:5177/>
- Local JSON API: <http://127.0.0.1:8787/api/snapshot>

The public landing page can link to the local beta app, but a static website cannot start a visitor's local Node backend. For public demos, deploy a hosted frontend and hosted HTTPS API, then set `VITE_EFH_API_BASE` to that API URL.

## Verify

```bash
npm run build
npm run lint
npm test
npm audit
```

## What this prototype demonstrates

- Welcome / concept overview
- Connect, Contribute, Claim, Compound, and Recognition tabs
- Simulated proof-of-human verification and saved verification state
- Parent/guardian-linked child and dependent flows
- Local JSON-backed account, profile, contribution, and claim records
- Personal contribution growth and claim-potential projections
- Contribution and connector recognition dashboards
- Anonymous contribution aliases for prototype recognition

## Safety / privacy rules

- No real payments
- No live wallet
- No real identity documents
- No biometric/liveness capture
- No exact birthdates
- No real child records
- No real guardian identity collection
- No public backend exposure
- Simulated data only

Plain-language rule: prove eligibility and uniqueness in a future privacy-preserving way; do not warehouse identity in this prototype.

See [`SECURITY.md`](./SECURITY.md) for the current beta guardrails and what would be required before any production deployment.

For hosted private beta deployment, see [`docs/hosted-private-beta.md`](./docs/hosted-private-beta.md). For the recommended Cloudflare-only path, see [`docs/cloudflare-private-beta.md`](./docs/cloudflare-private-beta.md).
