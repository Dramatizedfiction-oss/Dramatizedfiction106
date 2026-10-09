import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { isLibraryAvatarUrl, isLibraryImagePath } from "@/lib/avatar-library";
import { prisma } from "@/lib/prisma";
import { decideImageField, deleteReplacedImage } from "@/lib/uploads/image-storage";

// Only the signed-in user's own profile picture and banner. No user id is
// accepted: the account always comes from the session. The picture comes from
// the avatar library (or null = role default); the banner is an upload.
const schema = z.object({
  image: z.string().nullable().optional(),
  bannerImage: z.string().nullable().optional(),
});

export async function PATCH(request: Request) {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  const body = await parseJsonBody(request, schema);
  if (!body.ok) return body.response;

  const current = await prisma.user.findUnique({
    where: { id: guard.user.id },
    select: { image: true, bannerImage: true },
  });
  if (!current) return badRequest();

  // Profile picture: chosen from the avatar library, or null for the role
  // default. A member's existing picture may be re-sent unchanged.
  const nextImage = typeof body.data.image === "string" ? body.data.image.trim() || null : body.data.image;
  if (typeof nextImage === "string" && nextImage !== current.image && !(await isLibraryAvatarUrl(nextImage))) {
    return badRequest("Choose a picture from the avatar library.");
  }
  const image = { value: nextImage };
  const bannerImage = decideImageField(body.data.bannerImage, current.bannerImage);
  if (!bannerImage.ok) return badRequest(bannerImage.message);

  try {
    const updated = await prisma.user.update({
      where: { id: guard.user.id },
      data: { image: image.value, bannerImage: bannerImage.value },
      select: { image: true, bannerImage: true },
    });

    // Keep the writer profile's copy of the picture in step.
    if (image.value !== undefined) {
      await prisma.authorProfile.updateMany({
        where: { userId: guard.user.id },
        data: { profileImage: updated.image },
      });
    }

    // Library pictures are shared: never delete one just because this member
    // switched away from it. (An old personal upload is still cleaned up.)
    if (!isLibraryImagePath(current.image)) await deleteReplacedImage(current.image, updated.image);
    await deleteReplacedImage(current.bannerImage, updated.bannerImage);

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    console.error("Profile image update failed.", error);
    return serverError();
  }
}
