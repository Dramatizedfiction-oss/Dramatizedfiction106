import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FINDING_KINDS, BLOCKING_KINDS } from "@/tests/phone/checks";

/*
 * Sweep 4 (phone layout): the shared fixes, pinned so they don't quietly
 * disappear. Layout itself is checked in a real browser by the phone checker
 * (npm run test:phone, and a reduced run inside npm run test:smoke); see
 * docs/PHONE_LAYOUT_REPORT.md.
 */

const read = (path: string) => readFileSync(path, "utf8");
const css = read("app/globals.css");

test("viewport: notch-aware, zoom never blocked", () => {
  const layout = read("app/layout.tsx");
  assert.match(layout, /viewportFit: "cover"/);
  assert.doesNotMatch(layout, /(maximumScale|userScalable)\s*:/);
});

test("safe areas: header, reader and Studio bars, drawer, sheets, toast and toolbar clear the notch and home indicator", () => {
  assert.match(read("components/app-shell/AppShell.tsx"), /pt-\[env\(safe-area-inset-top\)\]/);
  assert.match(read("components/ReaderChrome.tsx"), /pt-\[env\(safe-area-inset-top\)\]/);
  assert.match(read("components/writer-studio/editor/EditorTopBar.tsx"), /pt-\[env\(safe-area-inset-top\)\]/);
  assert.match(read("components/app-shell/AppSidebar.tsx"), /paddingBottom: "env\(safe-area-inset-bottom\)"/);
  assert.match(read("components/follow/UndoToast.tsx"), /bottom-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/);
  assert.match(read("components/writer-studio/editor/EditorToolbar.tsx"), /env\(safe-area-inset-bottom\)/);
  assert.match(css, /\.bottom-sheet > div \{ padding-bottom: max\(1\.5rem, env\(safe-area-inset-bottom\)\); \}/);
  assert.match(css, /padding-left: env\(safe-area-inset-left\);/);
});

test("full-height screens use dvh (with a vh fallback)", () => {
  assert.match(css, /min-height: 100vh;\s*min-height: 100dvh;/);
  assert.match(read("components/platform/RestrictedScreen.tsx"), /min-h-screen min-h-dvh/);
});

test("layers: page locked behind an open dialog; Back closes the menu and sheets", () => {
  assert.match(css, /html:has\(dialog\[open\]\) \{ overflow: hidden; \}/);
  assert.match(read("components/ui/BottomSheet.tsx"), /useCloseOnBack\(open, onClose\)/);
  assert.match(read("components/writer-studio/ui/Sheet.tsx"), /useCloseOnBack\(open, onRequestClose\)/);
  assert.match(read("components/app-shell/AppShell.tsx"), /useCloseOnBack\(mobileOpen && !isReaderRoute/);
  const hook = read("components/ui/use-close-on-back.ts");
  // Next's own history state is kept (spread), or the App Router would reload on Back.
  assert.match(hook, /pushState\(\{ \.\.\.\(window\.history\.state \?\? \{\}\), dfLayer: marker \}/);
  assert.match(hook, /window\.history\.state\?\.dfLayer === marker\) window\.history\.back\(\)/);
});

test("touch: 44px targets on any touch screen, no sticky hover, no double-tap delay, rails contain overscroll", () => {
  const tailwind = read("tailwind.config.js");
  assert.match(tailwind, /hoverOnlyWhenSupported: true/);
  assert.match(tailwind, /addVariant\("pointer-coarse", "@media \(pointer: coarse\)"\)/);
  assert.match(css, /@media \(max-width: 767px\), \(pointer: coarse\) \{[\s\S]*?\.sidebar-link \{\s*min-height: 44px;/);
  assert.match(css, /\.story-button-secondary \{\s*min-height: 44px;/);
  assert.match(css, /touch-action: manipulation;/);
  assert.match(css, /\.scrollbar-hide \{[^}]*overscroll-behavior-x: contain;/);
  assert.match(read("components/legal/LegalFooterLinks.tsx"), /min-h-11 min-w-11/);
  assert.match(read("components/explore/ExploreRow.tsx"), /pointer-coarse:hidden/);
});

test("text: long words break; focus and #links stop clear of the sticky header", () => {
  assert.match(css, /body \{[^}]*overflow-wrap: break-word;/);
  assert.match(css, /scroll-padding-top: calc\(4\.5rem \+ env\(safe-area-inset-top\)\);/);
});

test("forms: sign-in and sign-up keyboards show Next / Go", () => {
  assert.match(read("components/auth/SignInForm.tsx"), /enterKeyHint="go"/);
  assert.match(read("components/auth/SignUpForm.tsx"), /enterKeyHint="next"[\s\S]*enterKeyHint="go"/);
});

test("the phone checker's blocking kinds are a subset of what it reports", () => {
  for (const kind of BLOCKING_KINDS) assert.ok(FINDING_KINDS.includes(kind), kind);
});
