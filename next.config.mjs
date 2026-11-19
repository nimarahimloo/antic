/** @type {import('next').NextConfig} */

// تصاویر از دامنه/پورت‌های زیر بارگذاری می‌شوند (لوکال + محیط استیج/پروداکشن)
const imageRemotePatterns = [
  {
    protocol: 'http',
    hostname: 'localhost',
    port: '3000',
    pathname: '/uploads/**',
  },
  {
    protocol: 'http',
    hostname: 'localhost',
    port: '3001',
    pathname: '/uploads/**',
  },
  {
    protocol: 'https',
    hostname: '**',
    pathname: '/uploads/**',
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // خروجی مستقل برای داکر/سرور اختصاصی
  output: process.env.NEXT_OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  images: {
    remotePatterns: imageRemotePatterns,
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/uploads/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
