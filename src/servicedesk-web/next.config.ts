import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Allows production builds to successfully complete even if
    // your project has type errors (e.g. strict openapi-fetch types).
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
