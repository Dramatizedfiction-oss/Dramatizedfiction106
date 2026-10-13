import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiRole } from "@/lib/auth/guards";
import { getEditorDocument, saveAuthorProfile } from "@/lib/author-profile";
import { normalizeAuthorProfile } from "@/lib/author-profile-rules";
import { screenProfileContent } from "@/lib/profile-moderation";

/*
 * The signed-in writer's own author page sections (Sweep 14): bio, the five
 * show/hide switches, Library, About cards and Links, saved together.
 * Writers only (WRITER, BOARD, CEO); JSON 401/403. No user id is accepted:
 * the account always comes from the session, and only that member's rows are
 * ever matched, updated or deleted. Text limits, URL schemes, series ownership
 * and uploaded covers are all checked here (lib/author-profile-rules.ts,
 * lib/author-profile.ts). Returns the saved document with its ids.
 */

// Shape only; lengths are generous here and enforced exactly by normalizeAuthorProfile.
const text = (max: number) => z.string().max(max);
const id = z.string().min(1).max(64).optional();

const schema = z
  .object({
    bio: text(2000),
    sections: z
      .object({ bio: z.boolean(), library: z.boolean(), about: z.boolean(), onSite: z.boolean(), links: z.boolean() })
      .strict(),
    library: z
      .array(
        z.discriminatedUnion("kind", [
          z.object({ id, kind: z.literal("BOOK"), title: text(1000), note: text(1000), url: text(2000), coverImage: text(2000) }).strict(),
          z.object({ id, kind: z.literal("SERIES"), seriesId: z.string().min(1).max(64) }).strict(),
        ]),
      )
      .max(50),
    about: z.array(z.object({ id, prompt: text(1000), answer: text(4000) }).strict()).max(50),
    links: z.array(z.object({ id, label: text(1000), url: text(2000), subtext: text(1000) }).strict()).max(50),
  })
  .strict();

export async function PUT(request: Request) {
  const guard = await requireApiRole("WRITER");
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;

  const normalized = normalizeAuthorProfile(body.data);
  if (!normalized.ok) return badRequest(normalized.message);

  const screened = await screenProfileContent(guard.user.id, normalized.value);
  if (!screened.ok) return NextResponse.json({ error: screened.message, code: "CONTENT_REFUSED" }, { status: 422 });

  try {
    const result = await saveAuthorProfile(guard.user.id, normalized.value);
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });
    return NextResponse.json({ success: true, profile: await getEditorDocument(guard.user.id) });
  } catch (error) {
    console.error("Saving author profile failed.", error);
    return serverError();
  }
}
