/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'www.mamali.co.uk' },
    ],
  },
  // Stripe webhook needs the raw body — Next.js 14 App Router handles this
  // per-route. No global config needed.
};

module.exports = nextConfig;
