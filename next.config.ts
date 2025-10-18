import type { NextConfig } from "next";
import "./lib/env";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
  },
  output: "standalone",
};

export default nextConfig;
