import Player from "./player";
import WatchClient from "./watch-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import db from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const video = await db.video.findUnique({ where: { id } });
  if (!video) notFound();

  const user = await db.user.findUnique({ where: { id: video.userId } });

  const timeAgo = formatDistanceToNow(new Date(video.createdAt), {
    addSuffix: true,
  });

  const formatViews = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toLocaleString();
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : "V";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 items-center px-4 sm:px-6 lg:px-8">
          <Link href="/home">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Player */}
        <div
          className="relative w-full overflow-hidden rounded-2xl bg-black border shadow-2xl"
          style={{ aspectRatio: "16/9" }}
        >
          {video.status === "done" ? (
            <Player id={id} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <Activity className="h-6 w-6 animate-pulse text-white/50" />
              </div>
              <p className="text-sm font-medium text-white/40 tracking-wide">
                Processing video&hellip;
              </p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-5">
          {/* Title */}
          <h1 className="text-xl font-semibold leading-snug tracking-tight text-foreground">
            {video.title}
          </h1>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
            {/* Author + stats */}
            <div className="flex items-center gap-3">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? "User"}
                  className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-border/60"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary ring-2 ring-border/60">
                  {initials}
                </div>
              )}
              <div className="leading-tight">
                <p className="text-sm font-medium text-foreground">
                  {user?.name ?? "Unknown"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatViews(video.views ?? 0)} views
                  <span className="mx-1.5 opacity-40">&bull;</span>
                  {timeAgo}
                </p>
              </div>
            </div>

            {/* Actions */}
            <WatchClient videoId={id} initialLikes={video.likes ?? 0} />
          </div>

          {/* Description */}
          {video.description && (
            <div className="mt-5 rounded-xl border border-border/50 bg-muted/40 px-4 py-3.5">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {video.description}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
