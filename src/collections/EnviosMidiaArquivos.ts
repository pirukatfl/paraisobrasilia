import fs from 'fs/promises'
import { APIError, type CollectionBeforeOperationHook, type CollectionConfig } from 'payload'

import { isStaff } from '../access/roles'
import { AD_MEDIA_MESSAGES, PHOTO_MIME_TYPES, VIDEO_MIME_TYPES } from '../lib/classisex/media-messages'
import { privateStorageConfigured } from '../lib/classisex/storage'
import { ArquivoInvalido, limparArquivo } from '../lib/midia-enviada/limpar'
import { revalidateAmadores, revalidateAmadoresAfterDelete } from '../lib/midia-enviada/revalidate'
import { ENVIO_MIDIA_MESSAGES, MAX_FOTOS, MAX_VIDEOS } from '../lib/midia-enviada/regras'

const fail = (message: string, status = 400) => new APIError(message, status, null, true)

const relId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') return Number((value as { id?: number | string }).id)
  return Number(value)
}

/**
 * Validation and cleaning before Payload writes anything (same approach as ad-media): kind and duration are
 * decided here; photos must decode (Payload re-encodes them, so EXIF/GPS is gone); videos are measured and
 * their location boxes zero-filled; each submission takes at most 10 photos and 2 videos.
 */
const validateAndClean: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if (operation !== 'create' && operation !== 'update') return args
  const file = req.file
  if (!file) return args
  // A REST caller that is not staff is refused by the access rules right after this hook: do not decode its bytes
  if ((args as { overrideAccess?: boolean }).overrideAccess !== true && !isStaff({ req })) return args
  if (!privateStorageConfigured()) throw fail(AD_MEDIA_MESSAGES.indisponivel, 503)

  const writeArgs = args as { data?: Record<string, unknown> }
  const data = (writeArgs.data ??= {})
  let buffer = file.data
  if ((!buffer || buffer.length === 0) && file.tempFilePath) buffer = await fs.readFile(file.tempFilePath)

  let limpo
  try {
    limpo = await limparArquivo(buffer, String(file.mimetype ?? ''), Number(file.size ?? 0))
  } catch (err) {
    if (err instanceof ArquivoInvalido) throw fail(err.message)
    throw err
  }
  if (limpo.kind === 'video') {
    file.data = limpo.data
    file.size = limpo.data.length
    if (file.tempFilePath) await fs.writeFile(file.tempFilePath, limpo.data)
    data.durationSeconds = limpo.durationSeconds
  }
  data.kind = limpo.kind

  if (operation === 'create') {
    const envioId = relId(data.envio)
    if (envioId === null || !Number.isInteger(envioId)) throw fail('Envio não encontrado.')
    const { totalDocs } = await req.payload.count({
      collection: 'envios-midia-arquivos',
      where: { and: [{ envio: { equals: envioId } }, { kind: { equals: limpo.kind } }] },
      overrideAccess: true,
      req,
    })
    if (limpo.kind === 'foto' && totalDocs >= MAX_FOTOS) throw fail(ENVIO_MIDIA_MESSAGES.fotos)
    if (limpo.kind === 'video' && totalDocs >= MAX_VIDEOS) throw fail(ENVIO_MIDIA_MESSAGES.videos)
  }
  return args
}

const webp = { format: 'webp' as const, options: { quality: 82 } }

/**
 * Files of the "Fotos e vídeos enviados" submissions. Stored in PRIVATE_MEDIA_DIR (staticDir injected in
 * payload.config.ts), outside MEDIA_DIR and public/. Read is staff only, never `() => true`, or Payload's own file
 * route (/api/envios-midia-arquivos/file/…) would serve the originals to anyone. Staff see the preview and
 * download through the admin (same session, that route checks the staff cookie).
 * The site never uses that route: files of an approved submission (and not `oculto`) are served by
 * /amadores/foto/… and /videos-amadores/…/video, which re-check publication on every request.
 */
export const EnviosMidiaArquivos: CollectionConfig = {
  slug: 'envios-midia-arquivos',
  labels: { singular: 'Arquivo enviado', plural: 'Arquivos enviados' },
  admin: {
    group: 'Envios do público',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'kind', 'descricao', 'envio', 'createdAt'],
    description: 'Cada foto ou vídeo de um envio. Só a equipe abre o original; o site mostra apenas os de envios aprovados que não estiverem marcados como "Não mostrar no site".',
  },
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    beforeOperation: [validateAndClean],
    afterChange: [revalidateAmadores],
    afterDelete: [revalidateAmadoresAfterDelete],
  },
  upload: {
    mimeTypes: [...PHOTO_MIME_TYPES, ...VIDEO_MIME_TYPES],
    formatOptions: webp,
    resizeOptions: { width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true },
    imageSizes: [{ name: 'card', width: 480, withoutEnlargement: true, formatOptions: webp }],
    adminThumbnail: 'card',
    focalPoint: false,
    crop: false,
  },
  fields: [
    { name: 'envio', type: 'relationship', relationTo: 'envios-midia', required: true, index: true, label: 'Envio' },
    {
      name: 'kind',
      type: 'select',
      required: true,
      label: 'Tipo',
      options: [
        { label: 'Foto', value: 'foto' },
        { label: 'Vídeo', value: 'video' },
      ],
      admin: { readOnly: true },
    },
    {
      name: 'oculto',
      type: 'checkbox',
      defaultValue: false,
      label: 'Não mostrar no site',
      admin: { position: 'sidebar', description: 'Marque para esconder só este arquivo de um envio aprovado.' },
    },
    {
      name: 'descricao',
      type: 'textarea',
      label: 'Descrição',
      maxLength: 280,
      admin: {
        description: 'Aparece no card do vídeo ou da foto no site. Opcional. Não coloque contato nem nome verdadeiro.',
      },
    },
    // Filled by the upload hook (used by the site card); only videos have a length, so photos do not show it
    {
      name: 'durationSeconds',
      type: 'number',
      label: 'Duração (s)',
      admin: { readOnly: true, condition: (data) => data?.kind === 'video' },
    },
  ],
}
