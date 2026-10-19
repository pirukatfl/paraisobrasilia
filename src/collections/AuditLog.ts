import type { CollectionConfig } from 'payload'

import { isStaff } from '../access/roles'
import { AUDIT_ACTIONS } from '../lib/assinantes/audit'

/**
 * Append-only log of every staff action on subscribers (PAINEL-08, D-06). Nobody creates,
 * edits or deletes rows through the API or the panel (T-03-09); rows are written by hooks and
 * services with overrideAccess, in the same request as the change.
 */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  labels: { singular: 'Registro', plural: 'Registro de ações' },
  admin: {
    group: 'Assinantes',
    useAsTitle: 'summary',
    defaultColumns: ['createdAt', 'actorLabel', 'action', 'assinanteLabel', 'summary'],
    listSearchableFields: ['assinanteLabel', 'actorLabel', 'summary'],
    description: 'Tudo o que a equipe faz com assinantes fica registrado aqui. Não é possível editar nem apagar.',
  },
  defaultSort: '-createdAt',
  access: {
    read: isStaff,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'action', type: 'select', required: true, label: 'Ação', options: AUDIT_ACTIONS.map((a) => ({ ...a })) },
    {
      name: 'actorType',
      type: 'select',
      required: true,
      defaultValue: 'sistema',
      label: 'Feito por',
      options: [
        { label: 'Equipe', value: 'equipe' },
        { label: 'Assinante', value: 'assinante' },
        { label: 'Sistema', value: 'sistema' },
      ],
    },
    { name: 'actor', type: 'relationship', relationTo: 'users', label: 'Usuário da equipe' },
    { name: 'actorLabel', type: 'text', label: 'Quem' },
    { name: 'assinante', type: 'relationship', relationTo: 'assinantes', index: true, label: 'Assinante' },
    { name: 'assinanteLabel', type: 'text', label: 'Assinante (nome e e-mail)' },
    { name: 'summary', type: 'text', label: 'Resumo' },
    { name: 'details', type: 'json', label: 'Detalhes' },
  ],
}
