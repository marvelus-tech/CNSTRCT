import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Desks are read from the database on each request. Cache Components would
  // freeze a business page at build time, so this app stays dynamic.
  cacheComponents: false,
  // Keep the Neon HTTP driver external so Node loads the published package.
  serverExternalPackages: ["@neondatabase/serverless"],
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
