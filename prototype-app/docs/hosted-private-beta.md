# Equity for Humanity hosted private beta deployment

This is the recommended next step before any public production launch. It gives trusted testers a real hosted app while preserving the current guardrails: simulated data only, no real payments, no real identity documents, no real claims/payouts.

## Recommended stack

- Frontend: Vercel or Netlify static Vite deployment
- Backend/API: Render or Railway Node web service
- Database: Supabase Postgres or Neon Postgres
- Access control: shared private beta access code for account creation, plus app login
- Domain later: `app.equityforhumanity.org` for the frontend and `api.equityforhumanity.org` for the API

## What the code now supports

- `VITE_EFH_API_BASE` points the hosted frontend to the hosted API.
- `VITE_EFH_PRIVATE_BETA=true` shows a private beta access-code field in the create-account modal.
- `E4H_BETA_ACCESS_CODE` makes the API reject account creation unless the tester submits the code.
- `E4H_STORE=postgres` stores the prototype state in a Postgres `prototype_state` table as JSONB.
- `DATABASE_URL` connects the hosted API to Supabase/Neon/Render/Railway Postgres.
- API mutating routes require a login session token.
- API responses strip `password` and `passwordHash`.

## Backend environment variables

Set these on Render/Railway for the API service:

```bash
NODE_ENV=production
E4H_API_HOST=0.0.0.0
E4H_STORE=postgres
DATABASE_URL=<postgres connection string>
E4H_POSTGRES_SSL=true
E4H_POSTGRES_STATE_KEY=private-beta
E4H_BETA_ACCESS_CODE=<shared code for trusted beta testers>
E4H_ALLOWED_ORIGINS=https://<frontend-hostname>,https://app.equityforhumanity.org
E4H_MAX_BODY_BYTES=100000
```

Start command:

```bash
npm start
```

## Frontend environment variables

Set these on Vercel/Netlify for the app build:

```bash
VITE_EFH_API_BASE=https://<api-hostname>
VITE_EFH_PRIVATE_BETA=true
```

Build command:

```bash
npm run build
```

Output directory:

```bash
dist
```

## Supabase/Neon database

No manual schema is required. When the API starts with `E4H_STORE=postgres`, it creates this table automatically:

```sql
create table if not exists prototype_state (
  key text primary key,
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);
```

For this beta, the app persists the current prototype state as JSONB. That is enough for a private beta and minimizes risky rewrites. A later production build should normalize users, profiles, contributions, claims, sessions, audit events, and guardian links into separate tables.

## Landing page update

After the frontend is deployed, update the landing page button from local beta:

```text
http://127.0.0.1:5177/
```

to the hosted app URL, for example:

```text
https://app.equityforhumanity.org
```

## Private beta tester rules

Share only with trusted testers:

1. Hosted app URL
2. Private beta access code
3. Reminder: simulated data only
4. Reminder: no real payment info, no real identity documents, no real claims/payouts

## Pre-deployment verification

Run locally before deploying:

```bash
npm run build
npm run lint
npm test
npm audit
```

Also verify:

- login response does not expose `password` or `passwordHash`
- unauthenticated mutations fail
- account creation fails without the beta code when `E4H_BETA_ACCESS_CODE` is set
- account creation succeeds with the beta code
- unapproved origins do not get permissive CORS headers
