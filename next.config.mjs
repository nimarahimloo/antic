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
  {
    protocol: 'https',
    hostname: 'media.base44.com',
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // خروجی مستقل برای داکر/سرور اختصاصی
  output: process.env.NEXT_OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  
  // Image Optimization - Next.js 16
  images: {
    remotePatterns: imageRemotePatterns,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  
  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // ppr: 'incremental', // Partial Prerendering (when ready)
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Compression
  compress: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
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
};

export default nextConfig;