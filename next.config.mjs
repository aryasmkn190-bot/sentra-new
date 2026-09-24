/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  experimental: {
    // Chat image upload via server action FormData
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};
export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
