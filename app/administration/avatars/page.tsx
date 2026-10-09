import { auth } from "@/auth";
import AvatarLibrary from "@/components/admin/AvatarLibrary";
import { listPlatformAvatars } from "@/lib/admin/avatars-service";
import { BUILT_IN_AVATARS } from "@/lib/avatars";
import { requireAdministrationPage } from "@/lib/utils";

export default async function AvatarsPage() {
  requireAdministrationPage(await auth(), "/administration/avatars");
  const { avatars, readerDefaultId, writerDefaultId } = await listPlatformAvatars();

  return (
    <AvatarLibrary
      avatars={avatars.map((avatar) => ({
        id: avatar.id,
        label: avatar.label,
        url: avatar.url,
        addedBy: avatar.createdBy?.name ?? null,
      }))}
      readerDefaultId={readerDefaultId}
      writerDefaultId={writerDefaultId}
      builtIn={BUILT_IN_AVATARS}
    />
  );
}
