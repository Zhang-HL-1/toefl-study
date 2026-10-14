# Atrium

A quiet TOEFL vocabulary room. Ninety-six words live in eight themed rooms. Reviews use SM-2 (忘了 / 模糊 / 记得 / 很熟), and progress stays in this browser’s `localStorage`.

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

If the site is not published yet, open **Settings → Pages → Build and deployment → Source: GitHub Actions**, then re-run the **Deploy GitHub Pages** workflow.
