/**
 * The promotion on right now, read straight from the database on the server (never from the browser and never
 * from a cache). Shared by the open submission forms (photos/videos and contos). No 'server-only': used by int tests.
 */
import type { Payload } from 'payload'

import { tituloDaParticipacao, type PromocaoVigencia } from './promocao'

/** Title of the promotion on right now, straight from the database (not from a cache); null when off. */
export async function promocaoVigente(payload: Payload, now: Date): Promise<string | null> {
  const doc = await payload.findGlobal({ slug: 'promocao', depth: 0, overrideAccess: true }).catch(() => null)
  if (!doc) return null
  const vigencia: PromocaoVigencia = {
    ativa: doc.ativa === true,
    titulo: (doc.titulo ?? '').trim(),
    texto: doc.texto && typeof doc.texto === 'object' ? (doc.texto as PromocaoVigencia['texto']) : null,
    inicio: doc.inicio ?? null,
    fim: doc.fim ?? null,
    imagem: doc.imagem ? ({} as PromocaoVigencia['imagem']) : null,
  }
  return tituloDaParticipacao(vigencia, now)
}
