import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Crown, Mail, User } from "lucide-react";

import PageShell from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      plan: true,
      monthlyUploadCount: true,
      uploadWindowStart: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/");
  }

  const limit = user.plan === "plus" ? 10 : 3;
  const resetAt = new Date(
    new Date(user.uploadWindowStart).getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  const uploadsLeft = Math.max(limit - user.monthlyUploadCount, 0);

  return (
    <PageShell title="Profile" description="Your account at a glance">
      <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Basic information tied to your workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/30 text-foreground/80">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name ?? "User avatar"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-semibold text-foreground">
                    {user.name ?? "Unnamed user"}
                  </h2>
                  <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {user.plan === "plus" ? "Plus" : "Free"}
                  </span>
                </div>
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground">Joined</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatDate(user.createdAt)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <p className="text-xs font-medium text-muted-foreground">Current cycle</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatDate(user.uploadWindowStart)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage</CardTitle>
              <CardDescription>Monthly upload allowance and reset timing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Plan</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                    <Crown className="h-3.5 w-3.5" />
                    {user.plan === "plus" ? "Plus" : "Free"}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Uploads used</span>
                  <span className="text-sm font-medium text-foreground">
                    {user.monthlyUploadCount}/{limit}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Uploads left</span>
                  <span className="text-sm font-medium text-foreground">
                    {uploadsLeft}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Resets on</span>
                  <span className="text-sm font-medium text-foreground">
                    {formatDate(resetAt)}
                  </span>
                </div>
              </div>

              {user.plan === "free" ? (
                <Button asChild className="w-full">
                  <Link href="/api/billing/checkout">Upgrade to Plus</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>Common account actions in one place.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/upload">Upload a video</Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start">
                <Link href="/home">Back to videos</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
