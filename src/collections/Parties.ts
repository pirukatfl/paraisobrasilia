import type { CollectionBeforeChangeHook, CollectionConfig, FieldHook } from 'payload'

import { defaultEndsAt } from '../lib/parties/visibility'

const isStaff = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

/** "Festa do Branco — Edição 10" → "festa-do-branco-edicao-10" */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const fillSlugFromTitle: FieldHook = ({ value, data }) => {
  if (typeof value === 'string' && value.trim()) return slugify(value)
  if (typeof data?.title === 'string') return slugify(data.title)
  return value
}

const fillDefaultEnd: CollectionBeforeChangeHook = ({ data }) => {
  if (!data.endsAt && data.startsAt) {
    data.endsAt = defaultEndsAt(new Date(data.startsAt)).toISOString()
  }
  return data
}

export const Parties: CollectionConfig = {
  slug: 'parties',
  labels: { singular: 'Festa', plural: 'Festas' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'startsAt'],
  },
  access: {
    read: () => true,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    beforeChange: [fillDefaultEnd],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Título',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Endereço da página (slug)',
      hooks: { beforeValidate: [fillSlugFromTitle] },
    },
    {
      name: 'startsAt',
      type: 'date',
      required: true,
      label: 'Data e hora de início',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'endsAt',
      type: 'date',
      label: 'Data e hora de término',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'flyer',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Flyer',
    },
    {
      name: 'flyerFormat',
      type: 'select',
      required: true,
      defaultValue: 'portrait',
      label: 'Formato do flyer',
      options: [
        { label: 'Quadrado (1:1)', value: 'square' },
        { label: 'Vertical (4:5)', value: 'portrait' },
      ],
    },
  ],
}
