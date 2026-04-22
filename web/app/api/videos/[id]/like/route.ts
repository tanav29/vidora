import { NextResponse } from "next/server";

import db from "@/lib/db";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const video = await db.video.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!video) {
    return new NextResponse("Not found", { status: 404 });
  }

  const updated = await db.video.update({
    where: { id },
    data: {
      likes: {
        increment: 1,
      },
    },
    select: { likes: true },
  });

  return NextResponse.json({ likes: updated.likes });
}
