import { auth } from "@/lib/auth";
import { dodoClient, PREMIUM_PRODUCT_ID } from "@/lib/dodo";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await auth.api.getSession({
    headers: await headers(),
  });

  if (user?.user.email === undefined || user?.user.name === undefined) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const session = await dodoClient.checkoutSessions.create({
    product_cart: [{ product_id: PREMIUM_PRODUCT_ID, quantity: 1 }],
    customer: { email: user?.user.email, name: user?.user.name },
    metadata: { userId: user.user.id },
    return_url: "http://localhost:3000/", // make custom ui page
  });

  if (!session.checkout_url) {
    return NextResponse.json(
      { error: "Dodo checkout URL is not configured" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(session.checkout_url);
}
