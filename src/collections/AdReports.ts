import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { isStaff } from '../access/roles'
import { expire } from '../lib/cache/expire'
import { reportEndpoints } from '../lib/classisex/endpoints'
import { REPORT_REASONS } from '../lib/classisex/report-rules'

/** `urgente` follows the reason: a report of a minor is always urgent (T-04-17). */
const computeUrgent: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const motivo = (data.motivo ?? originalDoc?.motivo) as string | undefined
  data.urgente = motivo === 'menor-de-idade'
  return data
}

/**
 * Reports of ClassiSex ads (CLAS-05, D-08). Staff-only for every REST operation (T-04-24): who
 * reported whom is sensitive. Subscribers write only through `reportAd` (service.ts) after the
 * members-area DAL check; staff resolve through `/api/ad-reports/:id/resolver` (audited).
 * The ad and the reporter are kept optional so a report outlives a deleted ad or account.
 */
export const AdReports: CollectionConfig = {
  slug: 'ad-reports',
  labels: { singular: 'Denúncia', plural: 'Denúncias' },
  admin: {
    group: 'ClassiSex',
    useAsTitle: 'adSnapshot',
    defaultColumns: ['urgente', 'motivo', 'adSnapshot', 'status', 'createdAt'],
    listSearchableFields: ['adSnapshot', 'detalhes'],
    description: 'Denúncias feitas por assinantes. As urgentes (pessoa menor de idade) aparecem primeiro.',
  },
  // Urgent first, then oldest first (queue order)
  defaultSort: ['-urgente', 'createdAt'] as unknown as string,
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  endpoints: reportEndpoints,
  hooks: {
    beforeChange: [computeUrgent],
    afterChange: [
      ({ doc }) => {
        expire(['ads'])
        return doc
      },
    ],
  },
  fields: [
    {
      // Despublicar / Descartar (D-08); hidden on create
      name: 'painel',
      type: 'ui',
      label: 'Denúncia',
      admin: { components: { Field: '/components/admin/classisex/DenunciaPanel#DenunciaPanel' } },
    },
    {
      name: 'ad',
      type: 'relationship',
      relationTo: 'ads',
      index: true,
      label: 'Anúncio',
      admin: { description: 'Fica vazio se o anúncio foi apagado; o resumo abaixo continua.' },
    },
    {
      name: 'adSnapshot',
      type: 'text',
      label: 'Resumo do anúncio',
      admin: { readOnly: true },
    },
    {
      name: 'reporter',
      type: 'relationship',
      relationTo: 'assinantes',
      index: true,
      label: 'Quem denunciou',
      admin: { readOnly: true, description: 'Só a equipe vê. Nunca é mostrado ao anunciante.' },
    },
    {
      name: 'motivo',
      type: 'select',
      required: true,
      label: 'Motivo',
      options: REPORT_REASONS.map((r) => ({ label: r.label, value: r.value })),
    },
    { name: 'detalhes', type: 'textarea', maxLength: 500, label: 'Detalhes' },
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
