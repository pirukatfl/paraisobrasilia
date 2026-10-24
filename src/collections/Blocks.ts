import type { CollectionConfig } from 'payload'

/**
 * Who blocked whom (REC-03, D-02).
 *
 * T-05-09: reachable only through src/lib/mensagens/service.ts. REST closed for everybody (staff
 * included): a block is a private decision of the subscriber.
 */
export const Blocks: CollectionConfig = {
  slug: 'blocks',
  labels: { singular: 'Bloqueio', plural: 'Bloqueios' },
  admin: { group: 'ClassiSex', hidden: true },
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'blocker', type: 'relationship', relationTo: 'assinantes', required: true, index: true },
    { name: 'blocked', type: 'relationship', relationTo: 'assinantes', required: true, index: true },
    { name: 'pairKey', type: 'text', required: true, unique: true, index: true },
  ],
}
