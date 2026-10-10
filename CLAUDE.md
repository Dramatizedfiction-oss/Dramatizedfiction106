# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Dramatized Fiction — a serialized fiction reading/publishing platform (readers, writers, Board, CEO). Next.js 14.1 App Router + React 18 + TypeScript (strict) + Prisma 6 on PostgreSQL (Neon), deployed on Vercel. Product/design direction lives in `PROJECT_CONTEXT.md`.

## Commands

```bash
npm run dev                # next dev on :3000 (uses .env.local over .env, so the scratch-copy DB)
npm run build              # next build
npm run lint               # next lint — no ESLint config is committed, so the first run prompts interactively
npm test                   # unit tests: node --test (Node 24 strips TS; tests/setup resolves "@/")
npm run test:integration   # DB + HTTP tests on the .env.local scratch copy only (needs `npm run dev` running)
npm run db:dev:verify      # prove .env.local's DATABASE_URL is not the main DB; changes nothing
npm run db:dev:check       # read-only: connect, list tables/row counts and migration history (scratch copy)
npm run db:dev:status      # prisma migrate status against the scratch copy
npm run db:dev:migrate     # prisma migrate deploy against the scratch copy
npx prisma generate        # runs automatically on postinstall
```

The Prisma CLI (`npx prisma …`) reads `.env`, the **main** database, which is where schema changes go (see "Working rule" below). The `db:dev:*` scripts (`scripts/db-dev.mjs`) target the `.env.local` scratch copy, refuse to run if it names the same database as `.env`, and block destructive commands (`migrate reset`, `migrate dev`, `db push`, `--force-reset`, `--accept-data-loss`). Both `package-lock.json` and `pnpm-lock.yaml` are committed; npm is what README documents.

On this machine `git` is not on PATH; GitHub Desktop's bundled git works: `$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe`.

Environment variables: see `.env.example`. `.env` (main DB) and `.env.local` (scratch-copy DB, `CEO_PASSWORD`) are gitignored via `.env.*` — never commit either. `CEO_PASSWORD` is server-only (never `NEXT_PUBLIC_`); if missing or under 12 characters, every CEO-password action fails closed. `next-auth`, `@auth/prisma-adapter`, `@neondatabase/neon-js`, `nodemailer` and the `NEXTAUTH_*`/`DEV_CEO_*` env vars are installed/present but unused by current code (`DEV_CEO_*` should be deleted).

## Architecture

**Auth is custom, not NextAuth.** `auth.ts` (repo root) implements DB-backed sessions: random token in the `Session` table, httpOnly cookie `df.session-token` (`__Secure-df.session-token` in production), 30-day expiry. `auth()` hits the DB on every call (no request cache; layout and page each call it). Passwords are scrypt `salt:hash` (`lib/auth-utils.ts`). Routes: `app/api/auth/{register,login,logout,me,validate}`. Client state comes from `components/providers/AuthSessionProvider.tsx` (seeded by the root layout, refreshed via `/api/auth/me`).

**Roles** are hierarchical `READER < WRITER < BOARD < CEO` (`lib/auth/roles.ts`, re-exported by `lib/roles.ts`); `hasRoleAccess(role, "WRITER")` is true for BOARD/CEO too. Legacy DB values AUTHOR/ADMIN normalize to WRITER/BOARD. READER→WRITER is instant self-service via `/become-author` → `POST /api/become-author` → `lib/author-onboarding.ts`. BOARD/CEO are assigned by a CEO in Administration → Members (CEO session + `CEO_PASSWORD`, `lib/admin/roles-service.ts`): max 6 Board, never fewer than 1 CEO, both enforced under an advisory lock.

**Where authorization actually happens:**
- `middleware.ts` only checks that a session cookie *exists* for protected prefixes (it ignores `minimumRole` in `lib/auth-route-guards.ts`), redirects legacy `/writer/*` → `/writer-studio/*`, and sets the `x-df-pathname` request header (overwriting any incoming value) for the root layout.
- Real checks are server-side. Pages: `requireRole`, `requireWriterStudioAccess`, `requireAdministrationPage`, `requireCEOPage` in `lib/utils.ts` (redirect on failure). APIs: `requireApiUser` / `requireApiRole` / `requireApiCEO` / `requirePlatformOpen` in `lib/auth/guards.ts` (JSON 401/403/503).
- `auth()` also loads the member's active restriction (ban / discipline, `MemberRestriction`). `requireApiUser` refuses restricted members (403 `ACCOUNT_RESTRICTED`) and, during Renovation Mode, anyone below Board (503 `RENOVATION`); the page guards send restricted members to `/account-restricted`. The root layout renders the renovation page or the suspension notice instead of the app when those apply. Only `/api/auth/{me,validate}` may call `auth()` directly in an API route (a unit test enforces this).
- Ownership (`authorId === session.user.id`) is only enforced in `app/api/writer-studio/*`. The older `app/api/series/*` and `app/api/episodes/*` routes lack ownership checks and their GETs return drafts/locked bodies — the UI does not call them; prefer the writer-studio routes and don't build on the legacy ones.

**Data flow.** No service layer: server components query `prisma` (`lib/prisma.ts` singleton) directly, and client components mutate via `fetch` to `app/api/*` route handlers (no server actions). The root `app/layout.tsx` runs on every request: `auth()`, published-series/author queries for the sidebar search and trending list, and `ensureUserStudioAccess` (`lib/studios.ts`), which upserts AuthorProfile/Studio/StudioMembership rows for writers. The episode reader page (`app/episode/[episodeId]/page.tsx`) increments `readerCount`/`series.reads` and writes `ReadEvent` + `RevenueEvent` rows during render.

**Writer Studio.** The real editor is `components/writer-studio/WriterStudioWorkspace.tsx` (rendered by `app/writer-studio/page.tsx`): series + episode metadata and a `contentEditable` manuscript with `document.execCommand` formatting, debounced autosave to `PATCH /api/writer-studio/{series,episodes}/[id]`, plus a localStorage draft copy. Publishing is `app/writer-studio/publish/[episodeId]` → `POST /api/writer-studio/episodes/[id]/publish` (also marks the series PUBLISHED). Episode bodies are stored as HTML; the reader strips tags to plain paragraphs. Pages like characters, media, scheduling, analytics, settings, wip-projects, `editor`, and `new-episode` are placeholders backed by mock data in `lib/writer-studio.ts`.

**AI usage labels** (the only "AI" feature — there is no AI integration). Prisma enum `AI_FREE | AI_CORRECTED | AI_HEAVY | AI_WRITTEN`; the UI uses the spaced form (`"AI HEAVY"`). Convert with `serializeAiUsageTag` / `deserializeAiUsageTag` in `lib/ai-usage.ts` — `serializeAiUsageTag` only recognises the spaced form and falls back to AI_FREE for anything else, so always deserialize DB values before they reach a form.

**Monetization / phases — dormant, do not activate.** A single `Settings` row (`lib/phases.ts`, `getPlatformSettings`) holds `phaseTwoUnlocked`/`enablePayments` (Phase 2: Stripe) and `phaseThreeUnlocked`/`enableAds` (Phase 3: ads). `isPhaseTwoActive()` / `isPhaseThreeActive()` gate `app/api/payments/*` and `app/api/ads/impression`. They change only through CEO Studio (`/ceo-studio/phases/[2|3]` → `POST /api/ceo/phases/[phase]/activate`: CEO session + `CEO_PASSWORD` + every requirement in `lib/ceo/phase-readiness.ts`). Both phases are blocked today by the `PHASE_IMPLEMENTATION` flags (no checkout, paid access, payouts, ad provider, ad accounting) — flip one only when that piece is really built. Activation is one-way. Access logic in `lib/monetization.ts` always treats the viewer as having no purchases/subscription; components in `components/monetization/` are disabled previews. No checkout, subscription, or payout flow exists. Episode `locked: true` therefore makes an episode unreadable by everyone. Transition-ad pacing is client-side (`lib/ad-transition.ts`, sessionStorage) and does not gate content server-side.

**Administration and CEO Studio** (the only two admin areas). `/administration` (BOARD + CEO): members (search, bans, one-month discipline, Board/CEO roles for the CEO), analytics (`lib/admin/analytics.ts`, real counts only; page views are not tracked), avatar library + Reader/Writer defaults (served via `/api/avatars/default/[kind]`), Renovation Mode (CEO toggles), onboarding content. `/ceo-studio` (CEO only): Phase 2/3 activation. Rules are pure functions in `lib/admin/policy.ts`; services in `lib/admin/*-service.ts`; sensitive actions write `AdminAuditLog`. `/command-center` and the old `/ceo/{users,analytics,settings}` pages redirect (next.config.js); `app/ceo/revenue/route.ts` is still a CEO-only route handler.

**Other surfaces:** `/write-with-us` (onboarding copy from `CmsArticle` via `lib/cms.ts`), `/goal` (monthly ReadEvent meter). **Follows are two separate things.** Following a *series* is real: `SeriesFollow` rows via `PUT`/`DELETE /api/me/follows/[seriesId]` (`lib/series-follows.ts`, `components/follow/FollowSeriesButton.tsx` on the series page), and the member's Library is `GET /api/me/follows` / the Library tab of `/reader` (published series only; unpublished ones are hidden, not unfollowed). `Series.followers` equals the row count, maintained by the `SeriesFollow_count` database trigger; never write it in code. Following an *author* is still localStorage-only (`FollowAuthorButton`, author pages only). `/reader` is every member's own reading profile ("Profile" in the account menu, writers included); others see it only by direct link at `/reader/[id]` (noindex): the header (picture, banner, name, bio) always, the content (Library…) only when `User.readingProfileVisibility` is `PUBLIC` (default `PRIVATE`). Author pages are always public; a writer's author page is linked from Writer Studio. **Profile editing** (bio, links, picture, banner, visibility) happens in `components/profile/ProfileEditor.tsx`, opened by the owner's pen button on `/reader` and on their author page. **Settings** (`/settings`) is a short list of arrow cards, each its own page, showing only sections that work: **Account** (`/settings/account`: read-only email; display name via `PATCH /api/me/account/name`, 2–40 chars, also updates `AuthorProfile.displayName`; voluntary 18+ via `POST /api/me/account/age`, which checks a date of birth server-side and stores only `User.ageConfirmedAt` + `ageConfirmationVersion`, never the birthdate, and nothing is gated on it yet; change password via `POST /api/me/account/password`, which signs out every other session; and **Delete account** at `/settings/account/delete` → `DELETE /api/me/account`: password + typed DELETE, immediate, cascades the member's series/episodes/follows/sessions, removes their personal studio, refuses the last CEO under the role-change advisory lock), **Reading & Appearance** (`/settings/reading`: theme plus text size, line spacing, reading width and reduce-motion, saved on the device under `df-reading` by `lib/reading-prefs.ts` and applied pre-paint as `data-reading-*` / `data-reduce-motion` on `<html>`; size/spacing/width affect `.reader-column`, i.e. the episode reader and Studio preview), and **About & Help** (`/about`, `/ai-usage`; Terms/Privacy/Guidelines/Contact pages don't exist yet). Logic lives in `lib/account-rules.ts` (pure) and `lib/account-service.ts`. Email change and password reset don't exist (no email sending). The profile picture is chosen from the Administration avatar library (`PlatformAvatar`, `GET /api/avatars/library`) or the role default; `PATCH /api/me/profile-images` refuses any other picture URL and never deletes library images; removing a library avatar resets members using it to the default. Banners are still uploads (`ImageUploadField`, purpose `profile-banner`). Comments, ratings, bookmarks, hearts and reading progress do not exist.

## Database

`prisma/schema.prisma` is the source of truth. Migrations: `0_baseline` (the full schema as of 2026-10-09, generated from the datamodel), `20260525213000_app_roles_writer_flow` (Role enum rename; runs harmlessly after the baseline on a fresh DB), `20261009120000_administration` (additive: `MemberRestriction`, `AdminAuditLog`, `PlatformAvatar`, new `Settings` columns), `20261010090000_series_follows` (`SeriesFollow` table, a one-time reset of `Series.followers` to 0, and the `SeriesFollow_count` trigger that keeps that column equal to the row count; Prisma doesn't model triggers, so `migrate diff` won't show it), `20261010120000_reading_profile_visibility` (`ProfileVisibility` enum, `User.readingProfileVisibility` default `PRIVATE`), `20261010150000_age_confirmation` (`User.ageConfirmedAt`, `User.ageConfirmationVersion`, both nullable). The main database was baselined on 2026-10-09 (the first two migrations marked applied, the rest deployed) and matched the schema exactly afterwards, so new migrations apply with plain `migrate deploy`; never run the baseline against it. Never flip the live `Settings` phase flags. Models `UserStats`, `AuthorPayout`, `Subscription`, `Book`, `Account`, `VerificationToken` are unused; `Studio`/`StudioMembership` are populated but barely consumed.

## Working rule: this is a test site — change `main` directly (user decision, 2026-10-09)

The site is **not live**; all data is test data. Until the user says the site is going live (far in the future), **every change the user asks for goes straight to `main`**: commit to the `main` branch, and apply schema changes to the **main database** (`.env`, `ep-holy-sunset-…`) directly. No separate "production approval" step and no development-first gate. Do not reintroduce a dev-only workflow unless the user asks for it at launch.

`.env.local` (`ep-withered-leaf-…`) is a **scratch copy** only: `npm run dev` and `npm run test:integration` use it (the integration runner refuses to run against `.env`'s database, by design, so test users are never created on main). Keep it migrated in step with main so local previews and tests work.

## Database protocol (every schema change)

1. **Schema change:** edit `prisma/schema.prisma`, then generate the SQL without touching any database: `npx prisma migrate diff --from-schema-datamodel <previous schema copy> --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<timestamp>_<name>/migration.sql` (write it with `cmd /c` redirection so the file is plain UTF-8). Prefer additive changes; explain anything destructive. Show the user the SQL.
2. **Drift check on main** (read-only): `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel <schema before this change> --script` must print "This is an empty migration"; `npx prisma migrate status` shows only the new migration pending.
3. **Apply to main:** `npx prisma migrate deploy`, then `npx prisma migrate status`.
4. **Keep the scratch copy in step:** `npm run db:dev:migrate`.
5. **Test:** `npm test`, then with `npm run dev` running, `npm run test:integration` (scratch copy; test records are tagged and removed).
6. **Never:** `db push`, `migrate dev`, `migrate reset` or `--accept-data-loss` without explicit user approval; print, log or paste connection strings or `CEO_PASSWORD`; commit `.env` or `.env.local`; flip the live `Settings` phase flags.

## Styling

Tailwind plus CSS-variable tokens in `app/globals.css` (`--bg-primary`, `--text-primary`, `--border-color`, etc., redefined under `.dark`) and component classes (`theme-heading`, `theme-meta`, `theme-panel`, `story-button-primary/secondary`, `eyebrow`, `studio-*`, `reader-paper`, `reading-body`). `<html>` is rendered with `class="dark"`; `AppShell` swaps it from localStorage `df-theme`. Prefer the tokens/classes — several pages (CEO pages, `/goal`, `/settings`) still hard-code `slate-*` colors. The global shell is `components/app-shell/AppShell.tsx` + `AppSidebar.tsx`; the reader route `/episode/*` hides it in favor of `ReaderChrome`.

## Product Rules and Implementation Direction

**Source of truth.** This repo (`Dramatizedfiction106`) is production and owns the database, Prisma schema, auth, authorization, APIs, business logic, permissions, analytics, publishing, monetization infrastructure, phase gates, and security. The Beta Base44 project is a design/UX reference only: never merge it, never import the Base44 SDK, auth, or database logic, never blindly copy its routes or API calls, and never create a second architecture. Reproduce Beta's successful visuals, layouts, and interactions on top of production data, and consolidate duplicate production components while doing so. Production functionality always wins over Beta assumptions.

**Vision.** A cinematic, premium, streaming-style platform for serialized fiction (think Netflix / Disney+ / Max, not a blog or book site). Visual similarity never justifies weakening security or data integrity.

**Roles** (`READER → WRITER → BOARD → CEO`; CEO is the highest authority).
- Only server-side checks grant access; the UI is never a security boundary.
- Only approved/authorized writers may publish. Today promotion is self-service and there is no approval step; that is a gap to close, not a pattern to extend.
- Board handles author approval and any other admin duties explicitly granted to it, but never CEO Studio access.
- Board is capped at 6 members, and only the CEO promotes or demotes Board members (with the CEO password).
- Do not invent permissions that are not defined here.

**Administration and CEO Studio.** There are exactly two admin areas; never add a third (no Command Center, no Inner Sanctum), duplicate dashboards or overlapping destinations.
- Administration (`/administration`, CEO + Board): members and moderation, Board/CEO role management (CEO-only actions inside it), site-wide analytics, avatar library, Renovation Mode (CEO toggles), content, and future general tools (author approvals, writer communication, payments/tax once monetization is active).
- CEO Studio (`/ceo-studio`, CEO only): high-impact decisions, currently Phase 2/3 activation. No member directory, Board management or analytics there.

**Phases / Levels.** Phase 2 (monetization) and Phase 3 (ads) are NOT active. Never activate them, flip their flags, or bypass or weaken backend phase gates unless explicitly instructed. Preserve the existing gated infrastructure. Intended visibility:
- Readers: Level 1 only. No Level 2 monetization UI and no Level 3 ad UI.
- Writers: Level 1, plus optional tasteful grayed-out Level 2 previews. Nothing functional.
- CEO: activates levels from CEO Studio, only once every readiness requirement is met.
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
17. Administration + CEO Studio
18. Phase/Level controls
19. Monetization
20. Advertising
21. Final security/performance/accessibility audit
