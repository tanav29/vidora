import DodoPayments from "dodopayments";

export const PREMIUM_PRODUCT_ID = "pdt_0NiktpLIrpLxOZ49bgP7d";

export const dodoClient = new DodoPayments({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY,
  webhookKey: process.env.WEBHOOK_SECRET_KEY,
  environment: "test_mode",
});
