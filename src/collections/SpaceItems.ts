import type { CollectionConfig } from 'payload'

import { imageAuthorization } from '../fields/imageAuthorization'
import { revalidateSpace, revalidateSpaceAfterDelete } from '../lib/gallery/revalidate'

const isStaff = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

type Sibling = { kind?: 'photo' | 'video' }

/** Space gallery entries (MIDIA-01, PAINEL-02): a photo (media) or a video (videos). */
export const SpaceItems: CollectionConfig = {
  slug: 'space-items',
  labels: { singular: 'Foto ou vídeo do espaço', plural: 'Galeria do espaço' },
  admin: {
    group: 'Site',
    useAsTitle: 'caption',
    defaultColumns: ['image', 'kind', 'caption', 'order', '_status'],
    description: 'Fotos e vídeos dos ambientes. Sem nudez explícita: esta galeria é aberta ao público.',
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    // T-02-05: visitors see published items only
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  defaultSort: 'order',
  hooks: {
    afterChange: [revalidateSpace],
    afterDelete: [revalidateSpaceAfterDelete],
  },
  fields: [
    {
      name: 'kind',
      type: 'radio',
      required: true,
      defaultValue: 'photo',
      label: 'Tipo',
      options: [
        { label: 'Foto', value: 'photo' },
        { label: 'Vídeo', value: 'video' },
      ],
      admin: { layout: 'horizontal' },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'Foto',
      admin: {
        condition: (_data, sibling: Sibling) => sibling?.kind !== 'video',
        description: 'JPG, PNG ou WebP até 15 MB. A foto é convertida para WebP automaticamente.',
      },
      validate: (value: unknown, { siblingData }: { siblingData: Sibling }) =>
        siblingData?.kind === 'video' || value ? true : 'Escolha a foto.',
    },
    {
      name: 'video',
      type: 'upload',
      relationTo: 'videos',
      label: 'Vídeo',
      admin: {
        condition: (_data, sibling: Sibling) => sibling?.kind === 'video',
        description: 'Escolha um item de Vídeos.',
      },
      validate: (value: unknown, { siblingData }: { siblingData: Sibling }) =>
        siblingData?.kind !== 'video' || value ? true : 'Escolha o vídeo.',
    },
    {
      name: 'caption',
      type: 'text',
      maxLength: 80,
      label: 'Legenda',
      admin: { description: 'Opcional, até 80 caracteres.' },
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
