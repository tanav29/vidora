"use client";

import { useEffect, useState } from "react";
import { Share2, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

interface WatchClientProps {
  videoId: string;
  initialLikes: number;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

export default function WatchClient({
  videoId,
  initialLikes,
}: WatchClientProps) {
  const likedKey = `vidora:liked:${videoId}`;

  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);

  // Restore liked state from sessionStorage on mount
  useEffect(() => {
    if (sessionStorage.getItem(likedKey)) {
      setLiked(true);
    }
  }, [likedKey]);

  // Track view
  useEffect(() => {
    const viewedKey = `vidora:viewed:${videoId}`;
    if (sessionStorage.getItem(viewedKey)) return;

    void fetch(`/api/videos/${videoId}/view`, { method: "POST" }).then(() => {
      sessionStorage.setItem(viewedKey, "1");
    });
  }, [videoId]);

  const handleLike = async () => {
    if (liked || liking) return;

    // Optimistic update
    setLiked(true);
    setLikes((prev) => prev + 1);
    setLiking(true);

    try {
      const res = await fetch(`/api/videos/${videoId}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { likes: number };
      setLikes(data.likes);
      sessionStorage.setItem(likedKey, "1");
    } catch {
      // Roll back on failure
      setLiked(false);
      setLikes((prev) => prev - 1);
      toast.error("Couldn't register your like. Try again.");
    } finally {
      setLiking(false);
    }
  };

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    toast.success("Watch link copied");
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleLike}
        disabled={liked || liking}
        className={cn(
          "gap-1.5 rounded-full px-4 transition-colors",
          liked &&
            "border-primary/40 bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
        )}
      >
        <ThumbsUp
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            liked && "fill-primary",
          )}
        />
        <span>{formatCount(likes)}</span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 rounded-full px-4"
        onClick={copyShareLink}
      >
        <Share2 className="h-3.5 w-3.5" />
        Share
      </Button>
    </div>
  );
}
