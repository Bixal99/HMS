import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@shared/types", "@shared/validators"],
};

export default nextConfig;
