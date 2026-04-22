export function getPlaybackUrl(videoId: string) {
  const baseUrl =
    process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!baseUrl) {
    return "";
  }

  return `${baseUrl.replace(/\/$/, "")}/${videoId}/index.m3u8`;
}

export function getThumbnailUrl(videoId: string, fallback?: string | null) {
  const baseUrl =
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, "")}/${videoId}/thumb.jpg`;
  }

  return fallback || "https://placehold.co/1280x720";
}
