import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.EDUNEXUS_NEXT_DIST_DIR || ".next",
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.0.231",
  ],
};

export default nextConfig;