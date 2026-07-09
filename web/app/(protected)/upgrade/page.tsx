import Link from "next/link";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import db from "@/lib/db";
import PageShell from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowRight, Crown, Headphones, Sparkles, Users } from "lucide-react";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      plan: true,
      monthlyUploadCount: true,
      uploadWindowStart: true,
      name: true,
    },
  });

  if (!user) {
    return null;
  }

  const currentLimit = user.plan === "plus" ? 10 : 3;
  const nextResetAt = new Date(
    new Date(user.uploadWindowStart).getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  const uploadsLeft = Math.max(currentLimit - user.monthlyUploadCount, 0);
  const isPlus = user.plan === "plus";

  return (
    <PageShell title="Upgrade" description="Move to Plus for higher limits and priority support">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
            <div className="space-y-6 p-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-foreground" />
                {isPlus ? "You are already on Plus" : "Recommended for active teams"}
              </div>
              <div className="space-y-3">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Plus plan for teams that need more uploads and faster support.
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Upgrade from 3 uploads per month to 10 uploads per month, get
                  customer support within 2 hours, access founder time when you
                  need it, and unlock custom limits for team usage.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                  10 uploads per month
                </span>
                <span className="rounded-full border border-border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                  Support within 2 hours
                </span>
                <span className="rounded-full border border-border bg-muted/20 px-3 py-1 text-xs text-muted-foreground">
                  Founder meeting
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/api/billing/checkout">
                    <Crown className="h-4 w-4" />
                    {isPlus ? "Manage plan" : "Upgrade to Plus"}
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/upload">Back to upload</Link>
                </Button>
              </div>
            </div>

            <div className="border-t border-border bg-muted/20 p-6 lg:border-l lg:border-t-0">
              <div className="space-y-4 rounded-2xl border border-border bg-background p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Current plan
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {isPlus ? "Plus" : "Free"}
                    </p>
                  </div>
                  <div className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground">
                    {formatNumber(uploadsLeft)} uploads left
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Uploads used</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {user.monthlyUploadCount}/{currentLimit}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4">
                    <p className="text-xs font-medium text-muted-foreground">Resets on</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {nextResetAt.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-4">
                  <p className="text-xs font-medium text-muted-foreground">Best for</p>
                  <p className="mt-1 text-sm leading-6 text-foreground">
                    Teams, creators, or early customers who need a higher cap,
                    fast response times, and a more hands-on relationship.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Higher upload limits</CardTitle>
              <CardDescription>3 per month becomes 10 per month.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/30 text-foreground/80">
                <Crown className="h-4 w-4" />
              </div>
              Fewer interruptions when you are publishing consistently.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">2 hour support</CardTitle>
              <CardDescription>Priority support for blockers.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/30 text-foreground/80">
                <Headphones className="h-4 w-4" />
              </div>
              Faster answers when uploads, billing, or processing need attention.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Founder access</CardTitle>
              <CardDescription>Talk directly when it matters.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/30 text-foreground/80">
                <Sparkles className="h-4 w-4" />
              </div>
              Includes a meeting with the founder for planning, feedback, or setup.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Custom team limits</CardTitle>
              <CardDescription>Adjust usage for your workflow.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/30 text-foreground/80">
                <Users className="h-4 w-4" />
              </div>
              Useful when different teams need different upload caps or shared usage rules.
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plan comparison</CardTitle>
            <CardDescription>What changes when you move to Plus.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <div className="grid gap-0 rounded-2xl border border-border md:grid-cols-2">
              <div className="border-b border-border p-5 md:border-b-0 md:border-r">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Free
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">3 uploads / month</p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>Basic support</li>
                  <li>Standard limits</li>
                  <li>Self-serve usage</li>
                </ul>
              </div>
              <div className="p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Plus
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">10 uploads / month</p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  <li>Support within 2 hours</li>
                  <li>Founder meeting</li>
                  <li>Custom team limits</li>
                  <li>Priority treatment for operational issues</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Ready to move up?</p>
            <p className="text-sm text-muted-foreground">
              Upgrade now or keep using Free until your current cycle ends.
            </p>
          </div>
          <Button asChild>
            <Link href="/api/billing/checkout" className="inline-flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Upgrade
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
