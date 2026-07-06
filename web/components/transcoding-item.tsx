"use client";

import { useEffect, useState } from "react";

interface TranscodingItemProps {
  video: {
    id: string;
    title: string;
    views: number;
    likes: number;
    status: string;
    createdAt: Date;
  };
}

export default function TranscodingItem({ video }: TranscodingItemProps) {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const fetchPercent = async () => {
      try {
        const res = await fetch(`/api/status/${video.id}`);
        const data = await res.json();
        setPercent(data.percent);
      } catch (error) {
        console.error("Failed to fetch status:", error);
      }
    };

    // Initial fetch
    fetchPercent();

    // Poll every 2 seconds
    const interval = setInterval(fetchPercent, 1000);

    return () => clearInterval(interval);
  }, [video.id]);

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm hover:border-foreground/20 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-xs tracking-tight truncate">{video.title}</h3>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {new Date(video.createdAt).toDateString().toLowerCase()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {video.status === "failed" ? (
            <span className="flex items-center gap-1.5 text-[10px] text-destructive font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              Failed
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Processing
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between items-center text-[10px] font-mono">
          <span className="text-muted-foreground">Transcoding progress</span>
          <span className="font-semibold text-foreground">
            {video.status === "failed" ? "0%" : `${percent}%`}
          </span>
        </div>
        <div className="w-full bg-secondary rounded-full h-1 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              video.status === "failed"
                ? "bg-destructive"
                : "bg-foreground"
            }`}
            style={{ width: `${video.status === "failed" ? 100 : percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
