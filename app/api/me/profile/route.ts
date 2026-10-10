import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { PROFILE_LIMITS, PROFILE_LINK_FIELDS, normalizeProfileLink } from "@/lib/profile";

/*
 * The signed-in user's own profile text: bio, public links, and whether their
 * reading profile's content (Library…) is PRIVATE or PUBLIC. The display name
 * is changed on Settings > Account (/api/me/account/name), not here.
 * No user id is accepted (the account always comes from the session), and the
 * schema is strict: any other key (role, writerStatus, email, id, image, ...)
 * rejects the whole request. Pictures go through /api/me/profile-images.
 */
const optionalText = z.string().max(2000).nullable().optional();

const schema = z
  .object({
    bio: optionalText,
    websiteUrl: optionalText,
    twitterUrl: optionalText,
    instagramUrl: optionalText,
    youtubeUrl: optionalText,
    discordUrl: optionalText,
    readingProfileVisibility: z.enum(["PRIVATE", "PUBLIC"]).optional(),
  })
  .strict();

export async function PATCH(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return badRequest("Malformed JSON body.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return badRequest("Only your bio, links and profile visibility can be changed here.");
  const input = parsed.data;

  const data: Record<string, string | null> = {};
  if (input.readingProfileVisibility) data.readingProfileVisibility = input.readingProfileVisibility;

  if (input.bio !== undefined) {
    const bio = input.bio?.trim() ?? "";
    if (bio.length > PROFILE_LIMITS.bio) return badRequest(`Bios can be up to ${PROFILE_LIMITS.bio} characters.`);
    data.bio = bio || null;
  }

  for (const field of PROFILE_LINK_FIELDS) {
    const value = input[field.key];
    if (value === undefined) continue;
    const link = normalizeProfileLink(value);
    if (!link.ok) return badRequest(`${field.label}: ${link.message}`);
    data[field.key] = link.value;
  }

  if (Object.keys(data).length === 0) return badRequest("Nothing to update.");

  try {
    const updated = await prisma.user.update({
      where: { id: guard.user.id },
      data,
      select: {
        name: true,
        bio: true,
        websiteUrl: true,
        twitterUrl: true,
        instagramUrl: true,
        youtubeUrl: true,
        discordUrl: true,
        readingProfileVisibility: true,
      },
    });

    // Writers keep a copy of their bio on AuthorProfile.
    if (data.bio !== undefined) {
      await prisma.authorProfile.updateMany({
        where: { userId: guard.user.id },
        data: { bio: updated.bio },
      });
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error("Profile update failed.", error);
    return serverError();
  }
}
