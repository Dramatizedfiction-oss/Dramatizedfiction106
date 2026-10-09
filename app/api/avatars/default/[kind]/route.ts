import { NextResponse } from "next/server";
import { resolveDefaultAvatarUrl } from "@/lib/admin/avatars-service";
import { BUILT_IN_AVATARS } from "@/lib/avatars";

export const dynamic = "force-dynamic";

/*
 * GET /api/avatars/default/reader|writer: redirects to the current default
 * picture (Administration's choice, else the built-in file). Every default
 * avatar on the site points here, so changing a default in Administration
 * applies everywhere without touching members' own pictures.
 */
export async function GET(request: Request, { params }: { params: { kind: string } }) {
  const kind = params.kind === "writer" ? "writer" : params.kind === "reader" ? "reader" : null;
  if (!kind) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let target: string = BUILT_IN_AVATARS[kind];
  try {
    target = (await resolveDefaultAvatarUrl(kind)) ?? target;
  } catch (error) {
    console.error("Default avatar lookup failed; using the built-in avatar.", error);
  }

  const response = NextResponse.redirect(new URL(target, request.url), 302);
  response.headers.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return response;
}
