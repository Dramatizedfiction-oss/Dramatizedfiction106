import { NextResponse } from "next/server";
import { z } from "zod";
import { getCmsArticle, isKnownCmsSlug } from "@/lib/cms";
import { prisma } from "@/lib/prisma";
import { parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { apiError, requireApiRole } from "@/lib/auth/guards";

const articleSchema = z.object({
  title: z.string().trim().min(1).max(300),
  quickSectionContent: z.string().trim().min(1),
  deepSectionContent: z.string().trim().min(1),
});

// Public, read-only.
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const article = await getCmsArticle(params.slug);

  if (!article) {
    return apiError("NOT_FOUND", "Article not found.");
  }

  return NextResponse.json(article);
}

// BOARD and CEO may edit the platform's known articles (writer onboarding).
export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const guard = await requireApiRole("BOARD");
  if (!guard.ok) return guard.response;

  if (!isKnownCmsSlug(params.slug)) {
    return apiError("NOT_FOUND", "Article not found.");
  }

  const parsed = await parseJsonBody(req, articleSchema);
  if (!parsed.ok) return parsed.response;
  const payload = parsed.data;

  try {
    const article = await prisma.cmsArticle.upsert({
      where: { slug: params.slug },
      update: payload,
      create: { slug: params.slug, ...payload },
      select: {
        title: true,
        quickSectionContent: true,
        deepSectionContent: true,
        lastUpdated: true,
      },
    });

    return NextResponse.json(article);
  } catch (error) {
    console.error("CMS article update failed.", error);
    return serverError();
  }
}
