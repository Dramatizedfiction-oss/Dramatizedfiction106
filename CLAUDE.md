# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Dramatized Fiction — a serialized fiction reading/publishing platform (readers, writers, Board, CEO). Next.js 14.1 App Router + React 18 + TypeScript (strict) + Prisma 6 on PostgreSQL (Neon), deployed on Vercel. Product/design direction lives in `PROJECT_CONTEXT.md`.

## Commands

```bash
npm run dev              # next dev on :3000
npm run build            # next build (also the only type/compile check — there is no test suite)
npm run lint             # next lint — no ESLint config is committed, so the first run prompts interactively
npx prisma generate      # runs automatically on postinstall
npx prisma db push       # how the schema has actually been applied (see Database below)
npx prisma migrate dev   # npm run prisma:migrate
```

There are no tests. Both `package-lock.json` and `pnpm-lock.yaml` are committed; npm is what README documents.

On this machine `git` is not on PATH; GitHub Desktop's bundled git works: `$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe`.

Environment variables: see `.env.example`. `.env` is gitignored (it was previously committed; credentials have since been rotated — never re-add it). `next-auth`, `@auth/prisma-adapter`, `@neondatabase/neon-js`, `nodemailer` and the `NEXTAUTH_*`/`DEV_CEO_*` env vars are installed/present but unused by current code.

## Architecture

**Auth is custom, not NextAuth.** `auth.ts` (repo root) implements DB-backed sessions: random token in the `Session` table, httpOnly cookie `df.session-token` (`__Secure-df.session-token` in production), 30-day expiry. `auth()` hits the DB on every call (no request cache; layout and page each call it). Passwords are scrypt `salt:hash` (`lib/auth-utils.ts`). Routes: `app/api/auth/{register,login,logout,me,validate}`. Client state comes from `components/providers/AuthSessionProvider.tsx` (seeded by the root layout, refreshed via `/api/auth/me`).

**Roles** are hierarchical `READER < WRITER < BOARD < CEO` (`lib/auth/roles.ts`, re-exported by `lib/roles.ts`); `hasRoleAccess(role, "WRITER")` is true for BOARD/CEO too. Legacy DB values AUTHOR/ADMIN normalize to WRITER/BOARD. READER→WRITER is instant self-service via `/become-author` → `POST /api/become-author` → `lib/author-onboarding.ts`. BOARD/CEO are only assignable by editing the DB.

**Where authorization actually happens:**
- `middleware.ts` only checks that a session cookie *exists* (it ignores `minimumRole` in `lib/auth-route-guards.ts`) and redirects legacy `/writer/*` → `/writer-studio/*` (so everything under `app/writer/` is unreachable dead code).
- Real checks are server-side: `requireRole` / `requireWriterStudioAccess` in `lib/utils.ts`, called in pages, the `app/writer-studio/layout.tsx`, and API routes. `requireRole` uses `redirect()`, so in API routes failures become a 307 to an HTML page rather than 401/403.
- Ownership (`authorId === session.user.id`) is only enforced in `app/api/writer-studio/*`. The older `app/api/series/*` and `app/api/episodes/*` routes lack ownership checks and their GETs return drafts/locked bodies — the UI does not call them; prefer the writer-studio routes and don't build on the legacy ones.

**Data flow.** No service layer: server components query `prisma` (`lib/prisma.ts` singleton) directly, and client components mutate via `fetch` to `app/api/*` route handlers (no server actions). The root `app/layout.tsx` runs on every request: `auth()`, published-series/author queries for the sidebar search and trending list, and `ensureUserStudioAccess` (`lib/studios.ts`), which upserts AuthorProfile/Studio/StudioMembership rows for writers. The episode reader page (`app/episode/[episodeId]/page.tsx`) increments `readerCount`/`series.reads` and writes `ReadEvent` + `RevenueEvent` rows during render.

**Writer Studio.** The real editor is `components/writer-studio/WriterStudioWorkspace.tsx` (rendered by `app/writer-studio/page.tsx`): series + episode metadata and a `contentEditable` manuscript with `document.execCommand` formatting, debounced autosave to `PATCH /api/writer-studio/{series,episodes}/[id]`, plus a localStorage draft copy. Publishing is `app/writer-studio/publish/[episodeId]` → `POST /api/writer-studio/episodes/[id]/publish` (also marks the series PUBLISHED). Episode bodies are stored as HTML; the reader strips tags to plain paragraphs. Pages like characters, media, scheduling, analytics, settings, wip-projects, `editor`, and `new-episode` are placeholders backed by mock data in `lib/writer-studio.ts`.

**AI usage labels** (the only "AI" feature — there is no AI integration). Prisma enum `AI_FREE | AI_CORRECTED | AI_HEAVY | AI_WRITTEN`; the UI uses the spaced form (`"AI HEAVY"`). Convert with `serializeAiUsageTag` / `deserializeAiUsageTag` in `lib/ai-usage.ts` — `serializeAiUsageTag` only recognises the spaced form and falls back to AI_FREE for anything else, so always deserialize DB values before they reach a form.

**Monetization / phases — dormant, do not activate.** A single `Settings` row (`lib/phases.ts`, `getPlatformSettings`) holds `phaseTwoUnlocked`/`enablePayments` (Phase 2: Stripe) and `phaseThreeUnlocked`/`enableAds` (Phase 3: ads). `isPhaseTwoActive()` / `isPhaseThreeActive()` gate `app/api/payments/*` and `app/api/ads/impression`. CEO toggles them in `/ceo/settings` → `PATCH /api/settings`; unlocking is one-way. Access logic in `lib/monetization.ts` always treats the viewer as having no purchases/subscription; components in `components/monetization/` are disabled previews. No checkout, subscription, or payout flow exists. Episode `locked: true` therefore makes an episode unreadable by everyone. Transition-ad pacing is client-side (`lib/ad-transition.ts`, sessionStorage) and does not gate content server-side.

**Other surfaces:** `/ceo/*` (CEO: dashboard, settings, users list, analytics; `app/ceo/revenue/route.ts` is a route handler), `/command-center` (BOARD placeholder), `/write-with-us` (onboarding copy from `CmsArticle` via `lib/cms.ts`), `/goal` (monthly ReadEvent meter). Follow-author is localStorage-only; comments, ratings, library, and reading progress do not exist.

## Database

`prisma/schema.prisma` is the source of truth, but only one migration exists (`prisma/migrations/…_app_roles_writer_flow`, the READER/WRITER/BOARD/CEO enum rename). Everything else was applied with `db push`, and production has drifted from the schema before (e.g. a missing `Series.aiUsageTag` column). Create a migration baseline before introducing schema changes, and never flip the live `Settings` phase flags. Models `UserStats`, `AuthorPayout`, `Subscription`, `Book`, `Account`, `VerificationToken` are unused; `Studio`/`StudioMembership` are populated but barely consumed.

## Styling

Tailwind plus CSS-variable tokens in `app/globals.css` (`--bg-primary`, `--text-primary`, `--border-color`, etc., redefined under `.dark`) and component classes (`theme-heading`, `theme-meta`, `theme-panel`, `story-button-primary/secondary`, `eyebrow`, `studio-*`, `reader-paper`, `reading-body`). `<html>` is rendered with `class="dark"`; `AppShell` swaps it from localStorage `df-theme`. Prefer the tokens/classes — several pages (CEO pages, `/goal`, `/settings`) still hard-code `slate-*` colors. The global shell is `components/app-shell/AppShell.tsx` + `AppSidebar.tsx`; the reader route `/episode/*` hides it in favor of `ReaderChrome`.

## Product Rules and Implementation Direction

**Source of truth.** This repo (`Dramatizedfiction106`) is production and owns the database, Prisma schema, auth, authorization, APIs, business logic, permissions, analytics, publishing, monetization infrastructure, phase gates, and security. The Beta Base44 project is a design/UX reference only: never merge it, never import the Base44 SDK, auth, or database logic, never blindly copy its routes or API calls, and never create a second architecture. Reproduce Beta's successful visuals, layouts, and interactions on top of production data, and consolidate duplicate production components while doing so. Production functionality always wins over Beta assumptions.

**Vision.** A cinematic, premium, streaming-style platform for serialized fiction (think Netflix / Disney+ / Max, not a blog or book site). Visual similarity never justifies weakening security or data integrity.

**Roles** (`READER → WRITER → BOARD → CEO`; CEO is the highest authority).
- Only server-side checks grant access; the UI is never a security boundary.
- Only approved/authorized writers may publish. Today promotion is self-service and there is no approval step; that is a gap to close, not a pattern to extend.
- Board handles author approval and any other admin duties explicitly granted to it, but never CEO-only Inner Sanctum access.
- Board is capped at 6 members, and only the CEO promotes or demotes Board members.
- Do not invent permissions that are not defined here.

**Command Center.** The eventual CEO admin experience is the "Command Center". It should be mature and cinematic, not a toy dashboard. It has two areas:
- General controls: site/content management, newsletter and writer communication, author approvals, analytics, payments/tax tools once monetization is active, and platform configuration.
- CEO-only Inner Sanctum: Phase/Level activation, Board promotion/demotion, and other CEO-exclusive controls.

Today `/ceo/*` holds the CEO tools and `/command-center` is a BOARD placeholder, so expect consolidation.

**Phases / Levels.** Phase 2 (monetization) and Phase 3 (ads) are NOT active. Never activate them, flip their flags, or bypass or weaken backend phase gates unless explicitly instructed. Preserve the existing gated infrastructure. Intended visibility:
- Readers: Level 1 only. No Level 2 monetization UI and no Level 3 ad UI.
- Writers: Level 1, plus optional tasteful grayed-out Level 2 previews. Nothing functional.
- CEO: eventually activates levels from the Inner Sanctum.
- Future levels stay hidden until intentionally designed.

Current code shows monetization preview cards to readers (series/episode pages, `/watch-ad`); these should be hidden for readers.

**Frontend.** One design system of shared components and tokens, with no per-page visual systems.
- Theme: dark by default, with a light/dark switch in Settings. Both modes must be highly readable.
- Global shell: a collapsible sidebar with a clear expand/retract control, profile/account controls in the upper-right, and role-aware navigation.

**Reader experience.**
- Journey: Home → Explore → Series → Start/Continue → Episode Reader → Progress → Next Episode → Continue.
- Home: cinematic hero, Continue Reading, Recommended For You, Trending, New Releases, Recently Updated, and genre rows.
- Explore: streaming-style discovery.
- Series cards: rectangular and cinematic, with teaser and episode info.
- Series preview/modal: artwork, title, description, author, genres/AI labels, episode count, seasons (when they exist), episode previews, read/unread state, and a Start/Continue action.
- Never fake features that lack backend support, such as ratings, comments, progress, or seasons.

**Writer Studio.** Should become a professional writing studio: series and episode management, rich text editing, publishing, analytics, writer profile, and later media uploads and editorial assistance. Only the owning writer (or an authorized admin) may edit an episode. Evolve the existing `WriterStudioWorkspace` rather than rewriting it.

**Author profiles.** Public profiles show identity, image/background, bio, published works, intentionally public WIP, series cards, appropriate stats, and supported social links. Private writer analytics stay separate from the public profile, and drafts are never public.

**Reader data and analytics.** The target loop is reading → progress → completion → discovery → recommendations → continued reading. Read counts must reflect real activity, so they must not be inflated by:
- duplicate events
- excluded author self-reads
- render-time side effects
- refreshes

Derive analytics from reliable events, not UI guesses.

**AI / "Drama Queen".** No live AI service exists, so never pretend one does. AI usage labels are metadata only. A future editorial assistant, "Drama Queen", may help with spelling/grammar, readability, plot-hole suggestions, restructuring, reading-time estimation, and presentation. It must never silently overwrite the manuscript. The original and any reading-optimized version must stay distinguishable, and substantive changes require author approval.

**Monetization (future, inactive).**
- Phase 2: locked episodes/series, direct purchases, subscriptions, author payouts, Stripe Connect, and subscription revenue distribution.
- Phase 3: advertising and discovery monetization.
- Never build fake payment behavior to make the UI look functional.

**Engineering process.** For every major change:
1. Inspect first.
2. Explain the intended change.
3. Make the smallest safe change.
4. Test it.
5. Review the result.
6. Only then move to the next work package.

Prefer incremental improvement to rewrites, and preserve working functionality unless there's a clear reason to replace it. Priority order: security, authorization, data integrity, accessibility, and performance all come before visual polish. Explain why before any broad architectural change, never activate dormant functionality, and never invent backend capabilities.

**Master implementation order.** This order may adapt when dependencies surface, but foundational security and data-integrity work must never be skipped to start the redesign.
1. Repository/security cleanup
2. Backend authorization and ownership
3. Data-integrity fixes
4. Production stabilization/build verification
5. Reviewed removal of dead code
6. Shared design system
7. Global shell/navigation/theme
8. Auth UX
9. Home
10. Explore
11. Series
12. Reader
13. Author profiles
14. Library/search/discovery
15. Writer Studio
16. Rich editor and reading-time improvements
17. Command Center
18. Phase/Level controls
19. Monetization
20. Advertising
21. Final security/performance/accessibility audit
