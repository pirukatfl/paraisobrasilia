import {
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  lexicalEditor,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical'
import { ValidationError, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'

import { isStaff } from '../access/roles'
import { withRequestState } from '../lib/assinantes/context'
import {
  DEFAULT_OPEN_BLOCKS,
  MAX_OPEN_BLOCKS,
  SLUG_MAX,
  SLUG_RE,
  slugify,
} from '../lib/contos/excerpt'
import { revalidateContoAfterChange, revalidateContoAfterDelete } from '../lib/contos/revalidate'

export const CONTO_MESSAGES = {
  slugInvalid: 'Use só letras minúsculas, números e hífens.',
  slugTaken: 'Já existe um conto com este endereço.',
  open: `Escolha de 1 a ${MAX_OPEN_BLOCKS} parágrafos.`,
  publishedAt: 'Informe a data de publicação.',
} as const

const fail = (req: Parameters<CollectionBeforeValidateHook>[0]['req'], path: string, message: string): never => {
  throw new ValidationError({ collection: 'contos', errors: [{ path, message }], req }, req.t)
}

/** Title/slug hygiene, slug default from the title, and the pt messages for slug problems. */
const prepare: CollectionBeforeValidateHook = async ({ data, originalDoc, operation, req }) => {
  if (!data) return data
  if (typeof data.title === 'string') data.title = data.title.replace(/\s+/g, ' ').trim()
  if (typeof data.slug === 'string') data.slug = data.slug.trim()
  if (operation === 'create' && !data.slug && typeof data.title === 'string' && data.title) {
    data.slug = slugify(data.title)
  }
  const slug = typeof data.slug === 'string' ? data.slug : null
  if (slug) {
    if (slug.length > SLUG_MAX || !SLUG_RE.test(slug)) fail(req, 'slug', CONTO_MESSAGES.slugInvalid)
    const clash = await withRequestState(req, () =>
      req.payload.find({
        collection: 'contos',
        where: {
          and: [
            { slug: { equals: slug } },
            ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
          ],
        },
        limit: 1,
        depth: 0,
        pagination: false,
        overrideAccess: true,
        draft: true,
        req,
      }),
    )
    if (clash.docs.length) fail(req, 'slug', CONTO_MESSAGES.slugTaken)
  }
  return data
}

const dateAdmin = (description?: string) => ({
  position: 'sidebar' as const,
  ...(description ? { description } : {}),
  date: { pickerAppearance: 'dayOnly' as const, displayFormat: 'dd/MM/yyyy' },
})

/**
 * Contos (D-03, PAINEL-03): one rich text, a number of open paragraphs, drafts for publishing.
 *
 * T-05-01: every REST operation (including drafts and versions) is staff-only. Visitors and
 * subscribers read contos only through server DTOs (05-03) that carry just the allowed part.
 */
export const Contos: CollectionConfig = {
  slug: 'contos',
  labels: { singular: 'Conto', plural: 'Contos' },
  admin: {
    group: 'Contos',
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', '_status', 'paragrafosAbertos'],
    listSearchableFields: ['title', 'slug'],
    description: 'Contos do site. Visitantes leem só os primeiros parágrafos; o resto é para assinantes.',
  },
  defaultSort: '-publishedAt',
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    read: isStaff,
    readVersions: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    beforeValidate: [prepare],
    afterChange: [revalidateContoAfterChange],
    afterDelete: [revalidateContoAfterDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      maxLength: 160,
      label: 'Título',
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      maxLength: SLUG_MAX,
      label: 'Endereço',
      admin: {
        position: 'sidebar',
        description:
          'Endereço: /contos/…  Se ficar vazio, é criado a partir do título. Mudar o endereço quebra links já compartilhados.',
      },
      validate: (value: unknown) =>
        typeof value === 'string' && value.length <= SLUG_MAX && SLUG_RE.test(value) ? true : CONTO_MESSAGES.slugInvalid,
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      index: true,
      label: 'Data de publicação',
      admin: dateAdmin('Aparece no conto e ordena a lista: mais recentes primeiro.'),
      validate: (value: unknown) => (value ? true : CONTO_MESSAGES.publishedAt),
    },
    {
      name: 'texto',
      type: 'richText',
      required: true,
      label: 'Texto',
      // Text only: paragraphs, H2/H3, bold, italic, lists — no links, images or embeds
      editor: lexicalEditor({
        features: () => [
          ParagraphFeature(),
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
          BoldFeature(),
          ItalicFeature(),
          UnorderedListFeature(),
          OrderedListFeature(),
          FixedToolbarFeature(),
          InlineToolbarFeature(),
        ],
      }),
    },
    {
      name: 'paragrafosAbertos',
      type: 'number',
      required: true,
      defaultValue: DEFAULT_OPEN_BLOCKS,
      label: 'Parágrafos abertos',
      admin: {
        step: 1,
        description:
          'Quantos parágrafos do início qualquer visitante lê. O resto é só para assinantes. Mesmo que você aumente, o trecho aberto nunca passa de 150 palavras ou 15% do conto (vale o maior) e a última parte fica sempre para assinantes. Títulos curtos no começo não contam.',
      },
      validate: (value: unknown) =>
        typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= MAX_OPEN_BLOCKS
          ? true
          : CONTO_MESSAGES.open,
    },
    {
      // What visitors will read, from the same splitConto rule as the public page (05-03)
      name: 'trechoAberto',
      type: 'ui',
      label: 'Trecho aberto',
      admin: { components: { Field: '/components/admin/contos/TrechoAbertoPanel#TrechoAbertoPanel' } },
    },
    {
      name: 'wpId',
      type: 'number',
      unique: true,
      index: true,
      label: 'Código no site antigo',
      admin: { position: 'sidebar', readOnly: true, description: 'Preenchido pela importação. Não mexa.' },
    },
    {
      name: 'wpSlug',
      type: 'text',
      label: 'Endereço no site antigo',
      admin: { position: 'sidebar', readOnly: true, description: 'Usado para redirecionar o link antigo para este conto.' },
    },
    {
      name: 'wpRestrito',
      type: 'checkbox',
      label: 'No site antigo era só para assinantes',
      admin: { position: 'sidebar', readOnly: true },
    },
    {
      name: 'importadoEm',
      type: 'date',
      label: 'Importado em',
      admin: { position: 'sidebar', readOnly: true, date: { displayFormat: 'dd/MM/yyyy HH:mm' } },
    },
  ],
}
