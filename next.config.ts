import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Activa el MCP server en /_next/mcp (Next.js 16+)
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
