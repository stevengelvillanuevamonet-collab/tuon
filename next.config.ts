import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Live documents save their full merged state; large notes exceed the 1 MB default.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
