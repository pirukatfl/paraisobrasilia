import type { CollectionConfig } from 'payload'

import { isStaff } from '../access/roles'
import { expire } from '../lib/cache/expire'

const isEmpty = (value: unknown) => value === undefined || value === null || value === ''

/** PagBank links only, over https (T-03-13: no javascript:/http: links on the public page). */
export function validatePaymentUrl(value: unknown): true | string {
  if (isEmpty(value)) return true
  const text = String(value).trim()
  if (!text.startsWith('https://')) return 'Use um link que comece com https://'
  try {
    new URL(text)
    return true
  } catch {
    return 'Use um link que comece com https://'
  }
}

/**
 * Subscription plans shown on /assine-ja (ASS-05, D-02, D-03). Staff edit prices, promos and
 * PagBank links without a developer.
 */
export const Plans: CollectionConfig = {
  slug: 'plans',
  labels: { singular: 'Plano', plural: 'Planos' },
  admin: {
    group: 'Assinantes',
    useAsTitle: 'name',
    defaultColumns: ['name', 'durationDays', 'price', 'promoPrice', 'active'],
    description:
      'Planos mostrados na página Assine Já. O link do PagBank tem o valor fixo: se mudar o preço, gere um link novo no PagBank e cole aqui.',
  },
  defaultSort: 'order',
  access: {
    // Visitors see active plans only
    read: ({ req }) => (isStaff({ req }) ? true : { active: { equals: true } }),
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    afterChange: [
      ({ doc }) => {
        expire(['plans'])
        return doc
      },
    ],
    afterDelete: [
      ({ doc }) => {
        expire(['plans'])
        return doc
      },
    ],
  },
  fields: [
    { name: 'name', type: 'text', required: true, label: 'Nome do plano', admin: { description: 'Ex.: Mensal.' } },
    {
      name: 'durationDays',
      type: 'number',
      required: true,
      min: 1,
      label: 'Duração (dias)',
      admin: { description: '30 = mensal, 90 = trimestral, 180 = semestral, 365 = anual.', step: 1 },
      validate: (value: unknown) =>
        Number.isInteger(value) && (value as number) >= 1 ? true : 'Informe um número inteiro de dias (mínimo 1).',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'price',
          type: 'number',
          required: true,
          min: 0,
          label: 'Preço (R$)',
          admin: { description: 'Se mudar o preço, gere um link novo no PagBank.' },
        },
        {
          name: 'promoPrice',
          type: 'number',
          min: 0,
          label: 'Preço promocional (R$)',
          admin: { description: "Opcional. Aparece como 'de R$ X por R$ Y'." },
          validate: (value: unknown, { siblingData }: { siblingData: Record<string, unknown> }) => {
            if (isEmpty(value) || value === 0) return true
            const price = Number(siblingData?.price)
            return Number(value) < price ? true : 'O preço promocional precisa ser menor que o preço normal.'
          },
        },
      ],
    },
    {
      name: 'paymentUrl',
      type: 'text',
      label: 'Link de pagamento (PagBank)',
      admin: {
        description:
          'Link de pagamento do PagBank com o valor deste plano. Se o preço mudar, gere um link novo no PagBank. Vazio: o site mostra "Combinar pelo WhatsApp".',
      },
      validate: validatePaymentUrl,
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 140,
      label: 'Descrição curta',
      admin: { description: 'Opcional, até 140 caracteres.' },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: 'Mostrar na página Assine Já',
      admin: { position: 'sidebar' },
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: 'Ordem',
      admin: { position: 'sidebar', description: 'Menor aparece primeiro.' },
    },
  ],
}
