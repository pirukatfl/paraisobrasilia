import type { MetadataRoute } from 'next'

import { hasPublishedModels } from '@/lib/gallery/queries'
import { PAGE_KEYS, pathForKey } from '@/lib/pages/keys'
import { getPageByKey } from '@/lib/pages/queries'
import { getUpcomingParties } from '@/lib/parties/queries'

// Per request (no database at build); the party list comes from the tagged data cache.
export const dynamic = 'force-dynamic'

/** Home + upcoming party pages; past (and, from 01-09, unpublished) parties are excluded. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const [parties, pages, hasModels] = await Promise.all([
    getUpcomingParties(new Date()),
    Promise.all(PAGE_KEYS.map((key) => getPageByKey(key))),
    hasPublishedModels(),
  ])
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/espaco`, changeFrequency: 'weekly', priority: 0.7 },
    ...(hasModels ? [{ url: `${base}/modelos`, changeFrequency: 'weekly' as const, priority: 0.5 }] : []),
    { url: `${base}/contato`, changeFrequency: 'monthly', priority: 0.6 },
    // Institutional pages: published ones only
    ...pages.flatMap((page) =>
      page
        ? [{ url: `${base}${pathForKey(page.key)}`, lastModified: page.updatedAt, changeFrequency: 'monthly' as const, priority: 0.5 }]
        : [],
    ),
    ...parties.map((p) => ({
      url: `${base}/festas/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
