import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    mcpServer: true,
  },
  async redirects() {
    return [
      { source: '/calculator', destination: '/cotizador', permanent: true },
      { source: '/insumos', destination: '/materiales?tab=insumos', permanent: false },
    ]
  },
}

export default nextConfig
