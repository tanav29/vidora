"use client";

import type { SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "./ui/button";
import Link from "next/link";
import { toast } from "sonner";

import { getThumbnailUrl } from "@/lib/video-urls";

interface VideoCardProps {
  video: {
    id: string;
    title: string;
    views: number;
    likes: number;
    status: string;
    createdAt: Date;
    thumbnail?: string | null;
  };
}

export default function VideoCard({ video }: VideoCardProps) {
  const router = useRouter();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const stopEvent = (event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleRename = async (event: SyntheticEvent) => {
    stopEvent(event);
    const nextTitle = window.prompt("Rename video", video.title)?.trim();
    if (!nextTitle || nextTitle === video.title) return;

    const res = await fetch(`/api/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: nextTitle }),
    });

    if (!res.ok) {
      toast.error("Failed to rename video");
      return;
    }

    toast.success("Video renamed");
    router.refresh();
  };

  const handleDelete = async (event: SyntheticEvent) => {
    stopEvent(event);
    if (!window.confirm(`Delete "${video.title}"?`)) return;

    const res = await fetch(`/api/videos/${video.id}`, { method: "DELETE" });

    if (!res.ok) {
      toast.error("Failed to delete video");
      return;
    }

    toast.success("Video deleted");
    router.refresh();
  };

  const handleCopyStreamUrl = async (event: SyntheticEvent) => {
    stopEvent(event);
    const res = await fetch(`/api/videos/${video.id}/share`, {
      cache: "no-store",
    });

    if (!res.ok) {
      toast.error("Failed to load video links");
      return;
    }

    const data = (await res.json()) as { streamUrl?: string };
    if (!data.streamUrl) {
      toast.error("Stream URL is not available yet");
      return;
    }

    await navigator.clipboard.writeText(data.streamUrl);
    toast.success("Stream URL copied");
  };

  const handleShare = async (event: SyntheticEvent) => {
    stopEvent(event);
    const url = `${window.location.origin}/w/${video.id}`;
    await navigator.clipboard.writeText(url);
    toast.success("Watch link copied");
  };

  const statusConfig = {
    failed: { label: "Failed", class: "bg-destructive/10 text-destructive" },
    processing: {
      label: "Processing",
      class: "bg-amber-500/10 text-amber-600",
    },
    done: { label: null, class: "" },
  };

  const status =
    video.status === "failed"
      ? "failed"
      : video.status !== "done"
        ? "processing"
        : "done";

  return (
    <Link href={`/w/${video.id}`} className="group block">
      <div className="relative overflow-hidden rounded-lg bg-muted aspect-video mb-3 border border-transparent group-hover:border-border/50 transition-all duration-200">
        <img
          src={getThumbnailUrl(video.id, video.thumbnail)}
          alt={video.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />

        {status !== "done" && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-[10px] font-medium rounded">
            {statusConfig[status].label}
          </div>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 pl-2">
          <h3 className="font-medium text-foreground text-sm leading-tight line-clamp-2 group-hover:text-foreground/80 transition-colors">
            {video.title}
          </h3>

          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{formatDate(video.createdAt)}</span>
            {status === "done" && (
              <>
                <span className="text-border">•</span>
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  <span>{formatNumber(video.views)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={stopEvent}
            >
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={handleRename}
              className="cursor-pointer text-xs"
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleCopyStreamUrl}
              className="cursor-pointer text-xs"
            >
              Copy stream URL
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleShare}
              className="cursor-pointer text-xs"
            >
              Copy watch link
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="cursor-pointer text-xs text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Link>
  );
}
