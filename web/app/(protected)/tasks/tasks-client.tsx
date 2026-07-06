"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";

import TranscodingItem from "@/components/transcoding-item";

type Video = {
  id: string;
  title: string;
  views: number;
  likes: number;
  status: string;
  createdAt: string;
  thumbnail?: string | null;
};

type ClientVideo = Omit<Video, "createdAt"> & { createdAt: Date };

async function fetchPendingVideos(): Promise<Video[]> {
  const res = await fetch("/api/videos?status=pending,processing,failed", {
    cache: "no-store",
    headers: {
      accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to load videos");
  }

  return res.json();
}

export default function TasksClient() {
  const { data: videos = [] } = useQuery({
    queryKey: ["videos", "jobs"],
    queryFn: fetchPendingVideos,
    refetchInterval: 5000,
    staleTime: 2000,
  });

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/10 p-12 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/40 text-foreground/80">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <h3 className="font-semibold text-xs tracking-tight text-foreground">No active transcoding</h3>
          <p className="text-xs text-muted-foreground">
            No pending, processing, or failed jobs right now.
          </p>
        </div>
      </div>
    );
  }

  const hydratedVideos: ClientVideo[] = videos.map((video) => ({
    ...video,
    createdAt: new Date(video.createdAt),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {hydratedVideos.map((video) => (
        <TranscodingItem key={video.id} video={video} />
      ))}
    </div>
  );
}
