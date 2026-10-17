// '.js' suffix: this module is also loaded by plain Node ESM (Payload CLI, test seeding)
import { revalidateTag } from 'next/cache.js'
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Party } from '../../payload-types'

/**
 * Cache tags (reserved in 01-05): 'parties' — home list, sitemap, static params;
 * 'party:{slug}' — one party page. `{ expire: 0 }` expires immediately, so the next
 * visitor gets fresh HTML instead of a stale-while-revalidate copy.
 */
function expire(tags: string[]): void {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 })
    } catch {
      // Outside a Next request (seed scripts, migrations, tests): nothing is cached there.
    }
  }
}

export const revalidatePartyAfterChange: CollectionAfterChangeHook<Party> = ({ doc, previousDoc }) => {
  const tags = ['parties', `party:${doc.slug}`]
  if (previousDoc?.slug && previousDoc.slug !== doc.slug) tags.push(`party:${previousDoc.slug}`)
  expire(tags)
  return doc
}

export const revalidatePartyAfterDelete: CollectionAfterDeleteHook<Party> = ({ doc }) => {
  expire(['parties', `party:${doc.slug}`])
  return doc
}
