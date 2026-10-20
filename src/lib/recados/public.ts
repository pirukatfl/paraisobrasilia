import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { cached } from '../cache/cached'
import { findPublicRecadosTeaser } from './board'
import type { PublicRecadosDTO } from './dto'

/**
 * Open-area recados teaser (PREV-02). Tag 'recados' (600 s window): moderation, recado writes and
 * subscription changes expire it (T-05-27). Counts and short redacted snippets only.
 */
export const getPublicRecadosTeaser = cached(
  async (): Promise<PublicRecadosDTO> => {
    const payload = await getPayload({ config })
    return findPublicRecadosTeaser(payload, new Date())
  },
  ['recados:teaser'],
  () => ['recados'],
)
