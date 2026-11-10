import 'server-only'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import type { EnviosMidia, EnviosMidiaArquivo } from '../../payload-types'
import { cached } from '../cache/cached'
import type { SpaceItemDTO } from '../gallery/types'
import { estaPublicado } from './publicacao'

/**
 * Public reads of the files sent through /enviar-fotos-e-videos (client decision 2026-11-10). A file is public when
 * its submission is approved and the file is not `oculto` (see publicacao.ts). Only the nickname leaves the server:
 * contact, message and staff note are never selected. The cached lists are tagged 'amadores'; the file routes
 * never trust them and re-check with `arquivoPublicado` on every request.
 */
const LIMITE = 200 // bounded list

/** URL prefixes of the two file routes (they exist so the private storage is never exposed directly). */
export const FOTO_AMADORA_URL = '/amadores/foto'
export const VIDEO_AMADOR_URL = '/videos-amadores'

export type VideoAmadorDTO = {
  id: number
  apelido: string
  /** Seconds, when known. The file URL is not part of the DTO: the dialog builds it for allowed viewers only. */
  duracao: number | null
  createdAt: string
}

const apelidoDe = (envio: unknown): string | null => {
  const apelido = typeof envio === 'object' && envio ? (envio as EnviosMidia).apelido?.trim() : ''
  return apelido || null
}

async function buscar(kind: 'foto' | 'video'): Promise<EnviosMidiaArquivo[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'envios-midia-arquivos',
    where: {
      and: [
        { kind: { equals: kind } },
        { oculto: { not_equals: true } },
        { 'envio.status': { equals: 'aprovado' } },
      ],
    },
    select: { kind: true, oculto: true, envio: true, width: true, height: true, durationSeconds: true, sizes: true, createdAt: true },
    sort: '-createdAt',
    depth: 1,
    limit: LIMITE,
    pagination: false,
    overrideAccess: true,
  })
  return docs as unknown as EnviosMidiaArquivo[]
}

async function fetchFotosAmadoras(): Promise<SpaceItemDTO[]> {
  const out: SpaceItemDTO[] = []
  for (const doc of await buscar('foto')) {
    const apelido = apelidoDe(doc.envio)
    if (!apelido) continue
    const width = doc.width ?? 1080
    const height = doc.height ?? 1080
    const card = doc.sizes?.card
    out.push({
      id: String(doc.id),
      kind: 'photo',
      caption: apelido,
      image: {
        url: `${FOTO_AMADORA_URL}/${doc.id}/foto`,
        width,
        height,
        alt: `Foto enviada por ${apelido}`,
        thumbUrl: `${FOTO_AMADORA_URL}/${doc.id}/miniatura`,
        thumbWidth: card?.width ?? width,
        thumbHeight: card?.height ?? height,
      },
      video: null,
    })
  }
  return out
}

async function fetchVideosAmadores(): Promise<VideoAmadorDTO[]> {
  const out: VideoAmadorDTO[] = []
  for (const doc of await buscar('video')) {
    const apelido = apelidoDe(doc.envio)
    if (!apelido) continue
    out.push({
      id: doc.id,
      apelido,
      duracao: typeof doc.durationSeconds === 'number' ? doc.durationSeconds : null,
      createdAt: doc.createdAt,
    })
  }
  return out
}

/** Approved photos (newest first) for Galeria → Amadoras. Tag 'amadores'. */
export const getFotosAmadoras = cached(fetchFotosAmadoras, ['amadores:fotos'], () => ['amadores'])

/** Approved videos (newest first) for /videos-amadores; no file URL. Tag 'amadores'. */
export const getVideosAmadores = cached(fetchVideosAmadores, ['amadores:videos'], () => ['amadores'])

export type ArquivoPublicado = {
  kind: 'foto' | 'video'
  filename: string
  cardFilename: string | null
  mimeType: string | null
}

/**
 * One file for a file route: null unless it exists, is a photo/video and is published right now. Reads the
 * database on every call, never the cache, so unpublishing takes effect on the next request.
 */
export async function arquivoPublicado(payload: Payload, id: number): Promise<ArquivoPublicado | null> {
  const doc = (await payload.findByID({
    collection: 'envios-midia-arquivos',
    id,
    depth: 1,
    select: { kind: true, oculto: true, envio: true, filename: true, mimeType: true, sizes: true },
    overrideAccess: true,
    disableErrors: true,
  })) as EnviosMidiaArquivo | null
  if (!doc?.filename) return null
  const envioStatus = typeof doc.envio === 'object' && doc.envio ? (doc.envio as EnviosMidia).status : null
  if (!estaPublicado({ kind: doc.kind, oculto: doc.oculto, envioStatus })) return null
  return {
    kind: doc.kind,
    filename: doc.filename,
    cardFilename: doc.sizes?.card?.filename ?? null,
    mimeType: doc.mimeType ?? null,
  }
}
