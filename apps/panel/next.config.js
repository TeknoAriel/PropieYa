/** @type {import('next').NextConfig} */
const remotePatterns = [
  {
    protocol: 'http',
    hostname: 'localhost',
    port: '9000',
    pathname: '/propieya-media/**',
  },
]
try {
  const mediaHost = process.env.NEXT_PUBLIC_MEDIA_HOST
  if (mediaHost) {
    const u = new URL(mediaHost.startsWith('http') ? mediaHost : `https://${mediaHost}`)
    remotePatterns.push({
      protocol: u.protocol.replace(':', '') === 'http' ? 'http' : 'https',
      hostname: u.hostname,
      pathname: '/**',
      ...(u.port ? { port: u.port } : {}),
    })
  }
} catch (_) {}

const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@propieya/ui', '@propieya/shared'],
  images: {
    remotePatterns,
  },
  experimental: {
    optimizePackageImports: ['@propieya/ui', 'lucide-react'],
  },
}

module.exports = nextConfig
