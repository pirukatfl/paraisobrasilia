import { APIError, type CollectionBeforeOperationHook, type CollectionConfig } from 'payload'

import { revalidateGalleries, revalidateGalleriesAfterDelete } from '../lib/gallery/revalidate'

const isStaff = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

/** Images stay capped at 15 MB although the global upload limit is 100 MB (videos). */
export const MAX_IMAGE_BYTES = 15_000_000

const rejectBigImages: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation !== 'create' && operation !== 'update') return args
  const size = req.file?.size ?? 0
  if (size > MAX_IMAGE_BYTES) {
    throw new APIError('A imagem passa de 15 MB. Reduza o tamanho e envie de novo.', 400, null, true)
  }
  return args
}

// Every derivative is re-encoded by sharp (drops EXIF/GPS metadata from phone flyers).
const webp = { format: 'webp' as const, options: { quality: 82 } }

/**
 * Public images (party flyers). Stored on the server disk (client decision 2026-10-17):
 * the upload directory is set in payload.config.ts from MEDIA_DIR (a Docker volume in staging).
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Mídia', plural: 'Mídias' },
  access: {
    read: () => true,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    beforeOperation: [rejectBigImages],
    // Gallery pages cache image URLs/alt texts: expire them when a file changes or is deleted
    afterChange: [revalidateGalleries],
    afterDelete: [revalidateGalleriesAfterDelete],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
      label: 'Texto alternativo',
      admin: {
        description:
          'Descreva a imagem para quem usa leitor de tela (ex.: Flyer da Festa do Branco).',
      },
    },
  ],
  upload: {
    // No SVG: images only, re-encoded by sharp (T-01-09)
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    focalPoint: true,
    crop: true,
    adminThumbnail: 'card',
    formatOptions: webp,
    imageSizes: [
      { name: 'card', width: 640, formatOptions: webp },
      { name: 'square', width: 1080, height: 1080, formatOptions: webp },
      { name: 'portrait', width: 1080, height: 1350, formatOptions: webp },
      // Lightbox (space and model galleries): long side up to 1600 px
      { name: 'gallery', width: 1600, withoutEnlargement: true, formatOptions: webp },
      // Share preview (FEST-03): whole flyer letterboxed on the brand black, JPEG for WhatsApp.
      // The hex is a sharp data value, not a UI style.
      {
        name: 'og',
        width: 1200,
        height: 630,
        fit: 'contain',
        background: '#0B0908',
        formatOptions: { format: 'jpeg', options: { quality: 82 } },
      },
    ],
  },
}
