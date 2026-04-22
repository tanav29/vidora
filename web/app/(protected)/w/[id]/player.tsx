"use client";

import { useEffect, useState } from "react";
import "@vidstack/react/player/styles/plyr/theme.css";

import { MediaPlayer, MediaProvider } from "@vidstack/react";
import {
  PlyrLayout,
  plyrLayoutIcons,
} from "@vidstack/react/player/layouts/plyr";

export default function Player({ id }: { id: string }) {
  const [src, setSrc] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/sw/${id}`);
        const data = await res.json();
        setSrc(data.url);
      } catch (error) {
        console.error("Failed to fetch video URL:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="grid h-full w-full place-items-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
          <span className="text-xs text-white/40 tracking-wide">
            Loading player…
          </span>
        </div>
      </div>
    );
  }

  if (!src) {
    return (
      <div className="grid h-full w-full place-items-center bg-black">
        <p className="text-sm text-white/40">Playback is not available yet.</p>
      </div>
    );
  }

  return (
    <MediaPlayer title="Vidora" src={src} playsInline className="h-full w-full">
      <MediaProvider />
      <PlyrLayout icons={plyrLayoutIcons} />
    </MediaPlayer>
  );
}
