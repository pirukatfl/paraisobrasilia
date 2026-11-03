import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { getAccessStatus } from '../../assinantes/access'
import { getAssinante } from '../../assinantes/session'
import { cached } from '../../cache/cached'
import { marcarMeus, type ComentarioDTO, type ComentariosViewer } from './dto'
import { listComments, ownCommentIds } from './service'

/**
 * The thread as every non-subscriber sees it (visitors, free accounts): contacts redacted, the same
 * for everyone, so it is cached by ad with the tag 'ad-comments' (expired by every comment change)
 * and 'ads' (an unpublished ad takes its conversation down). Null when the ad is not visible.
 */
const getPublicThread = cached(
  async (adId: number): Promise<ComentarioDTO[] | null> => {
    const payload = await getPayload({ config })
    return listComments(payload, adId, { verContatos: false, now: new Date() })
  },
  ['classisex-comentarios-publico'],
  () => ['ad-comments', 'ads'],
)

/**
 * Thread of one ad for a viewer. `verContatos` is decided by the page from the session (active
 * subscription), never from the request. Subscribers read uncached, with the text as written;
 * everyone else reads the shared redacted copy, and `meu` is filled apart from the cache.
 */
export async function getComentarios(
  adId: number,
  { verContatos, assinanteId }: { verContatos: boolean; assinanteId: number | null },
): Promise<ComentarioDTO[] | null> {
  if (verContatos) {
    const payload = await getPayload({ config })
    return listComments(payload, adId, { verContatos: true, meId: assinanteId, now: new Date() })
  }
  const thread = await getPublicThread(adId)
  if (!thread || assinanteId === null) return thread
  const payload = await getPayload({ config })
  return marcarMeus(thread, await ownCommentIds(payload, adId, assinanteId))
}

/**
 * Who is looking, from the session only. Staff sessions and visitors are "visitante" (they read the
 * redacted copy and sign in to write). `verContatos` is true only for an active subscription.
 */
export async function getViewer(): Promise<{ viewer: ComentariosViewer; assinanteId: number | null; verContatos: boolean }> {
  const assinante = await getAssinante()
  if (!assinante) return { viewer: { tipo: 'visitante' }, assinanteId: null, verContatos: false }
  const payload = await getPayload({ config })
  const [access, flags] = await Promise.all([
    getAccessStatus(assinante.id, new Date()),
    // Staff-only field: the account's own read does not carry it
    payload.findByID({
      collection: 'assinantes',
      id: assinante.id,
      select: { comentariosBloqueados: true },
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    }) as Promise<{ comentariosBloqueados?: boolean | null } | null>,
  ])
  const assinanteAtivo = access.state === 'ativa'
  return {
    viewer: {
      tipo: 'conta',
      apelido: assinante.apelido?.trim() ?? '',
      bloqueado: Boolean(flags?.comentariosBloqueados),
      assinanteAtivo,
    },
    assinanteId: assinante.id,
    verContatos: assinanteAtivo,
  }
}
