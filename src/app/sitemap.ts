import type { MetadataRoute } from 'next'

import { hasPublishedModels } from '@/lib/gallery/queries'
import { PAGE_KEYS } from '@/lib/pages/keys'
import { getPageByKey, type PageDTO } from '@/lib/pages/queries'
import { getPublicContoSlugs } from '@/lib/contos/public'
import { getPublicDicaSlugs } from '@/lib/dicas/public'
import { getUpcomingParties } from '@/lib/parties/queries'
import { buildSitemap } from '@/lib/seo/sitemap'

// Per request (no database at build); every list comes from the tagged data cache.
export const dynamic = 'force-dynamic'

/** Public pages only: drafts, ended parties and an empty Modelos section are left out. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [parties, pages, hasModels, contos, dicas] = await Promise.all([
    getUpcomingParties(new Date()),
    Promise.all(PAGE_KEYS.map((key) => getPageByKey(key))),
    hasPublishedModels(),
    getPublicContoSlugs(),
    getPublicDicaSlugs(),
  ])
  return buildSitemap({
    base: process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000',
    parties,
    pages: pages.filter((p): p is PageDTO => p !== null),
    hasModels,
    contos,
    dicas,
  })
}
