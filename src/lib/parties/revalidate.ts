import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Party } from '../../payload-types'
import { expire } from '../cache/expire'

/** Tags: 'parties' (lists) and 'party:{slug}' (one page); see src/lib/cache/expire.ts. */
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
