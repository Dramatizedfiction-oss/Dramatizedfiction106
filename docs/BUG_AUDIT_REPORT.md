# Sweep 3: Bug and error audit

Status: **in progress** (this file is updated as the sweep runs).

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

## Findings

_(filled in as the sweep runs)_
