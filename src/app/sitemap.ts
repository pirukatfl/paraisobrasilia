import type { MetadataRoute } from 'next'

import { getUpcomingParties } from '@/lib/parties/queries'

export const revalidate = 600

/** Home + upcoming party pages; past (and, from 01-09, unpublished) parties are excluded. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const parties = await getUpcomingParties(new Date())
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    ...parties.map((p) => ({
      url: `${base}/festas/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
