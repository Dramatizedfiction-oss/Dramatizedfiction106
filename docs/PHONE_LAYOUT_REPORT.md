# Sweep 4: phone layout report

Status: **in progress.** The plan is below; findings, fixes and results are added as the work goes.

## Plan

1. **Tooling.**
   - Playwright isn't installed on this machine, and adding it as a dependency would change both lockfiles. So `playwright-core` is installed with `--no-save` and drives the Microsoft Edge that is already installed (D-1).
   - The checker is `tests/phone/`: in-page checks, fake data and a route list. `npm run test:phone` runs it.
   - A reduced version runs inside `npm run test:smoke`.
2. **Database.**
   - Everything runs against the `.env.local` scratch copy (`ep-withered-leaf`). The runner refuses if it names the same database as `.env` (`ep-holy-sunset`, main).
   - The checker makes its own accounts (`@phone-check.invalid`) with edge-case content through the normal APIs, and deletes them afterwards.
   - No migrations of any kind are run.
3. **Server.** A local production build (`npm run build && npm run start`), not the dev server: it is much lighter on this 3.5 GB machine, and it is what phones get (D-2).
4. **Baseline.** Visit about 85 screens at 320×568, 360×640, 375×812, 390×844, 412×915, 430×932, 768×1024 and 812×375, signed out and as a reader, an empty reader, a writer, a Board member and the CEO. Layers are opened too: the menu, the account menu, the season sheet and the episode menu. Results go to `docs/phone-audit/results-before.md`.
5. **Code review** of what an automated check can't see: viewport meta and safe areas, `vh` vs `dvh`, keyboard behaviour, focus traps, back-button closing, hover-only controls, gestures, reduced motion, large text.
6. **Fix in small groups, shared components first:**
   - viewport and safe areas;
   - overflow and wrapping;
   - tap targets;
   - fixed bars and layers;
   - forms and keyboard;
   - the reader;
   - the remaining screens.
   After each group: re-run the checker and the smoke tests, then the unit tests, lint and build before the commit.
7. **Screenshots.** Every screen at every size, in dark and light, as small WebP files in `docs/phone-audit/shots/`, committed only if they fit the size budget. Otherwise only the command that regenerates them.
8. **Report.** Findings table, before/after checker results, recommended redesigns, how to run everything, and a phone checklist.

## Decisions made without asking

| # | Decision | Why |
|---|---|---|
| D-1 | Drive the installed Edge with `playwright-core`, installed with `npm install --no-save`. | Playwright wasn't available. A saved dependency would change `package-lock.json` and `pnpm-lock.yaml` (Vercel may build from either), and downloading Playwright's own browsers is ~150 MB. Edge is Chromium, so the emulation results are what Chrome on Android shows. Safari (iPhone) can't be run on Windows, so its quirks were checked in code (see the phone checklist). |
| D-2 | Test against `next start` on the scratch database, not `next dev`. | Same output as production; the dev server plus a browser exhausted this machine's memory in Sweep 3. |
| D-3 | The small capital labels in Space Mono (eyebrows, status badges such as "DRAFT", "AI FREE", "CURRENT") stay at 9–11px. Sentence-case information under 12px (the author line on cover cards, read counts and the empty-list note in the sidebar) was raised to 12px. | The brief says not to change the brand look, and those labels are a deliberate type style: short, uppercase, widely tracked, and never the only place the information appears. The checker still lists them as `tinyText` so they stay visible. Raising them to 12px is a one-line change per component if you want it (listed under "Recommended"). |
| D-4 | Phones' Back button closes the menu drawer, the bottom sheets (season picker) and the Studio side sheets, but not the Explore filter sheet. | Choosing an Explore filter rewrites the URL in place; closing the sheet by popping a history entry right after would undo that choice. That sheet already closes with the backdrop, the close button, a downward drag and Escape. |
| D-5 | Touch rules (44px targets, no hover-only arrows) apply to any touch screen (`pointer: coarse`), not only below 768px. | A phone on its side (812×375) gets the desktop layout but is still used with a finger. A new Tailwind variant, `pointer-coarse:`, does the same in components. |
| D-6 | Inline text links that are also the main way to an action (author name, comment author, "Create an account") get a taller tap area by padding offset with an equal negative margin (`-my-3.5 py-3.5`). | The line of text doesn't move or change look; only the invisible tap area grows to 44px. Links inside running sentences are left alone (WCAG 2.5.8 exempts them). |
| D-7 | The checker was corrected twice before the baseline it reports was taken. | Its first version counted cards inside a carousel as "wider than the screen" (each card clips itself, and the carousel clips the cards), and counted targets under an open sheet as "covered". Both are fixed, so the numbers below are real findings. After the baseline, two more corrections changed only `small` and `covered` counts (inline links found through any inline ancestor; an open menu counts as a layer). The before/after table notes this. |
