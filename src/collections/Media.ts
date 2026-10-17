import type { CollectionConfig } from 'payload'

const isStaff = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

// Every derivative is re-encoded by sharp (drops EXIF/GPS metadata from phone flyers).
const webp = { format: 'webp' as const, options: { quality: 82 } }

/** Public images (party flyers). Staging/production storage moves to object storage later (S3_BUCKET). */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Mídia', plural: 'Mídias' },
  access: {
    read: () => true,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
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
    staticDir: 'media',
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
