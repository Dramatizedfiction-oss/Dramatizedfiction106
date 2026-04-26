import { auth } from "@/auth";
import { getCmsArticle } from "@/lib/cms";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/utils";
import { z } from "zod";

const articleSchema = z.object({
  title: z.string().trim().min(1),
  quickSectionContent: z.string().trim().min(1),
  deepSectionContent: z.string().trim().min(1),
});

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const article = await getCmsArticle(params.slug);
  return Response.json(article);
}

export async function PATCH(
  req: Request,
  { params }: { params: { slug: string } },
) {
  const session = await auth();
  requireRole(session, ["CEO", "ADMIN"]);

  const payload = articleSchema.parse(await req.json());
  await getCmsArticle(params.slug);

  const article = await prisma.cmsArticle.upsert({
    where: { slug: params.slug },
    update: payload,
    create: {
      slug: params.slug,
      title: payload.title,
      quickSectionContent: payload.quickSectionContent,
      deepSectionContent: payload.deepSectionContent,
    },
  });

  return Response.json(article);
}
