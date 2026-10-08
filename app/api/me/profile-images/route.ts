import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, parseJsonBody, serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { decideImageField, deleteReplacedImage } from "@/lib/uploads/image-storage";

// Only the signed-in user's own profile picture and banner. No user id is
// accepted: the account always comes from the session.
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

  const image = decideImageField(body.data.image, current.image);
  if (!image.ok) return badRequest(image.message);
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

    await deleteReplacedImage(current.image, updated.image);
    await deleteReplacedImage(current.bannerImage, updated.bannerImage);

    return NextResponse.json({ success: true, ...updated });
  } catch (error) {
    console.error("Profile image update failed.", error);
    return serverError();
  }
}
