import { NextResponse } from "next/server";
import { z } from "zod";
import { WRITER_ONBOARDING_KEY, getCmsArticle, isKnownCmsSlug } from "@/lib/cms";
import { getContentState, saveContent } from "@/lib/content/service";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { apiError, requireApiRole, requirePlatformOpen } from "@/lib/auth/guards";

/*
 * The old writer-onboarding endpoint, kept for compatibility. It reads and
 * writes the Administration › Content item article.writer-onboarding (Sweep
 * B3); new code uses /api/admin/content/[key].
 */
const articleSchema = z.object({
  title: z.string().trim().min(1).max(300),
  quickSectionContent: z.string().trim().min(1),
  deepSectionContent: z.string().trim().min(1),
});

// Public, read-only (closed during renovation except for CEO/Board).
export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const open = await requirePlatformOpen();
  if (!open.ok) return open.response;

  const article = await getCmsArticle(params.slug);
  if (!article) return apiError("NOT_FOUND", "Article not found.");
  return NextResponse.json(article);
}

// BOARD and CEO: saves a new version (audited, with history) like the Content editor.
export async function PATCH(req: Request, { params }: { params: { slug: string } }) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;
  if (!isKnownCmsSlug(params.slug)) return apiError("NOT_FOUND", "Article not found.");

  const parsed = await parseJsonBody(req, articleSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const state = await getContentState(WRITER_ONBOARDING_KEY);
    const result = await saveContent(guard.user.id, WRITER_ONBOARDING_KEY, state?.version ?? 0, {
      title: parsed.data.title,
      quick: parsed.data.quickSectionContent,
      deep: parsed.data.deepSectionContent,
    });
    if (!result.ok) return NextResponse.json({ error: result.message, code: result.code }, { status: result.status });
    return NextResponse.json(await getCmsArticle(params.slug));
  } catch (error) {
    console.error("CMS article update failed.", error);
    return serverError();
  }
}
