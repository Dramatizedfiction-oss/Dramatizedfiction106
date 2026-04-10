import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {

  const session = await auth();
  if (!session) return NextResponse.redirect("/login");

  const data = await req.formData();

  await prisma.book.create({
    data: {
      title: data.get("title"),
      description: data.get("description"),
      coverUrl: data.get("coverUrl"),
      status: data.get("status"),
      authorId: session.user.id
    }
  });

  return NextResponse.redirect(`/author/${session.user.id}`);
}
