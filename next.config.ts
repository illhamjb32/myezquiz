import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
  async redirects() {
    return [
      { source: "/quiz.html", destination: "/", permanent: false },
      { source: "/teacher.html", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
