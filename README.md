# Equity for Humanity

Equity for Humanity is a proposed permanent public-benefit fund designed to help every human being share in a growing portion of global prosperity through universal ownership.

This repository contains two connected surfaces:

- The public concept site at `equityforhumanity.org` (`index.html`, `about.html`, published by GitHub Pages).
- The one canonical interactive fictional prototype in `prototype-app/` (React/Vite plus a local Node API).

The landing page links to a separate Cloudflare Pages private-beta project. That project has no Git provider, so a GitHub push updates the public concept site but does not deploy the app. Treat the current local worktree as newer than the hosted beta until a direct Cloudflare deployment is explicitly approved and verified.

The prototype remains simulated only: no real money, identity proof, payments, wallets, benefits, claims, settlement, or sensitive-data entry.

## Updating the site

1. Edit `index.html`, `about.html`, and/or `assets/site.css` locally.
2. Commit the change.
3. Push to GitHub.
4. GitHub Pages publishes the updated brochure automatically from the `main` branch. This does **not** deploy `prototype-app/` to Cloudflare.

Preview the brochure without Cloudflare: open the HTML files locally, or run a static server from the repo root (`python3 -m http.server 4173`) and visit `http://127.0.0.1:4173/`.

## Running the canonical prototype

```bash
cd prototype-app
npm run dev
```

This starts the frontend at `http://127.0.0.1:5177/` and the local API at `http://127.0.0.1:8787/`. The local saved-data file is private and ignored; do not publish it as application source.

That local command uses the Node/JSON (or optional Postgres) store. It is not the Cloudflare Pages Functions + D1 path.

## Public brochure vs Cloudflare app

GitHub Pages is the brochure. Cloudflare Pages is the hosted fictional private-beta app. They are not the same deploy.

| Surface | How it goes live | This repo push |
| --- | --- | --- |
| `index.html`, `about.html` | GitHub Pages from `main` | Updates the public site |
| `prototype-app/` | Separate Cloudflare Pages project `equity-for-humanity-private-beta` | Does **not** deploy |

Do not run `wrangler pages deploy` (or any production Cloudflare publish) unless a hosted-beta update is explicitly approved. This repository must not contain private data, `.env` files, or the beta access-code secret.

### Preview the app (still not production)

1. Local fictional app: `cd prototype-app && npm run dev` (JSON store, no D1).
2. Optional Cloudflare Functions preview, after `npm run build`: `npx wrangler pages dev dist` from `prototype-app/`. That is local preview only. It is not a production deploy.
3. Hashed Cloudflare Pages preview URLs (`https://<hash>.…pages.dev`) and Workers Playground origins are **not** in `E4H_ALLOWED_ORIGINS`. Whether to allow them is still an open preview/playground policy.

### Already wired on main (do not regress)

- Fictional demo password `Test123#` remains accepted for seed logins.
- Durable D1 sessions (`prototype_sessions`) so auth survives isolate restarts.
- Compare-and-swap snapshot writes (`revision` + `mutateSnapshot`) so concurrent writers cannot clobber state.

### Remaining blockers before any hosted Cloudflare update

- The Cloudflare Pages project still has no Git provider; a GitHub merge never publishes the app.
- `E4H_BETA_ACCESS_CODE` must stay a Cloudflare Pages **secret**, not a git value.
- CORS is limited to `https://app.equityforhumanity.org` and the stable `https://equity-for-humanity-private-beta.pages.dev` host. Preview-hash and playground origins are omitted until that policy is decided.
- `prototype-app/vercel.json` is leftover and is not a deploy path.
- Local `npm run dev` will not catch D1/session/CORS host issues that only appear on Pages Functions.
- No production deploy should be performed from a brochure-only change.

## Notes

Project documents are organized under `docs/`:

- `docs/current/` — current concept brief, Word doc, and philosophy/scale note.
- `docs/planning/` — app prompts and next-step planning.
- `docs/setup/` — account and GitHub Pages setup notes.
- `docs/archive/` — older document versions and timestamped local backups.

The public repository intentionally excludes most private working notes and operational documentation.

Current key mechanism language: “When shared prosperity grows faster, people share more. When growth slows, the fund protects the future.”
