export const FREE_MONTHLY_UPLOAD_LIMIT = 3;
export const PREMIUM_MONTHLY_UPLOAD_LIMIT = 10;

export type UploadPlan = "free" | "premium";

export function normalizeUploadPlan(plan: string | null | undefined): UploadPlan {
  return plan === "premium" ? "premium" : "free";
}

export function getUploadLimit(plan: string | null | undefined) {
  return normalizeUploadPlan(plan) === "premium"
    ? PREMIUM_MONTHLY_UPLOAD_LIMIT
    : FREE_MONTHLY_UPLOAD_LIMIT;
}

export function getCurrentMonthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function getNextMonthStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export function getUploadQuota({
  plan,
  monthlyUploadCount,
  uploadWindowStart,
  now = new Date(),
}: {
  plan: string | null | undefined;
  monthlyUploadCount: number;
  uploadWindowStart: Date | string;
  now?: Date;
}) {
  const normalizedPlan = normalizeUploadPlan(plan);
  const monthStart = getCurrentMonthStart(now);
  const windowStart = new Date(uploadWindowStart);
  const resetAt = getNextMonthStart(now);
  const used = windowStart < monthStart ? 0 : monthlyUploadCount;
  const limit = getUploadLimit(normalizedPlan);

  return {
    plan: normalizedPlan,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt,
  };
}
