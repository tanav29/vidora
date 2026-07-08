import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  turbopack: {},
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "localhost" },
    ],
  },
  devIndicators: false,
};

export default nextConfig;
