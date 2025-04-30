import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        hostname: 'testnet.succinct.xyz',
      },
    ],
  },
};

export default nextConfig;
