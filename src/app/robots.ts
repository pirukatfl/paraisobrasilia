import type { MetadataRoute } from 'next'

/** Staging/development: block everything. Production: public pages only (INST-05, T-01-21). */
export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_ENV === 'production') {
    const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    return {
      rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/api'] },
      sitemap: `${base}/sitemap.xml`,
    }
  }
  return { rules: { userAgent: '*', disallow: '/' } }
}
