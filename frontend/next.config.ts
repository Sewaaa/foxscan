import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permette fetch verso il backend locale in sviluppo
  async rewrites() {
    return [];
  },
};

export default nextConfig;
