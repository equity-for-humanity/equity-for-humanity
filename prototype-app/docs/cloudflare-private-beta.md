# Cloudflare private beta setup — Equity for Humanity

This is the lowest-cost path: Cloudflare hosts the visible app, backend API, and small database.

## What Cloudflare pieces do

- **Cloudflare Pages** hosts the app website.
- **Cloudflare Pages Functions** run the `/api/...` backend.
- **Cloudflare D1** stores beta data.
- **Cloudflare DNS** can point `app.equityforhumanity.org` to the app.

For a small trusted beta, this should usually fit within Cloudflare's free tiers, but Cloudflare can change limits/pricing. Do not add paid services unless the dashboard clearly says you are choosing a paid plan.

## What is already prepared in this repo

- `functions/api/[[path]].js` — Cloudflare backend API.
- `functions/_shared/cloudflare-store.js` — D1-backed prototype store.
- `wrangler.toml` — Cloudflare project config template.
- `src/App.tsx` — uses same-origin `/api/...` when `VITE_EFH_PRIVATE_BETA=true`.
- Private beta code support through `E4H_BETA_ACCESS_CODE`.

## One-time setup, plain-English version

### 1. Log into Cloudflare

Go to Cloudflare and log in with the account that owns the domain.

### 2. Create the D1 database

From this folder, run:

```bash
npx wrangler login
npx wrangler d1 create equity-for-humanity-private-beta
```

Cloudflare will print something like:

```toml
[[d1_databases]]
binding = "DB"
database_name = "equity-for-humanity-private-beta"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Copy the real `database_id` into `wrangler.toml`, replacing:

```text
REPLACE_WITH_CLOUDFLARE_D1_DATABASE_ID
```

You do not need to manually create tables. The API creates the `prototype_state` table automatically the first time it runs.

### 3. Create a Cloudflare Pages project

In Cloudflare dashboard:

1. Go to **Workers & Pages**.
2. Choose **Create application**.
3. Choose **Pages**.
4. Connect your GitHub repo.
5. Select the EFH repo.
6. Set the app folder/root to:

```text
prototype-app
```

7. Build command:

```bash
npm run build
```

8. Build output directory:

```text
dist
```

### 4. Add environment variables

In the Cloudflare Pages project settings, add:

```bash
VITE_EFH_PRIVATE_BETA=true
E4H_ALLOWED_ORIGINS=https://<your-pages-url>,https://app.equityforhumanity.org
```

Add this as a **secret**, not normal public text:

```bash
E4H_BETA_ACCESS_CODE=<choose-a-private-code-for-testers>
```

Example code format:

```text
<choose a private invite code>
```

Do not commit the real code to GitHub.

### 5. Bind the D1 database

In Cloudflare Pages settings, add a D1 binding:

```text
Variable/binding name: DB
D1 database: equity-for-humanity-private-beta
```

The function code expects the binding to be named exactly:

```text
DB
```

### 6. Add the custom domain

Once the Pages deployment works, add a custom domain:

```text
app.equityforhumanity.org
```

Cloudflare should guide you through this because your domain is already on Cloudflare.

### 7. Update the landing page button

After the hosted app URL works, update the main landing page button to:

```text
https://app.equityforhumanity.org
```

or temporarily to the Cloudflare Pages URL.

## Trusted tester message

Send testers only:

1. The app URL.
2. The private beta access code.
3. This warning:

> This is a private beta simulation. Please do not enter real payment information, real identity documents, real government-ID details, wallet keys, or anything sensitive. No real money, claims, payments, identity verification, or payouts happen in this beta.

## Local checks before pushing/deploying

Run:

```bash
npm run build
npm run lint
npm test
npm audit
```

## If you want me to deploy from your Mac

I can do the command-line parts after you log in through the browser popup created by:

```bash
npx wrangler login
```

But I should not invent or store your Cloudflare password/API token. You stay in control of the Cloudflare login.
