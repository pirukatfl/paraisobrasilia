import type { CollectionConfig } from 'payload'

const isStaff = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

/**
 * Venue videos (MIDIA-01): MP4 only, stored on the server disk under MEDIA_DIR/videos
 * (staticDir injected in payload.config.ts). Served by Payload's file route, which answers
 * byte-range requests (206) so phones can play and seek.
 */
export const Videos: CollectionConfig = {
  slug: 'videos',
  labels: { singular: 'Vídeo', plural: 'Vídeos' },
  admin: {
    group: 'Arquivos',
    useAsTitle: 'title',
    description: 'MP4 (H.264), até 100 MB e cerca de 2 minutos. Exporte em 720p para carregar rápido no celular.',
  },
  access: {
    read: () => true,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  upload: {
    // T-02-07: video/mp4 only
    mimeTypes: ['video/mp4'],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Descrição do vídeo',
      admin: { description: 'Ex.: Pista de dança numa noite de festa.' },
    },
    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Imagem de capa',
      admin: { description: 'Uma foto que aparece antes de o vídeo tocar.' },
    },
  ],
}
