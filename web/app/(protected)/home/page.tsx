import { auth } from "@/lib/auth";
import db from "@/lib/db";
import VideoCard from "@/components/video-card";
import PageShell from "@/components/page-shell";
import { Video } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session?.user?.id) return null;

  const videos = await db.video.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <PageShell
      title="Videos"
      description={videos.length > 0 ? `${videos.length} total` : undefined}
      right={
        <Button render={<Link href="/upload" />} size="sm" nativeButton={false}>
          Upload
        </Button>
      }
    >
      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/10 p-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40 text-foreground/80">
            <Video className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-xs tracking-tight text-foreground">No videos yet</h3>
            <p className="text-xs text-muted-foreground">Upload your first video to get started.</p>
          </div>
          <Button render={<Link href="/upload" />} variant="outline" size="sm" className="h-9" nativeButton={false}>
            Upload video
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
