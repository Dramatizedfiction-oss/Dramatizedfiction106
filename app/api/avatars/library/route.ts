import { NextResponse } from "next/server";
import { serverError } from "@/lib/api/writer-studio-request";
import { requireApiUser } from "@/lib/auth/guards";
import { listLibraryAvatars } from "@/lib/avatar-library";

/** The avatar library, for the profile editor's picture chooser. Signed-in members only. */
export async function GET() {
  const guard = await requireApiUser();
  if (!guard.ok) return guard.response;

  try {
    return NextResponse.json({ avatars: await listLibraryAvatars() });
  } catch (error) {
    console.error("Avatar library read failed.", error);
    return serverError();
  }
}
