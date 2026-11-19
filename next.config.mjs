/** @type {import('next').NextConfig} */

// آدرس بک‌اند برای پروکسی داخلی Next.js.
// در لوکال: http://localhost:3001 — در داکر: http://backend:3001
const backendUrl = (process.env.BACKEND_INTERNAL_URL || 'http://localhost:3001').replace(/\/$/, '');

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
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
      {
        // سرور MCP و اسناد اکتشافی OAuth روی بک‌اند سرو می‌شوند
        source: '/.well-known/:path*',
        destination: `${backendUrl}/.well-known/:path*`,
      },
      {
        source: '/auth.md',
        destination: `${backendUrl}/auth.md`,
      },
      {
        // sitemap و robots از روی داده‌های دیتابیس ساخته می‌شوند
        source: '/sitemap.xml',
        destination: `${backendUrl}/sitemap.xml`,
      },
      {
        source: '/robots.txt',
        destination: `${backendUrl}/robots.txt`,
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
