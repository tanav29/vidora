import { auth } from "@/lib/auth";
import db from "@/lib/db";
import { getCurrentMonthStart, getUploadQuota } from "@/lib/upload-quota";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
    return new NextResponse("Not found", { status: 404 });
  }

  const monthStart = getCurrentMonthStart();
  const quota = getUploadQuota({
    plan: user.plan,
    monthlyUploadCount: user.monthlyUploadCount,
    uploadWindowStart:
      user.uploadWindowStart < monthStart ? monthStart : user.uploadWindowStart,
  });

  return NextResponse.json(quota, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
