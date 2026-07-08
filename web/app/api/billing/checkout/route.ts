import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const checkoutUrl = process.env.DODO_CHECKOUT_URL;
  if (!checkoutUrl) {
    return NextResponse.json(
      { error: "Dodo checkout URL is not configured" },
      { status: 500 },
    );
  }

  const target = checkoutUrl.startsWith("http")
    ? checkoutUrl
    : new URL(checkoutUrl, new URL(req.url).origin).toString();

  return NextResponse.redirect(target, 302);
}
