import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { ownProfileHref, parseProfileView, profileHref } from "@/lib/profile-links";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("profile links", () => {
  test("writers' profiles are their author profile; everyone else's is their reading profile", () => {
    for (const role of ["WRITER", "BOARD", "CEO", "AUTHOR", "ADMIN"]) {
      assert.equal(profileHref({ id: "w1", role }), "/author/w1", role);
      assert.equal(profileHref({ id: "w1", role }, "reading"), "/author/w1?view=reading", role);
    }
    for (const role of ["READER", null, undefined, "nonsense"]) assert.equal(profileHref({ id: "r1", role }), "/reader/r1", String(role));
  });

  test("your own Profile goes to your own account, never someone else's", () => {
    assert.equal(ownProfileHref({ id: "me", role: "WRITER" }), "/author/me");
    assert.equal(ownProfileHref({ id: "me", role: "READER" }), "/reader");
    assert.equal(ownProfileHref({ id: null, role: "WRITER" }), "/reader", "no id: the session-based page");
    // The id in the link is always the one passed in.
    for (const id of ["a", "b", "cmv6iqnop0000g5l0pfi59z45"]) assert.equal(ownProfileHref({ id, role: "CEO" }), `/author/${id}`);
  });

  test("the view comes from the URL, Writing by default", () => {
    assert.equal(parseProfileView("reading"), "reading");
    for (const value of [undefined, "", "writing", "READING", "admin"]) assert.equal(parseProfileView(value), "writing");
  });

  test("every profile link uses the shared rule (no hard-coded /reader links for people)", () => {
    assert.match(read("components/app-shell/ProfileMenu.tsx"), /href=\{ownProfileHref\(user\)\}/);
    const comments = read("components/engagement/CommentsSection.tsx");
    assert.match(comments, /profileHref\(comment\.author\)/);
    assert.doesNotMatch(comments, /\/reader\/\$\{/);
    assert.match(read("components/avatar/AvatarPlace.tsx"), /ownProfileHref\(member\)/);
  });

  test("profile pages redirect to the right kind of profile", () => {
    assert.match(read("app/reader/page.tsx"), /if \(isWriterRole\(reader\.role\)\) redirect\(profileHref\(reader, "reading"\)\)/);
    assert.match(read("app/reader/[readerId]/page.tsx"), /if \(isWriterRole\(reader\.role\)\) redirect\(profileHref\(reader, "reading"\)\)/);
    assert.match(read("app/author/[authorId]/page.tsx"), /if \(!isWriterRole\(author\.role\)\) redirect\(profileHref\(author\)\)/);
  });
});

describe("AI-tag reports", () => {
  test("filing needs a signed-in member; reviewing needs Board/CEO", () => {
    assert.match(read("app/api/reports/ai-tag/route.ts"), /await requireApiUser\(\)[\s\S]*?if \(!guard\.ok\) return guard\.response/);
    assert.match(read("app/api/admin/ai-tag-reports/[reportId]/route.ts"), /requireApiRole\("BOARD"\)/);
  });

  test("the report button sends real reports (no placeholder left)", () => {
    const button = read("components/ReportAiTagButton.tsx");
    assert.match(button, /\/api\/reports\/ai-tag/);
    assert.doesNotMatch(button, /placeholder report|nothing was sent/i);
  });

  test("tags are checked as stored values; the known serialization helpers aren't touched", () => {
    const service = read("lib/ai-tag-reports.ts");
    assert.doesNotMatch(service, /serializeAiUsageTag|deserializeAiUsageTag/);
    assert.match(service, /"AI_FREE", "AI_CORRECTED", "AI_HEAVY", "AI_WRITTEN"/);
  });
});
