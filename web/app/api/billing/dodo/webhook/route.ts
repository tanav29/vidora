import db from "@/lib/db";
import { dodoClient, PREMIUM_PRODUCT_ID } from "@/lib/dodo";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const secret = process.env.WEBHOOK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Dodo webhook secret is not configured" },
      { status: 500 },
    );
  }

  const body = await req.text();
  let payload: any;
  try {
    payload = dodoClient.webhooks.unwrap(body, {
      headers: Object.fromEntries(req.headers.entries()),
      key: secret,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid or unsigned webhook payload" },
      { status: 400 },
    );
  }

  console.log("Received Dodo webhook:", payload); // recieving

  const cart = await payload.data.product_cart;

  // cart has the same product key
  if (cart[0].product_id == PREMIUM_PRODUCT_ID) {
    // user bought the plus plan

    await db.user.update({
      where: {
        email: payload.data.customer.email,
      },
      data: {
        plan: "plus",
      },
    });

    return NextResponse.json({
      ok: true,
      planChanged: "plus",
    });
  }

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
    product_cart: [ [Object] ], {
            product_id: z.string(),
            quantity: z.number(),
          }
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

  return NextResponse.json({
    ok: true,
  });
}
