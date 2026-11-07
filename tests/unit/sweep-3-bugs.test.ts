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

test("BUG-09: the save route reads the base version, and refuses a bad one", async () => {
  const { parseBaseLastSavedAt } = await import("@/lib/api/writer-studio-request");
  assert.deepEqual(parseBaseLastSavedAt(undefined), { ok: true, value: null });
  assert.deepEqual(parseBaseLastSavedAt(null), { ok: true, value: null });
  const stamp = "2026-11-06T08:15:30.123Z";
  const parsed = parseBaseLastSavedAt(stamp);
  assert.ok(parsed.ok && parsed.value?.toISOString() === stamp, "millisecond precision survives");
  assert.deepEqual(parseBaseLastSavedAt("yesterday-ish"), { ok: false });

  // The check is in the update's own where clause (atomic), and only a miss with a base becomes 409.
  const route = read("app/api/writer-studio/episodes/[episodeId]/route.ts");
  assert.match(route, /where: \{ id: owned\.episode\.id, \.\.\.\(base\.value \? \{ lastSavedAt: base\.value \} : \{\}\) \}/);
  assert.match(route, /if \(base\.value && isRecordNotFoundError\(error\)\) return editedElsewhere\(\);/);
});

test("BUG-09: a 409 EDITED_ELSEWHERE becomes a 'conflict' that stops autosave", async () => {
  const { saveEpisode } = await import("@/lib/writer-studio/api");
  const { autosaveReducer, deriveSaveStatus, initialAutosaveState, isRetryable } = await import(
    "@/components/writer-studio/editor/autosave-state"
  );
  const realFetch = globalThis.fetch;
  let sent: Record<string, unknown> | null = null;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    sent = JSON.parse(String(init.body));
    return new Response(JSON.stringify({ error: "long server text", code: "EDITED_ELSEWHERE" }), { status: 409 });
  }) as typeof fetch;
  try {
    const result = await saveEpisode("ep1", { body: "<p>x</p>", baseLastSavedAt: "2026-11-06T08:15:30.123Z" });
    assert.equal(sent!.baseLastSavedAt, "2026-11-06T08:15:30.123Z", "the base is sent");
    assert.ok(!result.ok);
    assert.equal(result.kind, "conflict");
    assert.equal(isRetryable("conflict"), false, "never retried automatically");

    let state = autosaveReducer(initialAutosaveState(null), { type: "edit" });
    state = autosaveReducer(state, { type: "saveStarted", version: 1 });
    state = autosaveReducer(state, { type: "saveFailed", version: 1, kind: result.kind, message: result.message, at: 0 });
    const status = deriveSaveStatus(state);
    assert.equal(status.kind, "blocked");
    assert.equal(status.kind === "blocked" && status.reason, "conflict");
  } finally {
    globalThis.fetch = realFetch;
  }

  // Other 409s keep their old meaning.
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: "Taken", code: "CONFLICT" }), { status: 409 })) as typeof fetch;
  try {
    const other = await saveEpisode("ep1", {});
    assert.ok(!other.ok && other.kind === "rejected" && other.message === "Taken");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("BUG-09: the editor sends its base, keeps it current, and offers a reload on conflict", () => {
  const editor = read("components/writer-studio/editor/EpisodeEditor.tsx");
  assert.match(editor, /baseLastSavedAt: baseLastSavedAt\.current,/);
  assert.match(editor, /baseLastSavedAt\.current = lastSavedAt;/, "after each save");
  assert.match(editor, /baseLastSavedAt\.current = result\.data\.episode\.lastSavedAt;/, "after publishing");
  assert.match(editor, /status\.reason === "conflict"/);
  assert.match(editor, /if \(editedElsewhere\) writeBackupNow\(\);/, "this tab's text is kept on the device");
});

test("BUG-03: a page restored by Back after sign-out reloads instead of showing signed-in content", () => {
  const shell = read("components/app-shell/AppShell.tsx");
  assert.match(shell, /addEventListener\("pageshow"/);
  assert.match(shell, /event\.persisted/);
  assert.match(shell, /signingOutRef\.current = true;/);
});
