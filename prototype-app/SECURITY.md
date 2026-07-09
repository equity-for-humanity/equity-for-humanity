# Equity for Humanity prototype security notes

This repository is a **beta prototype** for validating app and dashboard flows. It is not a donation platform, wallet, identity system, or payout backend.

## Current safe-use boundary

- Run locally with `npm run dev`; the API binds to `127.0.0.1` by default.
- Hosted private beta deployments may set `E4H_API_HOST=0.0.0.0`, `E4H_STORE=postgres`, `DATABASE_URL`, and `E4H_BETA_ACCESS_CODE`.
- Do not expose `127.0.0.1:8787` through a public tunnel for real users.
- Do not store real passwords, identity documents, financial details, wallet keys, payment-card details, or government-ID data in the prototype JSON file.
- The seeded accounts and payment/verification screens are simulated.

## Prototype API guardrails

The local API includes basic guardrails so the beta is safer to test:

- CORS is restricted to the local app origins by default: `http://127.0.0.1:5177` and `http://localhost:5177`.
- API responses strip `password` and `passwordHash` fields before returning JSON to the browser.
- Newly created/updated passwords are stored as salted scrypt hashes; legacy seeded accounts still use prototype fallback passwords for local demos.
- Mutating account routes require a login session token.
- Hosted private beta account creation can require a shared access code.
- Optional Postgres persistence stores the current prototype state in a JSONB row for hosted beta testing.
- Request bodies must be `application/json` and are limited to 100 KB by default.
- Error responses avoid exposing unexpected internal exception details.
- Responses include `no-store`, `nosniff`, and `no-referrer` headers.

Useful environment variables:

```bash
E4H_API_PORT=8787
E4H_API_HOST=127.0.0.1
E4H_DATA_PATH=/absolute/path/to/prototype-data.json
E4H_MAX_BODY_BYTES=100000
E4H_ALLOWED_ORIGINS=http://127.0.0.1:5177,http://localhost:5177
E4H_BETA_ACCESS_CODE=
E4H_STORE=json
DATABASE_URL=
VITE_EFH_API_BASE=http://127.0.0.1:8787
VITE_EFH_PRIVATE_BETA=false
```

## What is still not production-secure

Before any broad public launch with real users or real data, replace or extend the prototype backend with a production architecture:

- Full authentication with email verification, password recovery, stronger sessions/JWTs, CSRF protection where needed, and rate limiting.
- Server-side authorization for every profile, contribution, claim, guardian, and verification update.
- A proper database with migrations, backups, audit logs, and least-privilege access.
- Privacy-preserving verification through vetted providers; never store raw identity documents in app JSON.
- Hosted HTTPS frontend and backend with security monitoring, logging, dependency scanning, and secret management.
- Legal/compliance review before accepting funds, claims, identity verification, or public user records.

## Landing-page integration

A public static website cannot start a visitor's local Node backend. For the beta, the landing page can link to the local app URL only after the tester has started `npm run dev`. For a public demo, deploy the frontend and backend to hosted infrastructure and point `VITE_EFH_API_BASE` to the hosted HTTPS API.
