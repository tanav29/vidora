import db from "@/lib/db";
import { dodoClient, PREMIUM_PRODUCT_ID } from "@/lib/dodo";
import { NextResponse } from "next/server";
import { z } from "zod";

const webhookMetadataSchema = z
  .object({
    userId: z.string().optional(),
  })
  .catchall(z.unknown())
  .optional();

const webhookSchema = z.object({
  business_id: z.string(),
  type: z.string(),
  data: z
    .object({
      customer: z
        .object({
          customer_id: z.string().optional(),
          email: z.string().email().optional(),
          name: z.string().optional(),
          metadata: webhookMetadataSchema,
        })
        .partial()
        .passthrough()
        .optional(),
      metadata: webhookMetadataSchema,
      product_cart: z
        .array(
          z.object({
            product_id: z.string(),
            quantity: z.number(),
          }),
        )
        .optional(),
      product_id: z.string().optional(),
      status: z.string().optional(),
    })
    .passthrough(),
  timestamp: z.string(),
});

function getUserIdentifier(payload: z.infer<typeof webhookSchema>) {
  const metadata = payload.data.metadata;
  const customerMetadata = payload.data.customer?.metadata;
  const metadataUserId =
    metadata && typeof metadata.userId === "string" ? metadata.userId : null;
  const customerMetadataUserId =
    customerMetadata && typeof customerMetadata.userId === "string"
      ? customerMetadata.userId
      : null;

  if (metadataUserId) {
    return { id: metadataUserId };
  }

  if (customerMetadataUserId) {
    return { id: customerMetadataUserId };
  }

  const email = payload.data.customer?.email;
  if (email) {
    return { email };
  }

  return null;
}

function getPlanForEvent(type: string, status?: string) {
  if (
    type === "payment.succeeded" ||
    (type.startsWith("subscription.") && status === "active")
  ) {
    return "premium" as const;
  }

  if (
    type.startsWith("subscription.") &&
    (status === "cancelled" ||
      status === "expired" ||
      status === "failed" ||
      status === "on_hold")
  ) {
    return "free" as const;
  }

  return null;
}

function isPremiumBillingEvent(payload: z.infer<typeof webhookSchema>) {
  if (payload.type.startsWith("subscription.")) {
    return payload.data.product_id === PREMIUM_PRODUCT_ID;
  }

  if (payload.type.startsWith("payment.")) {
    return (
      payload.data.product_cart?.some(
        (item) => item.product_id === PREMIUM_PRODUCT_ID,
      ) ?? false
    );
  }

  return false;
}

export async function POST(req: Request) {
  const secret = process.env.WEBHOOK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Dodo webhook secret is not configured" },
      { status: 500 },
    );
  }

  const body = await req.text();
  let payload: z.infer<typeof webhookSchema>;
  try {
    payload = webhookSchema.parse(
      dodoClient.webhooks.unwrap(body, {
        headers: Object.fromEntries(req.headers.entries()),
        key: secret,
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid webhook payload", issues: error.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Invalid or unsigned webhook payload" },
      { status: 400 },
    );
  }

  console.log("Received Dodo webhook:", payload); // recieving

  /*{
  business_id: 'bus_qK7kFC2h1Z6nNH4GjUk5c',
  type: 'payment.succeeded',
  data: {
    customer: {
      customer_id: 'cus_0Nil0DX7WBjL4Am9O5eee',
      email: '><',
      name: '><',
      metadata: {},
      phone_number: '><'
    },
    metadata: {},
    product_cart: [ [Object] ],
    status: 'succeeded',
    billing: {
      city: '><',
      country: '><',
      state: '><',
      street: '><',
      zipcode: '><'
    },
    brand_id: 'brnd_0Niktg8TI7OjAHQoJWvie',
    business_id: 'bus_qK7kFC2h1Z6nNH4GjUk5c',
    card_holder_name: null,
    card_issuing_country: null,
    card_last_four: '4242',
    card_network: 'visa',
    card_type: 'credit',
    checkout_session_id: 'cks_0Nil1KZ28VMgiHOW18MQq',
    created_at: '2026-07-08T18:56:35.543548Z',
    currency: 'USD',
    custom_field_responses: null,
    digital_products_delivered: false,
    discount_id: null,
    discounts: null,
    disputes: [],
    error_code: null,
    error_message: null,
    invoice_id: 'inv_0Nil1oBmHzaXq5QaTUpmi',
    invoice_url: 'https://test.dodopayments.com/invoices/payments/pay_0Nil1oBmHzaXq5QOM2AgN',
    payload_type: 'Payment',
    payment_id: 'pay_0Nil1oBmHzaXq5QOM2AgN',
    payment_link: 'https://test.checkout.dodopayments.com/aGnE79nG',
    payment_method: 'card',
    payment_method_type: 'credit',
    payment_provider: 'dodo',
    refund_status: null,
    refunds: [],
    retry_attempt: 0,
    settlement_amount: 1180,
    settlement_currency: 'USD',
    settlement_tax: 180,
    subscription_id: null,
    tax: 180,
    total_amount: 1180,
    updated_at: null
  },
  timestamp: '2026-07-08T18:56:53.040056Z'
}*/

  const plan = getPlanForEvent(payload.type, payload.data.status);
  if (!plan) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (!isPremiumBillingEvent(payload)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const where = getUserIdentifier(payload);
  if (!where) {
    return NextResponse.json(
      { error: "Webhook payload did not identify a user" },
      { status: 400 },
    );
  }

  const updatedUser = await db.user.updateMany({
    where,
    data: {
      plan,
    },
  });

  if (updatedUser.count === 0) {
    return NextResponse.json(
      { error: "Webhook payload did not match a user record" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    updated: updatedUser.count,
    plan,
  });
}
