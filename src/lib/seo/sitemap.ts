import type { MetadataRoute } from 'next'

import { pathForKey, type PageKey } from '../pages/keys'

export type SitemapInput = {
  base: string
  parties: { slug: string; updatedAt: string }[]
  /** Published institutional pages only */
  pages: { key: PageKey; updatedAt: string }[]
  hasModels: boolean
}

/**
 * Public URLs only (T-02-13): home, contact, space gallery, published institutional pages,
 * /modelos while a model is published, upcoming published parties, /assine-ja and the ClassiSex
 * preview /classisex (redacted, blurred; listing it is a client decision kept open in 04-RESEARCH Q2).
 */
export function buildSitemap({ base, parties, pages, hasModels }: SitemapInput): MetadataRoute.Sitemap {
  const root = base.replace(/\/$/, '')
  return [
    { url: `${root}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${root}/espaco`, changeFrequency: 'weekly', priority: 0.7 },
    ...(hasModels ? [{ url: `${root}/modelos`, changeFrequency: 'weekly' as const, priority: 0.5 }] : []),
    { url: `${root}/contato`, changeFrequency: 'monthly', priority: 0.6 },
    // Members (/area-do-assinante) and auth pages (/entrar, /nova-senha) are never listed (T-03-05)
    { url: `${root}/assine-ja`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${root}/classisex`, changeFrequency: 'weekly', priority: 0.6 },
    ...pages.map((page) => ({
      url: `${root}${pathForKey(page.key)}`,
      lastModified: page.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    ...parties.map((p) => ({
      url: `${root}/festas/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
