import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Salon photos live in Supabase Storage's public bucket — allow that
    // host so next/image can actually optimize/resize them instead of
    // every page shipping full-size uploads straight through.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
