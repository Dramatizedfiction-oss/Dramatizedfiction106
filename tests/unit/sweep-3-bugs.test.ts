import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { withCallback } from "@/lib/safe-callback";

/*
 * Sweep 3 (bug and error audit): focused checks for the fixes. Each test
 * names its finding ID in docs/BUG_AUDIT_REPORT.md.
 */

const read = (path: string) => readFileSync(path, "utf8");

test("BUG-01: sign-in, sign-up and Become a Writer say so when the request never completes", () => {
  for (const file of ["components/auth/SignInForm.tsx", "components/auth/SignUpForm.tsx", "components/auth/BecomeAuthorForm.tsx"]) {
    const source = read(file);
    // The fetch is inside try, and the catch clears the busy state with a message.
    assert.match(source, /try \{\s*response = await fetch\(/, file);
    assert.match(source, /\} catch \{\s*(?:\/\/[^\n]*\n\s*)?setError\(NETWORK_ERROR\);\s*setIsSubmitting\(false\);\s*return;/, file);
  }
});

test("BUG-02: switching between Sign in and Create account keeps the callback (same-site only)", () => {
  assert.equal(withCallback("/sign-up", "/series/abc?x=1"), "/sign-up?callbackUrl=%2Fseries%2Fabc%3Fx%3D1");
  assert.equal(withCallback("/sign-up", null), "/sign-up");
  assert.equal(withCallback("/sign-up", "https://evil.example"), "/sign-up");
  assert.equal(withCallback("/sign-in", "//evil.example"), "/sign-in");
  assert.match(read("components/auth/SignInForm.tsx"), /withCallback\("\/sign-up"/);
  assert.match(read("components/auth/SignUpForm.tsx"), /withCallback\("\/sign-in"/);
});

test("BUG-04: relative times rendered on the server may differ in the browser without a hydration error", () => {
  for (const file of [
    "components/engagement/CommentsSection.tsx",
    "components/reader/ReaderActivity.tsx",
    "components/reader/ReaderBookmarks.tsx",
    "components/reader/ReaderHighlights.tsx",
    "components/reader/ReaderPeople.tsx",
  ]) {
    const source = read(file);
    for (const line of source.split("\n").filter((text) => /\{timeAgo\(/.test(text) && /<(time|span)/.test(text))) {
      assert.match(line, /suppressHydrationWarning/, `${file}: ${line.trim()}`);
    }
  }
  assert.match(read("components/settings/AccountForms.tsx"), /suppressHydrationWarning>\s*Confirmed on/);
});

test("BUG-19: the episode page names the episode in the tab, published episodes only", () => {
  const page = read("app/episode/[episodeId]/page.tsx");
  assert.match(page, /export async function generateMetadata/);
  assert.match(page, /where: \{ id: params\.episodeId, \.\.\.PUBLIC_EPISODE_WHERE \}/);
});

test("BUG-03: a page restored by Back after sign-out reloads instead of showing signed-in content", () => {
  const shell = read("components/app-shell/AppShell.tsx");
  assert.match(shell, /addEventListener\("pageshow"/);
  assert.match(shell, /event\.persisted/);
  assert.match(shell, /signingOutRef\.current = true;/);
});
