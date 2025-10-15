import type { NextConfig } from "next";
import "./lib/env";

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
    instrumentationHook: true,
  },
};

export default nextConfig;
