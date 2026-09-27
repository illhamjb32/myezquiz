import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/quiz.html", destination: "/", permanent: false },
      { source: "/teacher.html", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
