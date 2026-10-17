import {
  BoldFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
  ItalicFeature,
  lexicalEditor,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical'
import type { CollectionBeforeChangeHook, CollectionConfig, FieldHook } from 'payload'

import { revalidatePartyAfterChange, revalidatePartyAfterDelete } from '../lib/parties/revalidate'
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
    defaultColumns: ['title', 'startsAt', '_status'],
    listSearchableFields: ['title'],
    description:
      'Crie a festa, envie o flyer e clique em Publicar. Para tirar do site, use Despublicar. Festas saem da página inicial sozinhas depois do término.',
  },
  // Publicar / Despublicar + history (T-01-28)
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    // Visitors and anonymous API calls see only published parties (T-01-25)
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    beforeChange: [fillDefaultEnd],
    // Publish, edit and unpublish (updates of _status) show up on the site at once
    afterChange: [revalidatePartyAfterChange],
    afterDelete: [revalidatePartyAfterDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Título',
      admin: { description: 'Nome da festa como aparece no site.' },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'Endereço da página (slug)',
      admin: {
        description: 'Gerado a partir do título. Só altere se souber o que está fazendo.',
        position: 'sidebar',
      },
      hooks: { beforeValidate: [fillSlugFromTitle] },
    },
    {
      name: 'startsAt',
      type: 'date',
      required: true,
      label: 'Data e hora de início',
      admin: {
        description: 'Horário de Brasília.',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
      },
    },
    {
      name: 'endsAt',
      type: 'date',
      label: 'Data e hora de término',
      admin: {
        description: 'Opcional. Se vazio, a festa sai da página inicial 10 horas depois do início.',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
      },
    },
    {
      name: 'flyer',
      type: 'upload',
      relationTo: 'media',
      required: true,
      label: 'Flyer',
      admin: {
        description:
          'Envie o flyer no formato das redes: 1080×1080 (quadrado) ou 1080×1350 (vertical). JPG, PNG ou WebP até 15 MB.',
      },
    },
    {
      name: 'flyerFormat',
      type: 'select',
      required: true,
      defaultValue: 'portrait',
      label: 'Formato do flyer',
      admin: { description: 'Escolha o mesmo formato do flyer enviado.' },
      options: [
        { label: 'Quadrado (1:1)', value: 'square' },
        { label: 'Vertical (4:5)', value: 'portrait' },
      ],
    },
    {
      name: 'summary',
      type: 'textarea',
      maxLength: 160,
      label: 'Resumo',
      admin: { description: 'Uma frase curta (até 160 caracteres). Aparece na prévia do WhatsApp.' },
    },
    {
      name: 'prices',
      type: 'array',
      label: 'Valores',
      admin: { description: 'Valor da entrada por tipo de público (ex.: Casal — R$ 150).' },
      labels: { singular: 'Valor', plural: 'Valores' },
      // Preset rows (D-05); staff can fill, remove, add and reorder
      defaultValue: [
        { label: 'Casal', value: '' },
        { label: 'Mulher sozinha', value: '' },
        { label: 'Homem sozinho', value: '' },
      ],
      fields: [
        { name: 'label', type: 'text', required: true, label: 'Tipo' },
        {
          name: 'value',
          type: 'text',
          label: 'Valor',
          // Optional so the preset rows never block saving; rows without a value are not shown
          admin: { description: 'Ex.: R$ 150. Deixe em branco para não mostrar esta linha.' },
        },
      ],
    },
    {
      name: 'dressCode',
      type: 'text',
      label: 'Dress code / tema',
      admin: { description: 'Ex.: Festa do Branco, Preto e vermelho.' },
    },
    {
      name: 'attractions',
      type: 'array',
      label: 'Atrações',
      admin: { description: 'DJs, shows e modelos da noite.' },
      labels: { singular: 'Atração', plural: 'Atrações' },
      fields: [
        {
          name: 'kind',
          type: 'select',
          required: true,
          label: 'Tipo',
          options: [
            { label: 'DJ', value: 'dj' },
            { label: 'Show', value: 'show' },
            { label: 'Modelo', value: 'modelo' },
            { label: 'Outro', value: 'outro' },
          ],
        },
        { name: 'name', type: 'text', required: true, label: 'Nome' },
      ],
    },
    {
      name: 'details',
      type: 'richText',
      label: 'Sobre a festa',
      admin: { description: 'Texto com os detalhes da festa.' },
      // Text only: paragraphs, bold, italic, lists, links — no images, embeds or headings (T-01-18)
      editor: lexicalEditor({
        features: () => [
          ParagraphFeature(),
          BoldFeature(),
          ItalicFeature(),
          UnorderedListFeature(),
          OrderedListFeature(),
          LinkFeature({ enabledCollections: [] }),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ],
      }),
    },
  ],
}
