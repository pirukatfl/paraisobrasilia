import {
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
} from 'payload'

import { isStaff } from '../access/roles'
import { withRequestState } from '../lib/assinantes/context'
import { expire } from '../lib/cache/expire'
import { adEndpoints } from '../lib/classisex/endpoints'
import {
  AD_MESSAGES,
  CIDADE_MAX,
  TEXT_MAX,
  cidadeError,
  isValidEmail,
  isValidTelegram,
  isValidWhatsapp,
  normaliseCidade,
  normaliseEmail,
  normaliseTelegram,
  normaliseWhatsapp,
  resumoOf,
  textoError,
} from '../lib/classisex/rules'

export const AD_STATUS_OPTIONS = [
  { label: 'Em análise', value: 'pendente' },
  { label: 'Publicado', value: 'aprovado' },
  { label: 'Recusado', value: 'recusado' },
  { label: 'Despublicado', value: 'despublicado' },
] as const

const relId = (value: unknown): number | string | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') return ((value as { id?: number | string }).id ?? null) as number | string | null
  return value as number | string
}

type Contato = { whatsapp?: string | null; telegram?: string | null; email?: string | null }

/**
 * Same normalisation as the members form (src/lib/classisex/rules.ts) for staff edits in the
 * admin, plus "at least one contact" (a group-level rule Payload field validation cannot express).
 */
const normaliseAndCheckContacts: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  if (!data) return data
  if (data.contato && typeof data.contato === 'object') {
    const c = data.contato as Contato
    data.contato = {
      ...c,
      ...('whatsapp' in c ? { whatsapp: normaliseWhatsapp(c.whatsapp) } : {}),
      ...('telegram' in c ? { telegram: normaliseTelegram(c.telegram) } : {}),
      ...('email' in c ? { email: normaliseEmail(c.email) } : {}),
    }
  }
  if (typeof data.cidade === 'string') data.cidade = data.cidade.replace(/\s+/g, ' ').trim() || null
  if (typeof data.texto === 'string') data.texto = data.texto.replace(/\r\n/g, '\n').trim()

  const merged = { ...((originalDoc?.contato as Contato | undefined) ?? {}), ...((data.contato as Contato) ?? {}) }
  if (!merged.whatsapp && !merged.telegram && !merged.email) {
    throw new ValidationError(
      { collection: 'ads', errors: [{ path: 'contato.whatsapp', message: AD_MESSAGES.contato }], req },
      req.t,
    )
  }
  return data
}

/** cidadeBusca (filter target) and resumo (admin title) follow the current values. */
const computeDerived: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const merged = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>
  const cidade = (merged.cidade as string | null | undefined) ?? null
  data.cidadeBusca = cidade ? normaliseCidade(cidade) : null
  const euSouId = relId(merged.euSou)
  let label = ''
  if (euSouId !== null) {
    const category = await withRequestState(req, () =>
      req.payload.findByID({
        collection: 'ad-categories',
        id: euSouId,
        depth: 0,
        overrideAccess: true,
        disableErrors: true,
        req,
      }),
    )
    label = category?.name ?? ''
  }
  data.resumo = resumoOf(label || 'Anúncio', cidade, String(merged.texto ?? ''))
  return data
}

/** Photos and video go with the ad (Payload deletes each file; AdMedia removes the blurred twin). */
const removeMedia: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await withRequestState(req, () =>
    req.payload.delete({ collection: 'ad-media', where: { ad: { equals: id } }, overrideAccess: true, req }),
  )
}

const optionalText = (check: (v: string) => boolean, message: string) => (value: unknown) =>
  value === undefined || value === null || value === '' || check(String(value)) ? true : message

const dateAdmin = (description?: string) => ({
  readOnly: true,
  position: 'sidebar' as const,
  ...(description ? { description } : {}),
  date: { pickerAppearance: 'dayAndTime' as const, displayFormat: 'dd/MM/yyyy HH:mm' },
})

/**
 * ClassiSex ads (D-01). New and edited ads wait for staff approval (D-03).
 *
 * T-04-04: every REST operation is staff-only. Subscribers write only through
 * src/lib/classisex/service.ts, after the members-area DAL check and an ownership check.
 */
export const Ads: CollectionConfig = {
  slug: 'ads',
  labels: { singular: 'Anúncio', plural: 'Anúncios' },
  admin: {
    group: 'ClassiSex',
    useAsTitle: 'resumo',
    defaultColumns: ['resumo', 'status', 'submittedAt', 'author'],
    listSearchableFields: ['resumo', 'texto', 'cidade'],
    description:
      'Anúncios do ClassiSex. Novos e editados entram como "Em análise" e só aparecem depois de aprovados.',
  },
  defaultSort: '-submittedAt',
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  // Staff-only moderation actions for the Moderação panel (src/lib/classisex/endpoints.ts)
  endpoints: adEndpoints,
  hooks: {
    beforeValidate: [normaliseAndCheckContacts],
    beforeChange: [computeDerived],
    // Media files (04-05); 04-08 adds reports
    beforeDelete: [removeMedia],
    afterChange: [
      ({ doc }) => {
        expire(['ads'])
        return doc
      },
    ],
    afterDelete: [
      ({ doc }) => {
        expire(['ads'])
        return doc
      },
    ],
  },
  fields: [
    {
      // Aprovar / Recusar / Despublicar with the public preview (PAINEL-07); hidden on create
      name: 'moderacao',
      type: 'ui',
      label: 'Moderação',
      admin: { components: { Field: '/components/admin/classisex/ModeracaoPanel#ModeracaoPanel' } },
    },
    {
      name: 'resumo',
      type: 'text',
      label: 'Resumo',
      admin: { readOnly: true, description: 'Calculado: Eu sou · cidade — início do texto.' },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'assinantes',
      required: true,
      index: true,
      label: 'Anunciante',
      admin: { readOnly: true, description: 'Assinante que escreveu o anúncio. Não aparece no site.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'euSou',
          type: 'relationship',
          relationTo: 'ad-categories',
          required: true,
          index: true,
          label: 'Eu sou',
        },
        {
          name: 'cidade',
          type: 'text',
          maxLength: CIDADE_MAX,
          label: 'Cidade',
          admin: { description: 'Opcional. Só letras.' },
          validate: (value: unknown) => (value ? (cidadeError(String(value)) ?? true) : true),
        },
      ],
    },
    { name: 'cidadeBusca', type: 'text', index: true, admin: { hidden: true } },
    {
      name: 'texto',
      type: 'textarea',
      required: true,
      label: 'Texto',
      admin: {
        description: `Até ${TEXT_MAX} caracteres. Na área aberta, telefones, e-mails, links e @ são removidos automaticamente.`,
      },
      validate: (value: unknown) => textoError(String(value ?? '')) ?? true,
    },
    {
      name: 'contato',
      type: 'group',
      label: 'Contato (só assinantes veem)',
      admin: { description: 'Pelo menos um. Nunca aparece na área aberta.' },
      fields: [
        {
          name: 'whatsapp',
          type: 'text',
          label: 'WhatsApp',
          admin: { description: 'Só números, com 55 e DDD.' },
          validate: optionalText(isValidWhatsapp, AD_MESSAGES.whatsapp),
        },
        {
          name: 'telegram',
          type: 'text',
          label: 'Telegram',
          admin: { description: 'Usuário sem o @.' },
          validate: optionalText(isValidTelegram, AD_MESSAGES.telegram),
        },
        {
          name: 'email',
          type: 'text',
          label: 'E-mail',
          validate: optionalText(isValidEmail, AD_MESSAGES.email),
        },
      ],
    },
    {
      name: 'midias',
      type: 'join',
      collection: 'ad-media',
      on: 'ad',
      label: 'Fotos e vídeo',
      defaultSort: 'order',
      admin: { allowCreate: false },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pendente',
      index: true,
      label: 'Situação',
      options: AD_STATUS_OPTIONS.map((o) => ({ ...o })),
      // Owners never set the status (T-04-04); staff use the audited Moderação buttons (04-03)
      access: { create: isStaff, update: isStaff },
      admin: { position: 'sidebar', readOnly: true, description: 'Use os botões do quadro Moderação.' },
    },
    {
      name: 'motivo',
      type: 'text',
      maxLength: 300,
      label: 'Motivo (aparece para o anunciante)',
      admin: { position: 'sidebar', readOnly: true, description: 'Preenchido pelos botões Recusar e Despublicar.' },
    },
    { name: 'submittedAt', type: 'date', index: true, label: 'Enviado em', admin: dateAdmin() },
    {
      name: 'publishedAt',
      type: 'date',
      index: true,
      label: 'Publicado em',
      admin: dateAdmin('Ordem da lista: mais recentes primeiro.'),
    },
    { name: 'moderatedAt', type: 'date', label: 'Moderado em', admin: dateAdmin() },
    {
      name: 'moderatedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Moderado por',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'consentAt',
      type: 'date',
      label: 'Declaração aceita em',
      admin: dateAdmin('O anunciante declarou ter 18 anos ou mais e autorização de todas as pessoas das fotos e do vídeo.'),
    },
  ],
}
