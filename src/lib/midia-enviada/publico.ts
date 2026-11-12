import 'server-only'

import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import type { EnviosMidia, EnviosMidiaArquivo } from '../../payload-types'
import { cached } from '../cache/cached'
import type { GalleryImage, SpaceItemDTO } from '../gallery/types'
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
  /** Seconds, when known. The file URL is not part of the DTO: the dialog builds it for allowed viewers only. */
  duracao: number | null
  /** Staff-written text shown on the card; null when empty. */
  descricao: string | null
  createdAt: string
}

const apelidoDe = (envio: unknown): string | null => {
  const apelido = typeof envio === 'object' && envio ? (envio as EnviosMidia).apelido?.trim() : ''
  return apelido || null
}

const descricaoDe = (doc: EnviosMidiaArquivo): string | null => doc.descricao?.trim() || null

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
    select: { kind: true, oculto: true, descricao: true, envio: true, width: true, height: true, durationSeconds: true, sizes: true, createdAt: true },
    sort: '-createdAt',
    depth: 1,
    limit: LIMITE,
    pagination: false,
    overrideAccess: true,
  })
  return docs as unknown as EnviosMidiaArquivo[]
}

/** One approved submission with at least one published photo: a card in Galeria → Amadoras and a page /amadoras/{id}. */
export type AmadoraEnviadaDTO = {
  envioId: number
  apelido: string
  capa: GalleryImage
  fotos: SpaceItemDTO[]
  fotoCount: number
  createdAt: string
}

function fotoItem(doc: EnviosMidiaArquivo, apelido: string): SpaceItemDTO {
  const width = doc.width ?? 1080
  const height = doc.height ?? 1080
  const card = doc.sizes?.card
  return {
    id: String(doc.id),
    kind: 'photo',
    caption: descricaoDe(doc),
    image: {
      url: `${FOTO_AMADORA_URL}/${doc.id}/foto`,
      width,
      height,
      alt: `Foto de ${apelido}`,
      thumbUrl: `${FOTO_AMADORA_URL}/${doc.id}/miniatura`,
      thumbWidth: card?.width ?? width,
      thumbHeight: card?.height ?? height,
    },
    video: null,
  }
}

/** Groups published photos by submission (first sent = cover); submissions newest first. Exported for tests. */
export function agruparFotos(docs: EnviosMidiaArquivo[]): AmadoraEnviadaDTO[] {
  const porEnvio = new Map<number, { apelido: string; createdAt: string; docs: EnviosMidiaArquivo[] }>()
  for (const doc of docs) {
    const apelido = apelidoDe(doc.envio)
    if (!apelido || typeof doc.envio !== 'object' || !doc.envio) continue
    const grupo = porEnvio.get(doc.envio.id) ?? { apelido, createdAt: doc.envio.createdAt, docs: [] }
    grupo.docs.push(doc)
    porEnvio.set(doc.envio.id, grupo)
  }
  const out: AmadoraEnviadaDTO[] = []
  for (const [envioId, g] of porEnvio) {
    const fotos = g.docs.sort((a, b) => a.id - b.id).map((d) => fotoItem(d, g.apelido))
    out.push({ envioId, apelido: g.apelido, capa: fotos[0].image, fotos, fotoCount: fotos.length, createdAt: g.createdAt })
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.envioId - a.envioId))
}

async function fetchAmadorasEnviadas(): Promise<AmadoraEnviadaDTO[]> {
  return agruparFotos(await buscar('foto'))
}

async function fetchVideosAmadores(): Promise<VideoAmadorDTO[]> {
  const out: VideoAmadorDTO[] = []
  for (const doc of await buscar('video')) {
    if (!apelidoDe(doc.envio)) continue
    out.push({
      id: doc.id,
      duracao: typeof doc.durationSeconds === 'number' ? doc.durationSeconds : null,
      descricao: descricaoDe(doc),
      createdAt: doc.createdAt,
    })
  }
  return out
}

/** Approved submissions with published photos (newest first), one card each. Tag 'amadores'. */
export const getAmadorasEnviadas = cached(fetchAmadorasEnviadas, ['amadores:envios'], () => ['amadores'])

/** One approved submission with its published photos, or null (404). Tag 'amadores'. */
export async function getAmadoraEnviada(envioId: number): Promise<AmadoraEnviadaDTO | null> {
  return (await getAmadorasEnviadas()).find((a) => a.envioId === envioId) ?? null
}

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
