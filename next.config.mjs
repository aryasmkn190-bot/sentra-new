/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  experimental: {
    // Chat image upload via server action FormData
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};
export default nextConfig;
