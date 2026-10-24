import type { CollectionConfig } from 'payload'

import { MESSAGE_MAX } from '../lib/mensagens/rules'

/**
 * Messages of a conversation (REC-02): text only, not moderated.
 *
 * T-05-09: reachable only through src/lib/mensagens/service.ts; REST closed for everybody.
 */
export const Messages: CollectionConfig = {
  slug: 'messages',
  labels: { singular: 'Mensagem', plural: 'Mensagens' },
  admin: { group: 'ClassiSex', hidden: true },
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'conversation', type: 'relationship', relationTo: 'conversations', required: true, index: true },
    { name: 'sender', type: 'relationship', relationTo: 'assinantes', required: true, index: true },
    { name: 'texto', type: 'textarea', required: true, maxLength: MESSAGE_MAX },
  ],
}
