import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const localAddresses = Object.values(networkInterfaces()).flatMap((entries) =>
  (entries ?? [])
    .filter(
      (entry) =>
        entry.family === "IPv4" &&
        /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address),
    )
    .map((entry) => entry.address),
);

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.EDUNEXUS_NEXT_DIST_DIR || ".next",
  allowedDevOrigins: ["localhost", "127.0.0.1", ...localAddresses],
};

export default nextConfig;
