import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { Page } from '../../payload-types'
import { expire } from '../cache/expire'

/** Tags: 'pages' (sitemap, lists) and 'page:{key}' (one page and the home teaser). */
export const revalidatePageAfterChange: CollectionAfterChangeHook<Page> = ({ doc, previousDoc }) => {
  const tags = ['pages', `page:${doc.key}`]
  if (previousDoc?.key && previousDoc.key !== doc.key) tags.push(`page:${previousDoc.key}`)
  expire(tags)
  return doc
}

export const revalidatePageAfterDelete: CollectionAfterDeleteHook<Page> = ({ doc }) => {
  expire(['pages', `page:${doc.key}`])
  return doc
}
