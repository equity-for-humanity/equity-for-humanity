# Equity for Humanity

Equity for Humanity is a proposed permanent public-benefit fund designed to help every human being share in a growing portion of global prosperity through universal ownership.

This repository contains two connected surfaces:

- The public concept site at `equityforhumanity.org` (`index.html`, published by GitHub Pages).
- The one canonical interactive fictional prototype in `prototype-app/` (React/Vite plus a local Node API).

The landing page links to a separate Cloudflare Pages private-beta project. That project has no Git provider, so a GitHub push updates the public concept site but does not deploy the app. Treat the current local worktree as newer than the hosted beta until a direct Cloudflare deployment is explicitly approved and verified.

The prototype remains simulated only: no real money, identity proof, payments, wallets, benefits, claims, settlement, or sensitive-data entry.

## Updating the site

1. Edit `index.html` locally.
2. Commit the change.
3. Push to GitHub.
4. GitHub Pages publishes the updated site automatically from the `main` branch.

## Running the canonical prototype

```bash
cd prototype-app
npm run dev
```

This starts the frontend at `http://127.0.0.1:5177/` and the local API at `http://127.0.0.1:8787/`. The local saved-data file is private and ignored; do not publish it as application source.

## Notes

Project documents are organized under `docs/`:

- `docs/current/` — current concept brief, Word doc, and philosophy/scale note.
- `docs/planning/` — app prompts and next-step planning.
- `docs/setup/` — account and GitHub Pages setup notes.
- `docs/archive/` — older document versions and timestamped local backups.

The public repository intentionally excludes most private working notes and operational documentation.

Current key mechanism language: “When shared prosperity grows faster, people share more. When growth slows, the fund protects the future.”
