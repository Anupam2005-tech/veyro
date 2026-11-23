/** @type {import('next').NextConfig} */
const apiTarget = process.env.API_PROXY_TARGET || 'http://localhost:4000';

const nextConfig = {
  reactStrictMode: true,
  // Same-origin API in development: the browser calls /api/v1/* and Next proxies
  // it to the Express API, so no CORS setup or extra env is needed locally.
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${apiTarget}/api/v1/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
