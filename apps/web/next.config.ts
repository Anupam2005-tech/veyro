import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@veyro/ui', '@veyro/config', '@veyro/contracts'],
};

export default nextConfig;

