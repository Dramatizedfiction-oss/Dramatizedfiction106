# Sweep 3: Bug and error audit

Status: **complete** (2026-11-06). Read the Summary first, then *What's left for you*.

## Plan

**Database used:** the `.env.local` scratch copy (`ep-withered-leaf-…` / `neondb`). It's a separate Neon database holding only the Sweep 17 fake test catalogue, and `scripts/db-dev.mjs verify` confirms it isn't `.env`'s main database (`ep-holy-sunset-…`). Every script in this sweep refuses to run unless `DATABASE_URL` names the scratch host. No `db push` / `migrate *` ran against anything. Accounts made for this sweep are tagged (`…@bug-audit.invalid`, or the integration helpers' `itest-…@example.invalid`) and removed afterwards.

**Tools:**
- Docker isn't installed and Playwright isn't in the project, so there's no local Postgres; the scratch database plays that part.
- The smoke suite uses Node's built-in test runner over HTTP (decision D-1).
- Console, hydration and network checks use the desktop app's built-in browser.

Steps, in order:

1. **Static checks:** production build, `tsc --noEmit` (strict is on), `next lint`. Fix what matters, list the rest.
2. **Route crawl:** every page route, signed out and as Reader, Writer, Board and CEO (fake accounts with real session rows), over HTTP. Record status codes, redirects, loops, 500s and server-log errors. Then open the main pages in the browser for console errors, hydration warnings and failed requests.
3. **Links and navigation:**
   - every internal `href`, `router.push`, `redirect()` and `location` target checked against the route list and the redirects in `next.config.js`;
   - direct load and refresh of deep links;
   - pages reached by the wrong role.
4. **Loading, empty and error states:** read every page and data component for loading, empty and failure handling; find silent failures. Check `not-found`, `error` and `global-error` and the themed error pages without a database or session.
5. **Forms and actions:** every form and mutation (sign-in/up/out, Settings, profile, avatar, series/episode, publish, rating, bookmark, comment, report, follow). Check validation, double submit, optimistic rollback, lost input, and whether limits agree between client and server. Find the cause of the "stuck on Logging out" report.
6. **Data edge cases:** long, empty, emoji, Thai, Lao, Chinese, Arabic, line breaks, special characters, a very large episode, nulls from older rows, a deleted author/series, no images, no genre, no profile record, and time zones / daylight saving.
7. **Concurrency and state:** two tabs, rapid taps, double rating, publish while editing, stale caches, state left after sign-out.
8. **Images:** fallbacks, aspect ratios, huge or odd uploads, slow loads.
9. **Role journeys:** a table per role.
10. **Server/API:** throws vs JSON errors, status codes, redirects where JSON is expected, response shapes, pagination limits, repeated or slow queries.
11. **Tests:** a smoke suite (`npm run test:smoke`) plus unit tests for every fix.

Each fix is a small commit to `main`, after build + lint + unit tests (and the affected integration/smoke tests).

Stop-and-ask rule (from the brief): anything that would delete or alter existing data, needs a secret or dashboard, or touches auth, roles, sessions, Stripe, Settings/phase flags or the AiUsageTag enum is **described here, not changed**.

## Decisions made without asking

| ID | Decision | Why |
|---|---|---|
| D-1 | Smoke tests use `node:test` + `fetch` against the dev server (like `tests/integration`), not Playwright. | Playwright isn't installed. Adding it means ~150 MB of browser downloads and a new tool to keep working on this Windows machine. The HTTP suite runs with one command, reuses the integration safety checks (scratch DB only), and covers every journey's server side. Browser-only checks (console, hydration) were done by hand in this sweep and are listed for the phone check. |
| D-2 | Test on the scratch Neon database instead of a local Postgres. | Docker isn't available. The scratch copy is a separate database with only fake data, already guarded by `scripts/dev-db-target.mjs`. |
| D-3 | Run the production build and the dev server one after the other, never together. | This machine has 3.5 GB of RAM. Running both at once used it all ("paging file is too small"), which made the dev server time out and throw bogus errors (missing manifests, duplicate React). Those log lines came from the machine, not the app, and aren't listed as findings. |
| D-4 | Errors in sign-in/sign-up *forms* (client UI) are fixed; the sign-in/sign-up *routes* aren't touched. | The brief protects auth. A form that hangs or shows the wrong message is UI; how the server signs you in is auth. |

| D-5 | The crawl makes one request at a time. | Five parallel page loads ran out of the database connection pool (BUG-06). Those failures are a real finding, but they hid each page's own result, so the clean pass runs one at a time. |
| D-6 | Pages that report "not found" with status 200 are left alone (BUG-08). | Fixing them means swapping custom in-page "not found" screens for the shared 404 page: a visual change, not a bug fix. |

## Summary

- **Fixed (7):** BUG-01 to BUG-05, BUG-19 and BUG-20, each with unit tests (`tests/unit/sweep-3-bugs.test.ts`, `tests/unit/sweep-1-security.test.ts`) and a before/after check. Commits are in the table.
- **Open (14):** BUG-06 to BUG-18 and BUG-21. None of them stops a journey on a normal connection. The two most likely to bite are BUG-06 (connection pool under load) and BUG-09 (two tabs editing one episode).
- **Smoke suite:** 10/10 journeys green against the scratch database (`npm run test:smoke`, about 10 minutes on this machine).
- **Browser pass:** no console errors and no hydration warnings on Home, Explore, a series, an episode, a writer profile, `/status/500` (signed out), and on `/reader`, Settings › Account and Reading, Writer Studio and New series (signed in as a writer).
- **No dead links:** every internal link, `router.push`, `redirect()` and `location` target in `app/`, `components/` and `lib/` resolves to a route or a configured redirect.
- **Routes:** every page route opens for the right roles, sends the others to sign-in, `/status/403` or `/become-author`, and has no redirect loops (role table below).
- **Static checks:** the production build, `tsc --noEmit` (strict) and `next lint` are all clean, with no warnings. The eight inline `react-hooks/exhaustive-deps` suppressions were each read and are intentional (run-once effects and latest-state queues, each with a comment).

## Findings

Severity: **breaks** = a journey fails; **likely** = fails under realistic conditions (bad network, load, two devices); **minor** = cosmetic, SEO or edge case.

| ID | Severity | Area | File and line | What's wrong | How to reproduce | Status | Commit |
|---|---|---|---|---|---|---|---|
| BUG-01 | breaks | Forms: sign-in, sign-up, Become a Writer | `components/auth/SignInForm.tsx:30`, `SignUpForm.tsx:29`, `BecomeAuthorForm.tsx:24` | If the request never completes (offline, Wi-Fi drop, a server that never answers), `fetch` throws and nothing catches it. The button stays on "Signing in…" / "Creating account…" forever, with no message. | On `/sign-in`, go offline (or make `/api/auth/login` fail) and submit. **Before:** stuck, no message. **After:** "We couldn't reach Dramatized Fiction. Check your connection and try again." and the button works again (checked in the browser with the request forced to fail). | Fixed | `777013e` |
| BUG-02 | minor | Navigation: sign-in ↔ sign-up | `components/auth/SignInForm.tsx:117`, `SignUpForm.tsx:139` | Following "Create an account" from a sign-in page reached with `?callbackUrl=` lost it, so after signing up you landed on Explore instead of where you were going (and the same the other way). | Open `/sign-in?callbackUrl=/settings` and follow "Create an account". **Before:** `/sign-up`. **After:** `/sign-up?callbackUrl=%2Fsettings` (checked in the browser). Only same-site paths are carried (`withCallback` in `lib/safe-callback.ts`). | Fixed | `777013e` |
| BUG-03 | likely | Sign-out ("stuck on Logging out") | `components/app-shell/AppShell.tsx:92` | See "Sign-out" below. The remaining real bug: Back after signing out can restore a signed-in page from the browser's back/forward cache (Safari keeps these). It shows the old content and account menu until you reload. | On iPhone Safari: open your Library, sign out, then press Back. **Before:** the signed-in Library shows again. **After:** a restored page checks the session and reloads, so you see the signed-out page. | Fixed | `905fdbe` |
| BUG-04 | minor | Hydration | `components/engagement/CommentsSection.tsx:332`, `components/reader/Reader{Activity,Bookmarks,Highlights,People}.tsx`, `components/settings/AccountForms.tsx:94` | "5m ago" is worked out on the server and again in the browser. If a minute boundary passes in between, or for dates more than a week old the date line does (UTC server, UTC+7 phone), React logs a hydration mismatch and redraws. | Open an episode with comments posted a few minutes ago, on a slow connection. The console shows "Text content did not match". **After:** those labels may differ without a warning. | Fixed | `cca164a` |
| BUG-05 | likely | Forms: sign-in/sign-up error message | `components/auth/SignInForm.tsx:49` | When the server fails (database down, 500 with no JSON), sign-in said "We couldn't sign you in with those credentials", so members think their password is wrong. | From the code (the route has no `try`, so a database error is an empty 500): with the database unreachable, sign in. **Before:** wrong-password message. **After:** "Something went wrong on our side. Please try again in a moment." Not reproduced live: the shared scratch database wasn't taken down. | Fixed | `777013e` |
| BUG-06 | likely | Server: database connections | `DATABASE_URL` in `.env` / Vercel (no `connection_limit` or `pool_timeout`) | Prisma's default pool here is 5 connections with a 10 s wait. One page already runs several queries at once (root layout + page `Promise.all`), so five visitors at the same moment ran out ("Timed out fetching a new connection from the connection pool", P2024). The page then fails into the error page. | Five parallel loads of `/episode/<id>` on the dev server: every page waited for a connection, and some died with P2024 (server log, 2026-11-06). | Open (needs a Vercel env change) | — |
| BUG-07 | minor | Navigation: role-protected pages | `app/administration/layout.tsx:12`, `lib/utils.ts:46-64` | A redirect from a page guard after streaming has begun reaches the browser as **200 plus an in-page redirect**, not a 307. No protected content is sent (checked: the HTML holds only the redirect), but the tab title briefly reads "Administration", and tools that don't run JavaScript see 200. | `curl -i` `/administration` with a Reader's cookie → 200, body contains `NEXT_REDIRECT;replace;/status/403`. | Open (by design of Next 14 streaming) | — |
| BUG-08 | minor | Not-found status codes | `app/episode/[episodeId]/page.tsx:56`, `app/series/[seriesId]/page.tsx`, `app/status/[code]/page.tsx`, `app/ceo-studio/phases/[phase]/page.tsx` | A missing episode shows its own "This story isn't available" screen with status 200. Missing series, `/status/418` and `/ceo-studio/phases/9` render the 404 page, but also with status 200 (streamed `notFound()`). Real unknown URLs return 404 correctly. | `GET /episode/does-not-exist` → 200. | Open (decision D-6) | — |
| BUG-09 | likely | Concurrency: Writer Studio | `components/writer-studio/editor/use-episode-autosave.ts`, `app/api/writer-studio/episodes/[episodeId]/route.ts:36` | Two tabs or devices editing the same episode overwrite each other silently: each autosave sends the whole text and the last one wins. The local-backup check only runs when the editor opens. | Open the same draft in two tabs, type in both. The text from the tab that saved last is all that's kept. | Open | — |
| BUG-10 | minor | Phase 3 surface | `app/watch-ad/page.tsx:33-52` | `/watch-ad` opens for anyone while Phase 3 is off (readers shouldn't see ad UI, per CLAUDE.md). Opened without `?episode=`, "Watch Ad" goes to `/episode/null`, and a failed request is never caught. | Open `/watch-ad` and tap "Watch Ad". | Open (phase area) | — |
| BUG-11 | minor | Auth pages when signed in | `app/sign-in/page.tsx`, `app/sign-up/page.tsx` | A signed-in member still gets the sign-in and sign-up forms. Signing up again there swaps the session to the new account without warning. | Signed in, open `/sign-up`. | Open (auth) | — |
| BUG-12 | minor | API: JSON vs redirect | `lib/auth-route-guards.ts:13`, `app/ceo/revenue/route.ts` | The middleware prefix `/ceo` also covers the API route `/ceo/revenue`, so a signed-out call gets an HTML redirect to `/sign-in` instead of JSON 401. | `curl -i /ceo/revenue` signed out → 307 to `/sign-in`. | Open (auth/middleware) | — |
| BUG-13 | minor | API: empty-body 500s | `app/api/auth/{login,register}/route.ts`, and most routes that call the guard before `try` | If the database is down, these throw rather than return `{ error, code }`, so the answer is a 500 with an empty body. The forms now handle it (BUG-05), and `lib/writer-studio/api.ts` already copes. | Stop the database and `POST /api/auth/login`. | Open (auth routes are protected; the rest is low value) | — |
| BUG-14 | minor | Data: limits on older rows | `lib/api/writer-studio-request.ts` (`STUDIO_TEXT_LIMITS`, Sweep 1) | A series or episode saved **before** the Sweep 1 limits with longer text (e.g. a description over 2,000 characters) would make every later save of that item fail with "Invalid request". The scratch copy has none (checked). | Read-only check to run on the main database: see "What's left". | Open (check needed) | — |
| BUG-15 | minor | Data: placeholder genre | `app/api/writer-studio/series/route.ts:64` | A series created through the API without a genre gets the literal genre "Genre", which then shows as a chip and as "More in Genre". The Studio form always asks for one. | `POST /api/writer-studio/series {}`. | Open | — |
| BUG-16 | minor | Time zones | `app/goal/page.tsx:13` | The monthly reads meter starts the month at the server's midnight: UTC on Vercel, local time in development. For you in Laos (UTC+7) the month changes at 07:00 local time. | Compare `/goal` just after midnight local time. | Open (CEO-only page) | — |
| BUG-17 | minor | Copy | `app/forgot-password/page.tsx:12` | Says "the platform session system is now handled directly in-app": developer wording on a member-facing page. | Open `/forgot-password`. | Open (known issue: no password reset) | — |
| BUG-19 | minor | Episode page title | `app/episode/[episodeId]/page.tsx:38` | Every episode's browser tab (and link preview) read just "Dramatized Fiction": the page had no `generateMetadata`. | Open any episode. **Before:** "Dramatized Fiction". **After:** "Wrong Address · Letters to the Lighthouse Keeper · Dramatized Fiction" (checked in the browser). Only published episodes are looked up, as on the page. | Fixed | `83cd5a5` |
| BUG-20 | likely | Security headers (regression from Sweep 1) | `next.config.js:17-21` | The report-only CSP from Sweep 1 didn't allow Google Fonts, which `app/globals.css` imports. Every page logged ~60 font violations. Switching the CSP to enforcing as planned would have broken every font on the site. | Open any page and read the console. **Before:** "Loading the font 'https://fonts.gstatic.com/…' violates … font-src". **After:** none in a fresh tab (checked). | Fixed | `83cd5a5` |
| BUG-21 | minor | Console warning | `components/brand/BrandMark.tsx:12` | Chrome warns that `/brand/mark-64.webp` "was preloaded … but not used within a few seconds". Next adds the preload for the logo; harmless. | Open any page and read the console. | Open (harmless) | — |
| BUG-18 | minor | Layout comment | `app/layout.tsx:124` | The comment says "light" is the server default, but the code (correctly) renders `dark`. Misleading for the next person. | Read the file. | Open (comment only) | — |

### Sign-out ("stuck on Logging out")

What the code does today (`components/providers/AuthSessionProvider.tsx`, `AppShell.tsx`):
- Tapping "Log out" clears the session in the browser straight away, so the account menu (the only place "Logging out…" appears) closes at once.
- `/api/auth/logout` is given 8 s. Whatever happens, the page then does a full load of `/`.
- If the request didn't arrive, a `df-signout-pending` flag finishes it on the next load.

So today "Logging out…" can't stay on screen; the stuck version was what Sweep B1 fixed. What was still possible:
1. **Back** brings back a signed-in page from the back/forward cache (BUG-03, fixed).
2. On a slow connection, the signed-out shell shows for up to 8 s before the reload. That's by design.

If it still happens on a phone, note the browser and the page and send it over: that would be a new cause.

## Role journeys

From the route crawl (every page, five roles) and the smoke suite. ✅ works; ↪ sent to the right place; ❌ broken.

| Journey | Signed out | Reader | Writer | Board | CEO |
|---|---|---|---|---|---|
| Home, Explore, About, legal pages | ✅ | ✅ | ✅ | ✅ | ✅ |
| Sign up / sign in / sign out | ✅ | ✅ (BUG-11: forms still shown when signed in) | ✅ | ✅ | ✅ |
| Open a series and its episode list | ✅ | ✅ | ✅ | ✅ | ✅ |
| Read an episode | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rate, bookmark, comment, follow | ↪ sign in | ✅ | ✅ (not on own episode: 403, correct) | ✅ | ✅ |
| Own reader profile `/reader` | ↪ sign in | ✅ | ↪ `/author/<id>` | ↪ `/author/<id>` | ↪ `/author/<id>` |
| Writer profile `/author/<id>` (+ followers, works) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Avatar `/reader/avatar`, Store | ↪ sign in / ✅ | ✅ | ✅ | ✅ | ✅ |
| Settings › Account, Delete account | ↪ sign in | ✅ | ✅ | ✅ | ✅ |
| Become a Writer | ↪ sign in | ✅ | ↪ Studio | ↪ Studio | ↪ Studio |
| Writer Studio (home, episodes, series, stats, grow, guidelines) | ↪ sign in | ↪ `/become-author` | ✅ | ✅ | ✅ |
| Edit / preview / publish own draft | ↪ sign in | ↪ `/become-author` | ✅ | 404 for someone else's (correct) | 404 for someone else's (correct) |
| Administration (every page) | ↪ sign in | ↪ `/status/403` | ↪ `/status/403` | ✅ | ✅ |
| CEO Studio, `/goal` | ↪ sign in | ↪ `/status/403` | ↪ `/status/403` | ↪ `/status/403` | ✅ |
| Admin action (hold/release a series) | — | 403 JSON | 403 JSON | ✅ | ✅ |
| Themed error pages `/status/401…503`, unknown URL | ✅ | ✅ | ✅ | ✅ | ✅ |
| Legacy URLs (`/command-center`, `/ceo`, `/writer/*`, `/writer-studio/stories`, `/episode/new`, `/series/new`, `/onboarding/author`) | ↪ | ↪ | ↪ | ↪ | ↪ |
| `/watch-ad` (Phase 3 off) | ⚠ shown (BUG-10) | ⚠ | ⚠ | ⚠ | ⚠ |

Wrong-person checks: no protected page sent its content to a role without access (each refused page's HTML holds only the redirect). Board can't open CEO Studio. Nobody but the owner can open a draft.

## Known issues left alone (as the brief asked)

| Issue | Why it's left | Where |
|---|---|---|
| AI-tag serialization (`AI_HEAVY` vs `"AI HEAVY"`) | Excluded by the brief; it also touches the protected AiUsageTag enum. `serializeAiUsageTag` still silently turns anything it doesn't recognise into `AI_FREE`. | `lib/ai-usage.ts` |
| Follows stored only on the device | Excluded by the brief. Writer follows moved to the account in Sweep B2; the old `df-follows-*` device list is imported once after sign-in (`components/follow/DeviceFollowImport.tsx`), and anything left in a browser that never signs in stays there. | `components/follow/` |
| No password reset or email verification | Excluded by the brief; needs email sending. `/forgot-password` only points to Contact (BUG-17 is about its wording). | `app/forgot-password/page.tsx` |
| Sign-in/sign-up server routes, sessions, roles, middleware | Protected areas: BUG-11, BUG-12 and BUG-13 are described, not changed. | `app/api/auth/*`, `middleware.ts` |
| Phase 3 page `/watch-ad` | Monetization/phase surface (BUG-10): described, not changed. | `app/watch-ad/page.tsx` |

## Proposed fixes for the open findings

- **BUG-06 (pool), needs you in Vercel:** add `&connection_limit=10&pool_timeout=20` to `DATABASE_URL` (Production and Preview). The URL already points at Neon's pooled host, so more client connections are cheap. Redeploy afterwards. Locally, add the same to `.env.local`.
- **BUG-09 (two tabs):**
  - The editor sends the `lastSavedAt` it started from with every autosave. The PATCH route compares it with the stored `lastSavedAt` (no schema change) and answers 409 `EDITED_ELSEWHERE` when they differ.
  - The editor then stops autosaving and shows "This episode was changed in another tab or device. Reload to see the latest version", keeping the local backup.
  - Left open because it changes autosave behaviour, which needs its own careful pass and tests.
- **BUG-07 / BUG-08 (status codes):** call the guard (and `notFound()`) in each page *before* anything streams, or accept it: content never leaks.
- **BUG-10 (`/watch-ad`):** at the top of the page, show the 404 page unless Phase 3 is active (`isPhaseThreeActive()` only reads the flag), and catch the failed request. Needs your OK, being phase UI.
- **BUG-11:** on `/sign-in` and `/sign-up`, a signed-in member is sent to the callback (or Explore). Auth surface, so your call.
- **BUG-12:** move `app/ceo/revenue` to `app/api/ceo/revenue` (and its one caller), or exclude it from the middleware prefix.
- **BUG-13:** wrap the guard call inside `try` in each route, or add a shared `withJsonErrors(handler)` wrapper. The auth routes need your OK.
- **BUG-14:** run the read-only check below on the main database. If it prints any non-zero count, raise that limit or trim the text with the writer's agreement (that alters data, so it isn't done here).
- **BUG-15:** have the create route refuse a missing genre (400) like the form does, or store `null` and let the page hide the chip.
- **BUG-16:** use UTC on purpose and label it, or pass the CEO's time zone.
- **BUG-17 / BUG-18:** wording only.

## Smoke tests

`tests/smoke/journeys.test.ts`, run by `scripts/test-smoke.mjs`:

```bash
npm run dev          # terminal 1 (uses .env.local, the scratch copy)
npm run test:smoke   # terminal 2
```

- **Safety:** it refuses to run unless `.env.local` names a different database from `.env`, the same check as the integration tests. It creates its own accounts (`smoke-…@smoke.invalid`) and its own story, then deletes all of them and asserts that nothing is left. So it works on a fresh, empty database too.
- **Coverage, in order:**
  1. Signed out: public pages load; Studio, Administration, CEO Studio and Settings › Account send you to sign in.
  2. Themed error pages `/status/401…503` and an unknown URL (404).
  3. Sign up → sign out (the old cookie stops working) → wrong password (401) → sign in.
  4. Become a Writer → create a series and an episode → save text with emoji, Thai, Lao, Chinese and Arabic → open the editor → publish.
  5. The published series, episode and writer profile open for anyone, and the non-Latin text survives.
  6. Reader: rate (twice: still one rating), bookmark, comment (a double tap returns the same comment), follow the series and the writer, edit the bio, open `/reader` and Settings. The writer can't rate their own episode (403).
  7. Reader is refused Studio (→ Become a Writer), Administration and CEO Studio (→ 403), and the admin API answers JSON 403.
  8. Board: Administration opens, then hold and release a series in the feed (audited). Board is refused CEO Studio.
  9. CEO: CEO Studio and Administration open.
- **Not covered (browser only):** console errors, hydration, layout and image loading. See the phone checklist.
- With no dev server running, every test is skipped with a message instead of failing.

## What's left for you

1. **BUG-06:** add `connection_limit=10&pool_timeout=20` to `DATABASE_URL` in Vercel (Production and Preview), then redeploy. Only you have dashboard access.
2. **BUG-14:** run this **read-only** count on the main database (Neon SQL editor, or `npx prisma db execute --stdin` with `.env`). Every number should be 0; if one isn't, say which and we'll decide what to do with that row.
   ```sql
   SELECT
     (SELECT count(*) FROM "Series"  WHERE length(title) > 150)                          AS series_title,
     (SELECT count(*) FROM "Series"  WHERE length(description) > 2000)                   AS series_description,
     (SELECT count(*) FROM "Series"  WHERE length(genre) > 60)                           AS series_genre,
     (SELECT count(*) FROM "Episode" WHERE length(title) > 200)                          AS episode_title,
     (SELECT count(*) FROM "Episode" WHERE length(coalesce(description, '')) > 1000)     AS episode_description,
     (SELECT count(*) FROM "Episode" WHERE length(coalesce("contentWarning", '')) > 300) AS content_warning,
     (SELECT count(*) FROM "Episode" WHERE length(body) > 1000000)                       AS episode_body;
   ```
3. **Decide on the protected items:** BUG-10 (hide `/watch-ad` while Phase 3 is off), BUG-11 (send signed-in members away from sign-in/sign-up), BUG-12 and BUG-13. Each has a proposed fix above.
4. **BUG-09** (two tabs editing one episode) is the biggest open bug. It deserves its own small sweep with tests.
5. **Push:** nothing in this sweep is pushed. `main` is ahead of GitHub by this sweep's commits, the Sweep 1 commit and the four Sweep I commits.

No schema change was needed, so there's no migration SQL.

## Phone checklist (when you can see the site)

Use a phone in **dark** mode, then once in **light** mode.

- [ ] **Sign in on a weak connection:** start signing in, turn on airplane mode before it finishes. A message appears ("We couldn't reach…") and the button works again. (BUG-01)
- [ ] **Sign-in ↔ sign-up:** from a series page's "sign in to save progress" link, switch to "Create an account" and sign up. You land back on that series. (BUG-02)
- [ ] **Sign out, then Back:** open your Library, sign out, press Back. You don't see your Library or account menu. (BUG-03)
- [ ] **Sign out on Safari:** it never sits on "Logging out…". If it ever does, note the page and browser. (see "Sign-out")
- [ ] **Episode tab title:** an episode shows "Episode title · Series title" in the tab or share sheet. (BUG-19)
- [ ] **Fonts:** headings in Playfair, body text in Literata/Inter, as before. (BUG-20)
- [ ] **Comments:** post one and reload a few minutes later; the "Xm ago" label is right and nothing flickers. (BUG-04)
- [ ] **Read, rate, bookmark, comment, follow** on someone else's series: each sticks after a reload.
- [ ] **Become a Writer → New series → Write → Publish:** the episode opens from the series page.
- [ ] **Studio on two devices** (optional, to see BUG-09): edit the same draft on phone and laptop; only the last save is kept.
- [ ] **Board / CEO:** Administration opens; CEO Studio opens only for the CEO; a reader account gets the 403 page.
- [ ] **Error pages:** `/status/404` and `/status/500` show the night-desert scene in both themes, and a made-up URL shows the 404 page.

## Commits (all on `main`, not pushed)

| Commit | What |
|---|---|
| `777013e` | BUG-01, BUG-02, BUG-05: sign-in, sign-up and Become a Writer handle failed requests; callback kept |
| `905fdbe` | BUG-03: Back after signing out reloads instead of showing the signed-in page |
| `cca164a` | BUG-04: relative times without hydration mismatches; adds this report and `tests/unit/sweep-3-bugs.test.ts` |
| `83cd5a5` | BUG-19, BUG-20: episode page title; CSP allows Google Fonts |
| (this commit) | Smoke suite `tests/smoke/`, `scripts/test-smoke.mjs`, `npm run test:smoke`; this report completed |

The first three commit subjects begin with an invisible byte-order mark, an artefact of how PowerShell wrote the message files. It's cosmetic, and history wasn't rewritten to remove it.
