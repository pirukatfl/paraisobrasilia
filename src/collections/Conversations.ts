import type { CollectionConfig } from 'payload'

/**
 * One private thread per pair of subscribers (REC-02, D-02).
 *
 * T-05-09: private messages are reachable only through src/lib/mensagens/service.ts (Local API
 * after participant checks). Nobody, staff included, reads them through REST or the panel.
 */
export const Conversations: CollectionConfig = {
  slug: 'conversations',
  labels: { singular: 'Conversa', plural: 'Conversas' },
  admin: { group: 'ClassiSex', hidden: true, useAsTitle: 'pairKey' },
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'participantA', type: 'relationship', relationTo: 'assinantes', required: true, index: true },
    { name: 'participantB', type: 'relationship', relationTo: 'assinantes', required: true, index: true },
    { name: 'pairKey', type: 'text', required: true, unique: true, index: true },
    { name: 'apelidoA', type: 'text', maxLength: 40 },
    { name: 'apelidoB', type: 'text', maxLength: 40 },
    { name: 'assunto', type: 'text', maxLength: 120 },
    { name: 'lastMessageAt', type: 'date', index: true },
    { name: 'lastSender', type: 'relationship', relationTo: 'assinantes' },
    { name: 'startedBy', type: 'relationship', relationTo: 'assinantes', index: true },
    { name: 'lastReadA', type: 'date' },
    { name: 'lastReadB', type: 'date' },
  ],
}
