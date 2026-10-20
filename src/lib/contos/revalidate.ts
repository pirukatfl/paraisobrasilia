import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

// expire() uses next/cache.js (plain Node safe)
import type { Conto } from '../../payload-types'
import { expire } from '../cache/expire'

/** Tags: 'contos' (lists, sitemap) and 'conto:{slug}' (one page); the previous slug too. */
export const revalidateContoAfterChange: CollectionAfterChangeHook<Conto> = ({
  doc,
  previousDoc,
}) => {
  const tags = ['contos']
  if (doc?.slug) tags.push(`conto:${doc.slug}`)
  if (previousDoc?.slug && previousDoc.slug !== doc?.slug) tags.push(`conto:${previousDoc.slug}`)
  expire(tags)
  return doc
}

export const revalidateContoAfterDelete: CollectionAfterDeleteHook<Conto> = ({
  doc,
}) => {
  expire(['contos', ...(doc?.slug ? [`conto:${doc.slug}`] : [])])
  return doc
}
