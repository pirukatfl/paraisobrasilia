import {
  ValidationError,
  type CollectionBeforeChangeHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
} from 'payload'

import { isStaff } from '../access/roles'
import { redactContacts } from '../lib/classisex/redact'
import { APELIDO_MAX } from '../lib/classisex/rules'
import {
  isOnlyContact,
  normaliseApelido,
  normaliseTexto,
  RECADO_MAX,
  RECADO_MESSAGES,
  recadoApelidoError,
  recadoResumo,
  recadoTextoError,
} from '../lib/recados/rules'

export const RECADO_STATUS_OPTIONS = [
  { label: 'Em análise', value: 'pendente' },
  { label: 'Publicado', value: 'aprovado' },
  { label: 'Recusado', value: 'recusado' },
  { label: 'Despublicado', value: 'despublicado' },
] as const

const fail = (req: Parameters<CollectionBeforeValidateHook>[0]['req'], path: string, message: string): never => {
  throw new ValidationError({ collection: 'recados', errors: [{ path, message }], req }, req.t)
}

/**
 * Same rules as the members form for staff edits in the admin. T-05-03: whatever the origin of the
 * write, contacts are removed before the text is stored.
 */
const normaliseAndRedact: CollectionBeforeValidateHook = ({ data, originalDoc, operation, req }) => {
  if (!data) return data
  if (operation === 'create' || 'apelido' in data) {
    const apelido = normaliseApelido(String(data.apelido ?? ''))
    const error = recadoApelidoError(apelido)
    if (error) fail(req, 'apelido', error)
    data.apelido = apelido
  }
  if (operation === 'create' || 'texto' in data) {
    const texto = normaliseTexto(String(data.texto ?? ''))
    const error = recadoTextoError(texto)
    if (error) fail(req, 'texto', error)
    const redacted = redactContacts(texto)
    if (redacted.removed > 0 && isOnlyContact(redacted.text)) fail(req, 'texto', RECADO_MESSAGES.soContato)
    data.texto = redacted.text
    if (redacted.removed > 0) {
      data.contatosRemovidos = Number(data.contatosRemovidos ?? originalDoc?.contatosRemovidos ?? 0) + redacted.removed
    }
  }
  return data
}

const computeDerived: CollectionBeforeChangeHook = ({ data, originalDoc, operation }) => {
  const merged = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>
  data.resumo = recadoResumo(String(merged.apelido ?? ''), String(merged.texto ?? ''))
  if (operation === 'create' && !data.submittedAt) data.submittedAt = new Date().toISOString()
  return data
}

/**
 * T-05-06: status and motivo change only through the audited moderation service. A write by a
 * signed-in principal (REST or the admin form) that does not carry context.moderation keeps the
 * stored values.
 */
const guardModeration: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req, context }) => {
  if (operation !== 'update' || !req.user || context?.moderation || !originalDoc) return data
  for (const key of ['status', 'motivo', 'publishedAt', 'moderatedAt', 'moderatedBy'] as const) {
    if (key in data) data[key] = (originalDoc as Record<string, unknown>)[key]
  }
  return data
}

const dateAdmin = {
  readOnly: true,
  position: 'sidebar' as const,
  date: { pickerAppearance: 'dayAndTime' as const, displayFormat: 'dd/MM/yyyy HH:mm' },
}

/**
 * LEGACY mural of recados, switched off on 2026-10-20 (quick recados-privados, R-06). The table and
 * every data field are kept (no migration); there is no page, component, query or moderation
 * endpoint, and the collection is hidden from the admin. REST stays staff-only (T-RP-04) and the
 * account-delete cascade in Assinantes.ts still removes a person's rows (LGPD).
 * "Recados" for members are now the private conversations (collections `conversations`/`messages`).
 */
export const Recados: CollectionConfig = {
  slug: 'recados',
  labels: { singular: 'Recado', plural: 'Recados' },
  admin: {
    group: 'Recados',
    hidden: true,
    useAsTitle: 'resumo',
    defaultColumns: ['resumo', 'status', 'submittedAt', 'author'],
    listSearchableFields: ['resumo', 'apelido', 'texto'],
    description: 'Mural antigo, desativado em 20/10/2026. Dados guardados, sem tela.',
  },
  defaultSort: '-submittedAt',
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    beforeValidate: [normaliseAndRedact],
    beforeChange: [guardModeration, computeDerived],
  },
  fields: [
    {
      name: 'resumo',
      type: 'text',
      label: 'Resumo',
      admin: { readOnly: true, description: 'Calculado: apelido — início do texto.' },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'assinantes',
      required: true,
      index: true,
      label: 'Assinante',
      admin: { readOnly: true, description: 'Quem escreveu o recado. Só a equipe vê; no site aparece só o apelido.' },
    },
    {
      name: 'apelido',
      type: 'text',
      required: true,
      maxLength: APELIDO_MAX,
      label: 'Apelido',
      admin: { description: 'O que os assinantes veem. Sem telefone, e-mail, @ ou link.' },
    },
    {
      name: 'texto',
      type: 'textarea',
      required: true,
      maxLength: RECADO_MAX,
      label: 'Recado (contatos já removidos)',
      admin: { description: `Até ${RECADO_MAX} caracteres. Telefones, e-mails, @ e links são retirados ao salvar.` },
    },
    {
      name: 'contatosRemovidos',
      type: 'number',
      defaultValue: 0,
      label: 'Contatos removidos',
      admin: { readOnly: true, position: 'sidebar', description: 'Quantos contatos o sistema retirou do texto.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pendente',
      index: true,
      label: 'Situação',
      options: RECADO_STATUS_OPTIONS.map((o) => ({ ...o })),
      // Owners never set the status (T-05-04); staff use the audited buttons (05-06)
      access: { create: isStaff, update: isStaff },
      admin: { position: 'sidebar', readOnly: true, description: 'Mural desativado: a situação não muda mais.' },
    },
    {
      name: 'motivo',
      type: 'text',
      maxLength: 300,
      label: 'Motivo (aparece para quem escreveu)',
      admin: { position: 'sidebar', readOnly: true, description: 'Preenchido pelos botões Recusar e Despublicar.' },
    },
    { name: 'submittedAt', type: 'date', index: true, label: 'Enviado em', admin: dateAdmin },
    { name: 'publishedAt', type: 'date', index: true, label: 'Publicado em', admin: dateAdmin },
    { name: 'moderatedAt', type: 'date', label: 'Moderado em', admin: dateAdmin },
    {
      name: 'moderatedBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'Moderado por',
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
