import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  experimental: {
    serverActions: {
      bodySizeLimit: '12mb',
    },
  },
}

export default nextConfig
