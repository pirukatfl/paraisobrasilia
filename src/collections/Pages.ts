import {
  BoldFeature,
  FixedToolbarFeature,
  HeadingFeature,
  InlineToolbarFeature,
  ItalicFeature,
  lexicalEditor,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { PAGE_KEY_LABELS, PAGE_KEYS } from '../lib/pages/keys'
import { revalidatePageAfterChange, revalidatePageAfterDelete } from '../lib/pages/revalidate'

const isStaff = ({ req }: { req: { user?: unknown } }) => Boolean(req.user)

/**
 * Institutional and legal pages with fixed keys (INST-01, INST-06, PAINEL-04).
 * The key defines the route; staff edit texts and publish, they cannot create new routes.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Página', plural: 'Páginas' },
  admin: {
    group: 'Site',
    useAsTitle: 'title',
    defaultColumns: ['title', 'key', '_status', 'updatedAt'],
    description:
      'Textos de Quem Somos, Normas, Regras, Dicas, Termos e Política de Privacidade. Edite e clique em Publicar.',
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    // T-02-04: anonymous visitors and API calls see published pages only
    read: ({ req }) => (req.user ? true : { _status: { equals: 'published' } }),
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    afterChange: [revalidatePageAfterChange],
    afterDelete: [revalidatePageAfterDelete],
  },
  fields: [
    {
      name: 'key',
      type: 'select',
      required: true,
      unique: true,
      index: true,
      label: 'Página',
      options: PAGE_KEYS.map((value) => ({ value, label: PAGE_KEY_LABELS[value] })),
      admin: { position: 'sidebar', description: 'Define o endereço da página. Não pode repetir.' },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      label: 'Título',
    },
    {
      name: 'intro',
      type: 'textarea',
      maxLength: 200,
      label: 'Introdução',
      admin: {
        description:
          'Uma ou duas frases (até 200 caracteres). Aparece no topo e na prévia do Google/WhatsApp.',
      },
    },
    {
      name: 'body',
      type: 'richText',
      label: 'Texto',
      // Text only: paragraphs, H2/H3, bold, italic, lists, links — no images or embeds
      editor: lexicalEditor({
        features: () => [
          ParagraphFeature(),
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
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
