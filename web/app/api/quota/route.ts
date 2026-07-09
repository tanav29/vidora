import { auth } from "@/lib/auth";
import db from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      monthlyUploadCount: true,
      uploadWindowStart: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const userLimits = user.plan == "plus" ? 10 : 3;

  return NextResponse.json({
    cycleStart: user.uploadWindowStart,
    uploads: user.monthlyUploadCount,
    limit: userLimits,
    plan: user.plan,
  });
}
