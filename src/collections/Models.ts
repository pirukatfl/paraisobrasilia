import type { CollectionConfig } from 'payload'

import { imageAuthorization } from '../fields/imageAuthorization'
import { revalidateModels, revalidateModelsAfterDelete } from '../lib/gallery/revalidate'

const isStaff = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

export const MAX_MODEL_PHOTOS = 3

/**
 * House models (MIDIA-02, D-08): artistic name and 1–3 photos, no individual page and no contact.
 * Image authorization is recommended, never required to publish (D-09).
 */
export const Models: CollectionConfig = {
  slug: 'models',
  labels: { singular: 'Modelo', plural: 'Modelos' },
  admin: {
    group: 'Site',
    useAsTitle: 'name',
    defaultColumns: ['name', 'photos', 'imageAuthorization.date', '_status'],
    description: 'Nome artístico e até 3 fotos. Sem nudez explícita: esta galeria é aberta ao público.',
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    // T-02-10: visitors see published models only
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
    // T-02-11: writes are staff-only
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  defaultSort: 'order',
  hooks: {
    afterChange: [revalidateModels],
    afterDelete: [revalidateModelsAfterDelete],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nome artístico',
    },
    {
      name: 'photos',
      type: 'array',
      label: 'Fotos',
      labels: { singular: 'Foto', plural: 'Fotos' },
      minRows: 1,
      maxRows: MAX_MODEL_PHOTOS,
      admin: { description: 'De 1 a 3 fotos.' },
      validate: (value: unknown) => {
        const count = Array.isArray(value) ? value.length : 0
        if (count > MAX_MODEL_PHOTOS) return 'Cada modelo pode ter no máximo 3 fotos.'
        if (count < 1) return 'Envie pelo menos 1 foto.'
        return true
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'Foto',
        },
      ],
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: 'Ordem',
      admin: { description: 'Números menores aparecem primeiro.', position: 'sidebar' },
    },
    imageAuthorization,
  ],
}
