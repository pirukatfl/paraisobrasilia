import { APIError, type CollectionBeforeDeleteHook, type CollectionConfig } from 'payload'

import { isStaff } from '../access/roles'
import { withRequestState } from '../lib/assinantes/context'
import { expire } from '../lib/cache/expire'

export const CATEGORY_IN_USE = 'Esta opção está em uso em anúncios. Desative em vez de excluir.'

/** Ads keep a required relation to their option: refuse deletion while any ad uses it. */
const refuseWhenInUse: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { totalDocs } = await withRequestState(req, () =>
    req.payload.count({ collection: 'ads', where: { euSou: { equals: id } }, overrideAccess: true, req }),
  )
  if (totalDocs > 0) throw new APIError(CATEGORY_IN_USE, 400, null, true)
}

/** "Eu sou" options of the ClassiSex form (D-01: list editable in the panel). */
export const AdCategories: CollectionConfig = {
  slug: 'ad-categories',
  labels: { singular: 'Opção "Eu sou"', plural: 'Opções "Eu sou"' },
  admin: {
    group: 'ClassiSex',
    useAsTitle: 'name',
    defaultColumns: ['name', 'order', 'active'],
    description: 'Opções do campo "Eu sou" nos anúncios (ex.: Casal, Solteiro, Solteira).',
  },
  defaultSort: 'order',
  access: {
    // Labels only, shown on the public preview and in the forms
    read: () => true,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    beforeDelete: [refuseWhenInUse],
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
    { name: 'name', type: 'text', required: true, unique: true, label: 'Nome' },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: 'Ordem',
      admin: { position: 'sidebar', description: 'Menor aparece primeiro.' },
    },
    {
      name: 'active',
      type: 'checkbox',
      defaultValue: true,
      label: 'Ativa',
      admin: {
        position: 'sidebar',
        description: 'Desmarque para tirar da lista sem apagar os anúncios que já usam esta opção.',
      },
    },
  ],
}
