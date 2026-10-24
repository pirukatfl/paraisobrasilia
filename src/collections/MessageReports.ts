import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { isStaff } from '../access/roles'
import { messageReportEndpoints } from '../lib/mensagens/endpoints'
import { MESSAGE_REPORT_REASONS, MESSAGE_URGENT_REASON } from '../lib/mensagens/rules'

/** `urgente` follows the reason: a report of a minor is always urgent (T-04-17 pattern). */
const computeUrgent: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const motivo = (data.motivo ?? originalDoc?.motivo) as string | undefined
  data.urgente = motivo === MESSAGE_URGENT_REASON
  return data
}

/**
 * Reports of private conversations (REC-03). Staff-only for every REST operation (T-05-28): who
 * reported whom is sensitive. Subscribers write only through `reportConversation` (service.ts)
 * after the members-area DAL check; staff resolve through `/api/message-reports/:id/resolver`
 * (audited). Staff see only the snapshot taken at report time (T-05-09), never the conversation.
 * Relations are optional so a report outlives deleted accounts.
 */
export const MessageReports: CollectionConfig = {
  slug: 'message-reports',
  labels: { singular: 'Denúncia de recado', plural: 'Denúncias de recados' },
  admin: {
    group: 'ClassiSex',
    useAsTitle: 'reportedApelido',
    defaultColumns: ['urgente', 'motivo', 'reportedApelido', 'status', 'createdAt'],
    listSearchableFields: ['reportedApelido', 'detalhes'],
    description: 'Denúncias de conversas privadas. As urgentes (pessoa menor de idade) aparecem primeiro.',
  },
  defaultSort: ['-urgente', 'createdAt'] as unknown as string,
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  endpoints: messageReportEndpoints,
  hooks: { beforeChange: [computeUrgent] },
  fields: [
    {
      // Descartar / Resolver / Suspender mensagens; hidden on create
      name: 'painel',
      type: 'ui',
      label: 'Denúncia',
      admin: { components: { Field: '/components/admin/mensagens/MensagemDenunciaPanel#MensagemDenunciaPanel' } },
    },
    {
      name: 'conversationId',
      type: 'number',
      label: 'Conversa (número)',
      admin: { readOnly: true, description: 'Só para referência. A equipe não abre conversas, só lê o que a denúncia guardou.' },
    },
    {
      name: 'reportedApelido',
      type: 'text',
      label: 'Apelido da pessoa denunciada',
      admin: { readOnly: true },
    },
    {
      name: 'reported',
      type: 'relationship',
      relationTo: 'assinantes',
      index: true,
      label: 'Pessoa denunciada',
      admin: { readOnly: true, description: 'Fica vazio se a conta foi apagada.' },
    },
    {
      name: 'reporter',
      type: 'relationship',
      relationTo: 'assinantes',
      index: true,
      label: 'Quem denunciou',
      admin: { readOnly: true, description: 'Só a equipe vê. Nunca é mostrado à pessoa denunciada.' },
    },
    {
      name: 'motivo',
      type: 'select',
      required: true,
      label: 'Motivo',
      options: MESSAGE_REPORT_REASONS.map((r) => ({ label: r.label, value: r.value })),
    },
    { name: 'detalhes', type: 'textarea', maxLength: 500, label: 'Detalhes' },
    {
      name: 'mensagens',
      type: 'textarea',
      label: 'Mensagens denunciadas (últimas 20)',
      admin: { readOnly: true },
    },
    {
      name: 'urgente',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: 'Urgente',
      admin: { readOnly: true, position: 'sidebar', description: 'Marcada sozinha quando o motivo é pessoa menor de idade.' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'aberta',
      index: true,
      label: 'Situação',
      options: [
        { label: 'Aberta', value: 'aberta' },
        { label: 'Resolvida', value: 'resolvida' },
        { label: 'Descartada', value: 'descartada' },
      ],
      admin: { position: 'sidebar', readOnly: true, description: 'Use os botões do quadro Denúncia.' },
    },
    {
      name: 'resolvidaPor',
      type: 'relationship',
      relationTo: 'users',
      label: 'Resolvida por',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'resolvidaEm',
      type: 'date',
      label: 'Resolvida em',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
      },
    },
    { name: 'nota', type: 'text', maxLength: 300, label: 'Nota da equipe', admin: { readOnly: true } },
  ],
}
