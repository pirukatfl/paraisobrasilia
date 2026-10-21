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
  APELIDO_MAX,
  CIDADE_MAX,
  DRAFT_STATUS,
  TEXT_MAX,
  apelidoError,
  cidadeError,
  isValidTelegram,
  isValidWhatsapp,
  normaliseCidade,
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
  { label: 'Rascunho (site antigo)', value: 'rascunho' },
] as const

const relId = (value: unknown): number | string | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') return ((value as { id?: number | string }).id ?? null) as number | string | null
  return value as number | string
}

type Contato = { whatsapp?: string | null; telegram?: string | null }

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
    }
  }
  if (typeof data.apelido === 'string') data.apelido = data.apelido.replace(/\s+/g, ' ').trim()
  if (typeof data.cidade === 'string') data.cidade = data.cidade.replace(/\s+/g, ' ').trim() || null
  if (typeof data.texto === 'string') data.texto = data.texto.replace(/\r\n/g, '\n').trim()

  const merged = { ...((originalDoc?.contato as Contato | undefined) ?? {}), ...((data.contato as Contato) ?? {}) }
  // M-04: a draft brought from the old site may have no contact yet; the owner adds it before sending
  const status = (data.status ?? originalDoc?.status) as string | undefined
  if (!merged.whatsapp && !merged.telegram && status !== DRAFT_STATUS) {
    throw new ValidationError(
      { collection: 'ads', errors: [{ path: 'contato.whatsapp', message: AD_MESSAGES.contato }], req },
      req.t,
    )
  }
  return data
}

/** Only a team draft from the old site can change owner (staff reassign it to the right member). */
const guardAuthorChange: CollectionBeforeValidateHook = ({ data, operation, originalDoc, req }) => {
  if (operation !== 'update' || !data || !originalDoc || data.author === undefined) return data
  if (relId(data.author) !== relId(originalDoc.author) && originalDoc.origemLegado !== 'equipe') {
    throw new ValidationError(
      {
        collection: 'ads',
        errors: [{ path: 'author', message: 'Só dá para trocar o anunciante de um anúncio antigo da equipe.' }],
        req,
      },
      req.t,
    )
  }
  return data
}

/** cidadeBusca (filter target) and resumo (admin title) follow the current values. */
const computeDerived: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  // Handed to a real owner: it leaves the team filter and becomes that member's own draft
  if (originalDoc?.origemLegado === 'equipe' && data.author !== undefined && relId(data.author) !== relId(originalDoc.author)) {
    data.origemLegado = null
  }
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
  const apelido = String(merged.apelido ?? '').trim()
  const tipo = label || 'Anúncio'
  data.resumo = resumoOf(apelido ? `${apelido} · ${tipo}` : tipo, cidade, String(merged.texto ?? ''))
  return data
}

/**
 * Photos and video go with the ad (Payload deletes each file; AdMedia removes the blurred twin).
 * Its reports stay for the record: they only lose the link (the snapshot keeps the summary).
 */
const removeMedia: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await withRequestState(req, () =>
    req.payload.update({
      collection: 'ad-reports',
      where: { ad: { equals: id } },
      data: { ad: null },
      overrideAccess: true,
      req,
    }),
  )
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
    listSearchableFields: ['resumo', 'apelido', 'texto', 'cidade'],
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
    beforeValidate: [guardAuthorChange, normaliseAndCheckContacts],
    beforeChange: [computeDerived],
    // Media files (04-05) and report detaching (04-08)
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
      admin: {
        description:
          'Assinante que escreveu o anúncio. Não aparece no site. Nos anúncios antigos da equipe, troque pelo dono certo (ele passa a ver o rascunho em Meus anúncios).',
      },
    },
    {
      name: 'apelido',
      type: 'text',
      required: true,
      maxLength: APELIDO_MAX,
      label: 'Apelido',
      admin: { description: 'Aparece na área aberta. Sem telefone, e-mail, @ ou link.' },
      validate: (value: unknown) => apelidoError(String(value ?? '').replace(/\s+/g, ' ').trim()) ?? true,
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
          admin: { description: 'Opcional. Só letras. Só assinantes veem.' },
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
        description: `Até ${TEXT_MAX} caracteres. Só assinantes veem o texto.`,
      },
      // M-04: old texts may exceed the limit while the ad is a draft; the owner shortens it before sending
      validate: (value: unknown, { siblingData }: { siblingData?: Record<string, unknown> }) =>
        siblingData?.status === DRAFT_STATUS
          ? String(value ?? '').trim()
            ? true
            : AD_MESSAGES.textoVazio
          : (textoError(String(value ?? '')) ?? true),
    },
    {
      name: 'contato',
      type: 'group',
      label: 'Contato (só assinantes veem)',
      admin: { description: 'WhatsApp ou Telegram, pelo menos um. Nunca aparece na área aberta.' },
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
      ],
    },
    {
      name: 'midias',
      type: 'join',
      collection: 'ad-media',
      on: 'ad',
      label: 'Fotos e vídeos',
      defaultSort: 'order',
      admin: { allowCreate: false },
    },
    {
      name: 'denuncias',
      type: 'join',
      collection: 'ad-reports',
      on: 'ad',
      label: 'Denúncias',
      defaultSort: ['-urgente', 'createdAt'] as unknown as string,
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
      // M-04: set only by the WordPress importer (Local API); never by REST or the owner
      name: 'wpCommentId',
      type: 'number',
      unique: true,
      index: true,
      label: 'ID do comentário no site antigo',
      access: { create: () => false, update: () => false, read: isStaff },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      // M-04: set only by the importer for ads whose old author was not imported (team, deleted user)
      name: 'origemLegado',
      type: 'select',
      index: true,
      label: 'Anúncio antigo da equipe',
      options: [{ label: 'Anúncio antigo da equipe (revisar)', value: 'equipe' }],
      access: { create: () => false, update: () => false, read: isStaff },
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Rascunho trazido do site antigo, só a equipe vê. Troque o anunciante, edite e aprove, ou apague.',
      },
    },
    {
      name: 'importadoEm',
      type: 'date',
      label: 'Importado do site antigo em',
      access: { create: () => false, update: () => false, read: isStaff },
      admin: dateAdmin(),
    },
    {
      name: 'criadoNoSiteAntigoEm',
      type: 'date',
      label: 'Publicado no site antigo em',
      access: { create: () => false, update: () => false, read: isStaff },
      admin: dateAdmin(),
    },
    {
      name: 'consentAt',
      type: 'date',
      label: 'Declaração aceita em',
      admin: dateAdmin('O anunciante declarou ter 18 anos ou mais e autorização de todas as pessoas das fotos e do vídeo.'),
    },
  ],
}
