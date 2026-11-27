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

const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Use webpack instead of Turbopack for next-pwa compatibility
  // turbopack: {} allows Turbopack in dev (PWA disabled in dev anyway)
  
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
    qualities: [75, 80, 85, 90],
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
      // Agent discovery Link headers on the homepage (RFC 8288 + RFC 9727 §3)
      {
        source: '/',
        headers: [
          { key: 'Link', value: '</.well-known/api-catalog>; rel="api-catalog"' },
          { key: 'Link', value: '</.well-known/oauth-protected-resource>; rel="service-desc"' },
          { key: 'Link', value: '</.well-known/oauth-authorization-server>; rel="service-doc"' },
          { key: 'Link', value: '</.well-known/openid-configuration>; rel="describedby"' },
        ],
      },
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Service Worker headers
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/workbox-:hash.js',
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

// PWA Configuration with next-pwa
const withPWA = (await import('next-pwa')).default({
  dest: 'public',
  // Disable registration and SW generation in development
  register: !isDev,
  skipWaiting: true,
  disable: isDev, // Disable PWA in development mode
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-stylesheets',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-webfonts',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|png|gif|webp|svg|avif|ico)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-images',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/api\/entities\/CurtainCategory/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'curtain-categories-api',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24, // 1 day
        },
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/api\/catalog\/categories/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'shop-categories-api',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24, // 1 day
        },
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/api\/catalog\/products/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'shop-products-api',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 1 day
        },
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/api\/entities\/CurtainModel/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'curtain-models-api',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24, // 1 day
        },
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/api\/app\/public-settings/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'public-settings-api',
        expiration: {
          maxEntries: 5,
          maxAgeSeconds: 60 * 60 * 24, // 1 day
        },
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

export default withPWA(nextConfig);