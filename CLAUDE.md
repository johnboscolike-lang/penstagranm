# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

pen스타그램 — a classroom-focused Instagram clone where every post has exactly four fixed photo slots. Korean is the primary product language (UI strings, seed data, commit messages). See `AGENTS.md` and `docs/PRD.md` for product rules; this file focuses on what is needed to work in the code.

## Commands

```bash
npm install              # also runs `prisma generate` via postinstall
npm run db:push          # create SQLite schema (runs scripts/init-db.mjs, NOT `prisma db push`)
npm run db:seed          # seed demo data via tsx prisma/seed.ts
npm run dev              # Next.js dev server on :3000
npm run build
npm run start
npm run lint             # eslint . (extends eslint-config-next)
npm run test             # vitest run --coverage (one-shot; CI mode)
npm run test:watch       # vitest watch
npx vitest run src/tests/post-validation.test.ts   # run a single test file
npx vitest -t "slot"     # run tests matching a name
```

`npm run publish -- -Message "..."` is a Windows PowerShell helper (`scripts/auto-publish.ps1`) that runs tests, adds all, commits, and pushes the current branch. It only runs on Windows — do not invoke it from Linux/macOS sessions.

## Architecture

Next.js **pages router** (not the app router) + TypeScript + Prisma/SQLite + Vitest (jsdom). Path alias: `@/*` → `src/*`.

### The four-slot invariant

The hard product rule is that every post carries exactly four photos, one per slot, in a fixed order: `prep` → `goal` → `notes` → `assignment`. This invariant is encoded in three layers that must stay in sync:

- `prisma/schema.prisma` — `PhotoSlot` enum + `@@unique([postId, slot])` on `PostPhoto`.
- `src/utils/slot-metadata.ts` — `PHOTO_SLOT_KEYS` / `PHOTO_SLOT_META` define the canonical lowercase keys, Korean labels, accent classes, and ordering. `sortPhotosBySlot` is the only sort used before rendering.
- `src/utils/repository.ts` — `SLOT_TO_PRISMA` / `PRISMA_TO_SLOT` maps between the lowercase UI keys and the uppercase Prisma enum values.

When adding or changing a slot, all three places must be updated together, plus the upload field names (`photo-<slot>`), the validator (`src/utils/post-validation.ts` checks `uniqueSlots.size === PHOTO_SLOT_KEYS.length`), and the seed.

### Request path for a new post

1. `PostComposer` posts `multipart/form-data` with one file field per slot (`photo-prep`, `photo-goal`, …) to `/api/posts`.
2. `src/pages/api/posts.ts` disables the default body parser (`config.api.bodyParser = false`) and delegates to `parsePostMultipartRequest` (`src/utils/upload.ts`), which uses `formidable` to write files into `public/uploads/` with a `Date.now()`-prefixed slugged filename and returns `imageUrl` as a `/uploads/...` relative path.
3. `validatePostDraft` (Zod) checks required text fields and that all four slot keys are present.
4. `createPost` in `src/utils/repository.ts` writes the `Post` + nested `PostPhoto` rows and returns a `PostView` (Prisma records go through `mapPostRecord` → `mapPhotoRecord` / `mapCommentRecord` so dates become ISO strings and photos are sorted).

API routes: `src/pages/api/{posts,comments,schedule}.ts`. All three follow the same shape — Korean error messages, scoped logger, repository call.

### Database

SQLite via Prisma. `npm run db:push` does **not** call `prisma db push`; it runs `scripts/init-db.mjs` which uses the built-in `node:sqlite` module to create `prisma/dev.db` with a hand-written DDL that mirrors `schema.prisma`. If you change the Prisma schema, update `scripts/init-db.mjs` to match. `DATABASE_URL` must point at the same file (typically `file:./prisma/dev.db`).

### Recorder

`LessonRecorder` uses `MediaRecorder` for audio plus the browser `SpeechRecognition` API (with `webkitSpeechRecognition` fallback) for live Korean transcription. `detectRecorderSupport` in `src/utils/recorder-support.ts` is the single source of truth for feature detection — browsers missing either API must still allow manual transcript editing, so keep the non-supported path functional.

### Logger

Never use `console.log`. Always go through `createScopedLogger("<scope>")` from `src/utils/logger.ts` so messages are emitted as structured JSON with scope and timestamp. Use `logger.error` for caught errors in API handlers.

### Testing

Vitest is configured in `vitest.config.ts` with `environment: "jsdom"`, `globals: true`, and `vite-tsconfig-paths` so `@/` imports work. Tests live under `src/tests/**/*.test.ts[x]`; coverage tracks `src/components/**/*.tsx` and `src/utils/**/*.ts`. Prefer testing the pure utilities (`post-validation`, `calendar`, `recorder-support`) — the API routes and Prisma layer are not currently under test.

## Conventions

- JSDoc on every exported function (the existing code is consistent about this; keep it so).
- Korean is the default for UI copy, error messages returned from API routes, and commit messages.
- Uploads go to `public/uploads/`; store only the `/uploads/<file>` relative path in the DB.
- Keep the calendar experience single-page — date selection and schedule creation both happen on `src/pages/calendar.tsx`.
