import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  headers: async () => [
    {
      source: "/(.*)",
      headers: [{ key: "X-Powered-By", value: "" }],
    },
  ],
  poweredByHeader: false,
};

export default nextConfig;
