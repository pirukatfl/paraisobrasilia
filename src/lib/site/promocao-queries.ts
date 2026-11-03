import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { Promocao } from '../../payload-types'
import { cached } from '../cache/cached'
import { toGalleryImage } from '../gallery/queries'
import { BOTAO_PARTICIPAR_PADRAO, type PromocaoDTO } from './promocao'

export function toPromocaoDTO(doc: Partial<Promocao> | null | undefined): PromocaoDTO | null {
  if (!doc) return null
  const texto = doc.texto && typeof doc.texto === 'object' ? (doc.texto as PromocaoDTO['texto']) : null
  const titulo = (doc.titulo ?? '').trim()
  return {
    ativa: doc.ativa === true,
    titulo,
    texto,
    inicio: doc.inicio ?? null,
    fim: doc.fim ?? null,
    imagem: toGalleryImage(doc.imagem, titulo || 'Promoção do Paraíso Brasília'),
    participarAtivo: doc.participarAtivo !== false,
    botaoParticipar: (doc.botaoParticipar ?? '').trim() || BOTAO_PARTICIPAR_PADRAO,
    versao: doc.updatedAt ?? '',
  }
}

const cachedPromocao = cached(
  async (): Promise<PromocaoDTO | null> => {
    const payload = await getPayload({ config })
    return toPromocaoDTO(await payload.findGlobal({ slug: 'promocao', depth: 1 }))
  },
  ['site:promocao'],
  () => ['promocao'],
)

/** The promotion as staff saved it (tag 'promocao'). Never throws: without a database there is no promotion section. */
export async function getPromocao(): Promise<PromocaoDTO | null> {
  try {
    return await cachedPromocao()
  } catch (err) {
    console.error('[promocao] unavailable, no promotion:', err instanceof Error ? err.message : err)
    return null
  }
}
