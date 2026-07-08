import db from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const webhookSchema = z.object({
  email: z.string().email().optional(),
  customer_email: z.string().email().optional(),
  userId: z.string().optional(),
  plan: z.string().optional(),
  status: z.string().optional(),
});

export async function POST(req: Request) {
  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Dodo webhook secret is not configured" },
      { status: 500 },
    );
  }

  const providedSecret = req.headers.get("x-dodo-webhook-secret");
  if (providedSecret !== secret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let payload: z.infer<typeof webhookSchema>;
  try {
    payload = webhookSchema.parse(await req.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid webhook payload", issues: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const paid =
    payload.plan === "premium" ||
    payload.status === "paid" ||
    payload.status === "completed" ||
    payload.status === "succeeded";

  if (!paid) {
    return NextResponse.json(
      { error: "Webhook did not indicate a completed payment" },
      { status: 400 },
    );
  }

  const where = payload.userId
    ? { id: payload.userId }
    : payload.email
      ? { email: payload.email }
      : payload.customer_email
        ? { email: payload.customer_email }
        : null;

  if (!where) {
    return NextResponse.json(
      { error: "Webhook payload did not identify a user" },
      { status: 400 },
    );
  }

  const result = await db.user.updateMany({
    where,
    data: {
      plan: "premium",
    },
  });

  return NextResponse.json({
    ok: true,
    upgraded: result.count,
  });
}
