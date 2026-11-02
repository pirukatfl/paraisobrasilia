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
  StrikethroughFeature,
  UnderlineFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical'
import type { CollectionConfig } from 'payload'

import { isStaff, staffOrPublished } from '../access/roles'
import { editorLinha } from '../lib/textos/editor'
import { textoPuro, type TextoRico } from '../lib/textos/rico'
import { PAGE_KEY_LABELS, PAGE_KEYS } from '../lib/pages/keys'
import { revalidatePageAfterChange, revalidatePageAfterDelete } from '../lib/pages/revalidate'

const INTRO_MAX = 200

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
    read: staffOrPublished,
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
      type: 'richText',
      label: 'Introdução',
      // Line editor (bold, italic, underline, strikethrough): same marks as the site texts, no links or lists
      editor: editorLinha,
      // The 200-character limit counts the visible text, not the editor JSON
      validate: (value: unknown) => {
        if (!value || typeof value !== 'object') return true
        return textoPuro(value as TextoRico).length > INTRO_MAX
          ? `A introdução pode ter até ${INTRO_MAX} caracteres.`
          : true
      },
      admin: {
        description:
          'Uma ou duas frases (até 200 caracteres). Aparece no topo e na prévia do Google/WhatsApp (lá, sem formatação).',
      },
    },
    {
      name: 'body',
      type: 'richText',
      label: 'Texto',
      // Text only: paragraphs, H2/H3, bold, italic, underline, strikethrough, lists, links — no images or embeds
      editor: lexicalEditor({
        features: () => [
          ParagraphFeature(),
          HeadingFeature({ enabledHeadingSizes: ['h2', 'h3'] }),
          BoldFeature(),
          ItalicFeature(),
          UnderlineFeature(),
          StrikethroughFeature(),
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
