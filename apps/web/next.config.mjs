/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep review builds separate from a running development server's chunks.
  distDir: process.env.VEYRO_NEXT_DIST_DIR || '.next',
  transpilePackages: ['@veyro/ui', '@veyro/config'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
