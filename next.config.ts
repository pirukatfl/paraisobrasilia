import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const isProduction = process.env.SITE_ENV === 'production'

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (.next/standalone/server.js)
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Staging/development must never be indexed (T-01-21)
          ...(isProduction ? [] : [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }]),
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' }, // T-01-23
        ],
      },
      // Members and auth pages are never indexed, also in production (T-03-05)
      ...['/area-do-assinante', '/area-do-assinante/:path*', '/entrar', '/nova-senha'].map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ]
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
