import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { Page } from '../../payload-types'
import { cached } from '../cache/cached'
import type { RichTextState } from '../parties/types'
import { ricoTemTexto, textoPuro, type TextoRico } from '../textos/rico'
import type { PageKey } from './keys'

export type PageDTO = {
  key: PageKey
  title: string
  /** Formatted intro (line editor), null when empty. */
  intro: TextoRico | null
  /** The same intro as one line of plain text, for <meta>, Open Graph and JSON-LD. */
  introTexto: string | null
  body: RichTextState | null
  updatedAt: string
}

export function toPageDTO(doc: Page): PageDTO {
  const intro = ricoTemTexto(doc.intro) ? doc.intro : null
  return {
    key: doc.key,
    title: doc.title,
    intro,
    introTexto: intro ? textoPuro(intro) : null,
    body: (doc.body as RichTextState | null | undefined) ?? null,
    updatedAt: doc.updatedAt,
  }
}

async function fetchPageByKey(key: PageKey): Promise<PageDTO | null> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'pages',
    where: { and: [{ _status: { equals: 'published' } }, { key: { equals: key } }] },
    draft: false,
    depth: 0,
    limit: 1,
  })
  return docs[0] ? toPageDTO(docs[0]) : null
}

/** One published institutional page, or null (→ 404). Tag 'page:{key}'. */
export const getPageByKey = cached(fetchPageByKey, ['pages:by-key'], (key) => [`page:${key}`, 'pages'])

/** Intro text of a published page (home teaser), or null. */
export async function getPageIntro(key: PageKey): Promise<TextoRico | null> {
  return (await getPageByKey(key))?.intro ?? null
}
