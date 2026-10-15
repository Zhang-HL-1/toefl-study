# Atrium · TOEFL

A TOEFL vocabulary room built with React, TypeScript and Vite.

**Live:** https://zhang-hl-1.github.io/toefl-study/

## Vocabulary

All **11,767 numbered entries** from five user-provided PDFs are imported as **8,074 unique words and phrases**. Together with 20 original words absent from those PDFs, the app contains **8,094 entries**. Duplicate lemmas share learning progress and retain all distinct definitions and source references. Existing word IDs remain valid.

| Source | Original entries |
| --- | ---: |
| 托福词汇 | 4,262 |
| 7天搞定托福单词 | 2,061 |
| 托福词以类记2.0 | 4,124 |
| 托福真题核心词组 | 650 |
| 托福真题拓展词组 | 670 |

`src/data/sources.json` records the source filenames, page counts and expected numbered entries. `src/data/pdfWords.json` contains complete definitions and book/page/index references. No original PDF files are published in this repository.

To reproduce the import with the same source PDFs and PyMuPDF installed:

```bash
python scripts/import-pdf-words.py /path/to/pdfs
```

The importer checks every source's complete sequential numbering, validates word/definition matches on every page, joins wrapped phrases and normalizes compatibility characters.

## Practice and mistakes

- **随机练习** is the default. Uniformly choose among the least-reviewed words in the selected pool. Every word appears once per round; finishing a round makes all words eligible again. Avoid immediate repeats at round boundaries when alternatives exist. No daily new-word limit.
- Review counts resume unfinished rounds after refresh and across synced devices. Practice in overlapping source books shares the same word's progress.
- **错词练习** uses the same randomized rounds over words with recorded errors. **到期复习** retains the original SM-2 schedule.
- **忘了** adds one error. **模糊** adds a separate fuzzy count. Every rating adds one review.
- Per-word review/error/fuzzy totals persist for the lifetime of the progress, independently of the detailed review history's 2,000-event limit.
- The statistics page has a searchable mistake list sorted by error count. Source-book lists show every word's counts and support error filtering, search and pagination.

## Automatic cross-device sync

Each browser initially saves progress offline in `localStorage` (`atrium.toefl.v1`). On **同步**, connect a classic GitHub personal access token with **gist** permission on each device, using the same GitHub account. Leave Gist ID blank to discover existing progress, or enter the same secret Gist ID explicitly. This initial connection is required on each browser.

After connecting:

- Ratings schedule pull/merge/push after about 1.5 seconds.
- Returning to the page, restoring the network, and every 30 seconds while visible trigger another sync.
- Network failures retain local progress and retry on the next automatic trigger.
- The settings and practice pages show sync state and failures. Wait for completion before closing a page with recent reviews.

The initial `atrium-toefl-progress.json` is retained as a legacy baseline. Each browser writes its own `atrium-device-<id>.json` snapshot in the same secret Gist; readers merge all snapshots. This prevents concurrent devices from overwriting one another's only copy. Per-writer monotonic review/error/fuzzy counters merge by maximum for the same writer and sum across writers, making repeated sync idempotent and preserving offline increments from different devices. Card schedules still use their latest write clocks. Detailed events merge by unique ID (legacy events use word/timestamp/grade), capped at 2,000. Existing lapse counts migrate into a shared baseline without duplicating them; old review/fuzzy totals can only be reconstructed from retained history and card state.

Tokens stay only in that browser's `atrium.sync.github.v1`. They are never included in progress JSON or this public repository. Secret Gists are unlisted; anyone possessing their URL can read them.

Clearing local progress disconnects that browser and keeps cloud data. Reconnecting can restore the merged cloud progress.

## Development and verification

```bash
npm ci
npm test
npm run dev
npm run build
```

Open http://localhost:5173/toefl-study/. `npm test` verifies complete PDF references, unique IDs, resumed random rounds, legacy progress migration, idempotent counter merges, concurrent-device counts and offline/reconnect synchronization against a mocked GitHub API.

`.github/workflows/pages.yml` builds, verifies and deploys `dist/` to GitHub Pages on pushes to `main`. Vite uses `base: '/toefl-study/'` and HashRouter supports direct routes such as `/#/vocab`.
