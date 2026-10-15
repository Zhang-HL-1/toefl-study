# Atrium

A quiet TOEFL vocabulary room. Ninety-six words live in eight themed rooms. Reviews use SM-2 (忘了 / 模糊 / 记得 / 很熟). Progress stays in this browser’s `localStorage` (`atrium.toefl.v1`) and keeps working with no account. Optional sync mirrors that JSON to a **secret GitHub Gist** on your own account — not the public `toefl-study` repo.

**Live:** https://zhang-hl-1.github.io/toefl-study/

## Run locally

```bash
npm ci
npm run dev
```

Open http://localhost:5173/toefl-study/

Production build:

```bash
npm run build
npm run preview
```

## GitHub Pages

`.github/workflows/pages.yml` runs `npm ci && npm run build` on every push to `main` and deploys `dist/` with `actions/deploy-pages`.

`vite.config.ts` sets `base: '/toefl-study/'`. The app uses `HashRouter`, so routes such as `/#/vocab` and `/#/room/library` work on Pages without a server rewrite.

## Sync across devices

Open **同步** (`/#/settings`). Create a classic personal access token with only the **gist** scope and paste it there. The token and gist id are stored in `atrium.sync.github.v1` on that browser. Nothing in this repository receives them.

On connect, the app looks for a secret gist that already contains `atrium-toefl-progress.json`. If none exists, it creates one with `public: false`. Another browser can connect with the same token (leave Gist ID empty to find that gist) or with the gist id / URL.

- Studying keeps writing `localStorage` first. About 1.5 seconds after a review, the current snapshot is uploaded.
- **立即同步** pulls the gist, merges, then uploads when the merge changed the gist.
- **拉取** merges the gist into this browser and does not upload.
- Without a token, the app never calls GitHub.

Merge rule: cards are the union of both sides. For a word on both sides, the later write wins (`updated`, else `lastReviewed`, else the latest event `at` for that word). A newer lapse beats an older long interval. Equal clocks prefer higher repetitions, then interval, then due, then the local card. Events are the union, de-duplicated, and capped at 2000.

The build job already succeeds on `main`. Publishing needs one repository setting this token cannot change:

1. Open https://github.com/Zhang-HL-1/toefl-study/settings/pages
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Re-run **Deploy GitHub Pages** from the Actions tab.

After that deploy, the site is at the URL above. Routes look like `https://zhang-hl-1.github.io/toefl-study/#/vocab`.
