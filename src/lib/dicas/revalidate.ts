import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

// expire() uses next/cache.js (plain Node safe)
import type { Dica } from '../../payload-types'
import { expire } from '../cache/expire'

/** Tags: 'dicas' (lists, home, sitemap) and 'dica:{slug}' (one page); the previous slug too. */
export const revalidateDicaAfterChange: CollectionAfterChangeHook<Dica> = ({ doc, previousDoc }) => {
  const tags = ['dicas']
  if (doc?.slug) tags.push(`dica:${doc.slug}`)
  if (previousDoc?.slug && previousDoc.slug !== doc?.slug) tags.push(`dica:${previousDoc.slug}`)
  expire(tags)
  return doc
}

export const revalidateDicaAfterDelete: CollectionAfterDeleteHook<Dica> = ({ doc }) => {
  expire(['dicas', ...(doc?.slug ? [`dica:${doc.slug}`] : [])])
  return doc
}
