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
import { SLUG_MAX, SLUG_RE, slugify } from '../lib/contos/excerpt'
import { revalidateDicaAfterChange, revalidateDicaAfterDelete } from '../lib/dicas/revalidate'

export const DICA_MESSAGES = {
  slugInvalid: 'Use só letras minúsculas, números e hífens.',
  slugTaken: 'Já existe uma dica com este endereço.',
  publishedAt: 'Informe a data de publicação.',
} as const

const fail = (req: Parameters<CollectionBeforeValidateHook>[0]['req'], path: string, message: string): never => {
  throw new ValidationError({ collection: 'dicas', errors: [{ path, message }], req }, req.t)
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
    if (slug.length > SLUG_MAX || !SLUG_RE.test(slug)) fail(req, 'slug', DICA_MESSAGES.slugInvalid)
    const clash = await withRequestState(req, () =>
      req.payload.find({
        collection: 'dicas',
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
    if (clash.docs.length) fail(req, 'slug', DICA_MESSAGES.slugTaken)
  }
  return data
}

/**
 * Dicas Hot (quick dicas-hot, DH-01..DH-10): open SEO texts, drafts for publishing.
 *
 * T-DH-01: every REST operation (including drafts and versions) is staff-only. Visitors read
 * dicas only through server DTOs. Deliberately no seo plugin here (I-5).
 */
export const Dicas: CollectionConfig = {
  slug: 'dicas',
  labels: { singular: 'Dica Hot', plural: 'Dicas Hot' },
  admin: {
    group: 'Dicas Hot',
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedAt', '_status', 'revisar'],
    listSearchableFields: ['title', 'slug'],
    description:
      'Dicas Hot do site: textos abertos a qualquer visitante e ao Google. Salve como rascunho para revisar; Publicar coloca no ar.',
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
    afterChange: [revalidateDicaAfterChange],
    afterDelete: [revalidateDicaAfterDelete],
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 160, label: 'Título' },
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
          'Endereço: /dicas-hot/…  Se ficar vazio, é criado a partir do título. Mudar o endereço quebra links já compartilhados e o Google.',
      },
      validate: (value: unknown) =>
        typeof value === 'string' && value.length <= SLUG_MAX && SLUG_RE.test(value) ? true : DICA_MESSAGES.slugInvalid,
    },
    {
      name: 'publishedAt',
      type: 'date',
      required: true,
      index: true,
      label: 'Data de publicação',
      admin: {
        position: 'sidebar',
        description: 'Ordena a lista: mais recentes primeiro.',
        date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
      },
      validate: (value: unknown) => (value ? true : DICA_MESSAGES.publishedAt),
    },
    {
      name: 'resumo',
      type: 'textarea',
      maxLength: 300,
      label: 'Resumo',
      admin: {
        description:
          'Aparece na lista e como descrição no Google e nas prévias do WhatsApp (o Google mostra uns 155 caracteres). Se ficar vazio, usamos o começo do texto.',
      },
    },
    {
      name: 'capa',
      type: 'upload',
      relationTo: 'media',
      label: 'Imagem de capa',
      admin: { description: 'Sem nudez explícita: esta parte do site é aberta.' },
    },
    {
      name: 'capaConferida',
      type: 'checkbox',
      defaultValue: true,
      label: 'Capa conferida (sem nudez explícita)',
      admin: {
        description:
          'A capa só aparece no site e nas prévias de compartilhamento com esta caixa marcada. Capas trazidas do site antigo chegam desmarcadas: olhe a imagem e marque.',
      },
    },
    {
      name: 'texto',
      type: 'richText',
      required: true,
      label: 'Texto',
      // Text only: paragraphs, H2/H3, bold, italic, lists — same editor as Contos
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
      name: 'revisar',
      type: 'checkbox',
      defaultValue: false,
      label: 'Conferir texto importado',
      admin: {
        position: 'sidebar',
        description:
          'Marcado pela importação quando o post antigo era montado no Elementor, perdeu imagens, shortcodes ou contatos, ou era curto. Confira o texto e desmarque.',
      },
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
      admin: { position: 'sidebar', readOnly: true, description: 'Usado para redirecionar o link antigo.' },
    },
    {
      name: 'importadoEm',
      type: 'date',
      label: 'Importado em',
      admin: { position: 'sidebar', readOnly: true, date: { displayFormat: 'dd/MM/yyyy HH:mm' } },
    },
    {
      name: 'capaImportadaEm',
      type: 'date',
      label: 'Capa importada em',
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Preenchido quando a importação trouxe a capa. A importação nunca troca uma capa de novo.',
        date: { displayFormat: 'dd/MM/yyyy HH:mm' },
      },
    },
  ],
}
