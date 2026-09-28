import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include seeded SQLite DB in the serverless bundle
  outputFileTracingIncludes: {
    "/**": ["./prisma/dev.db"],
  },
};

export default nextConfig;
