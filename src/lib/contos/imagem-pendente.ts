import type { CollectionAfterChangeHook } from 'payload'

import type { Conto } from '../../payload-types'

/** Publishing a conto makes its (visitor-sent) image public: clears Media.pendente. */
export const clearPendingImageAfterPublish: CollectionAfterChangeHook<Conto> = async ({ doc, req }) => {
  if (doc._status !== 'published' || !doc.imagem) return doc
  const id = typeof doc.imagem === 'object' ? doc.imagem.id : doc.imagem
  const { totalDocs } = await req.payload.count({
    collection: 'media',
    where: { and: [{ id: { equals: id } }, { pendente: { equals: true } }] },
    overrideAccess: true,
    req,
  })
  if (totalDocs === 0) return doc
  await req.payload.update({
    collection: 'media',
    id,
    data: { pendente: false },
    overrideAccess: true,
    req,
  })
  return doc
}
