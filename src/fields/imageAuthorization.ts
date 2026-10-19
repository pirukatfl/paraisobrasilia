import type { GroupField } from 'payload'

import { isStaff } from '../access/roles'

/**
 * "Autorização de uso de imagem" (D-09): recommended, NOT required to publish.
 * The note may hold personal information, so only staff can read the group:
 * anonymous REST/GraphQL/Local API responses never include it (T-02-06).
 */
export const imageAuthorization: GroupField = {
  name: 'imageAuthorization',
  type: 'group',
  label: 'Autorização de uso de imagem',
  admin: {
    description:
      'Recomendado, não obrigatório para publicar. Ex.: Enviou as fotos por WhatsApp para divulgação em 12/10/2026.',
  },
  access: {
    read: isStaff,
  },
  fields: [
    {
      name: 'date',
      type: 'date',
      label: 'Data da autorização',
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' } },
    },
    {
      name: 'note',
      type: 'textarea',
      label: 'Observação',
    },
  ],
}
