import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    mcpServer: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
