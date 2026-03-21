/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@propieya/ui', '@propieya/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/propieya-media/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['@propieya/ui', 'lucide-react'],
  },
}

module.exports = nextConfig
