import {
  ValidationError,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeDeleteHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
} from 'payload'

import { isStaff } from '../access/roles'
import { assinanteLabel, auditActorOf, writeAudit } from '../lib/assinantes/audit'
import { withRequestState } from '../lib/assinantes/context'
import { expire } from '../lib/cache/expire'
import {
  COMENTARIO_MAX,
  comentarioApelidoError,
  comentarioResumo,
  comentarioTextoError,
  normaliseApelido,
  normaliseComentario,
} from '../lib/classisex/comentarios/rules'
import { APELIDO_MAX } from '../lib/classisex/rules'

const relId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') return Number((value as { id?: number | string }).id ?? NaN) || null
  return Number(value) || null
}

const fail = (req: Parameters<CollectionBeforeValidateHook>[0]['req'], path: string, message: string): never => {
  throw new ValidationError({ collection: 'ad-comments', errors: [{ path, message }], req }, req.t)
}

/** Same rules as the site form, for staff edits in the admin. The text stays as written. */
const normalise: CollectionBeforeValidateHook = ({ data, operation, req }) => {
  if (!data) return data
  if (operation === 'create' || 'apelido' in data) {
    const apelido = normaliseApelido(String(data.apelido ?? ''))
    const error = comentarioApelidoError(apelido)
    if (error) fail(req, 'apelido', error)
    data.apelido = apelido
  }
  if (operation === 'create' || 'texto' in data) {
    const texto = normaliseComentario(String(data.texto ?? ''))
    const error = comentarioTextoError(texto)
    if (error) fail(req, 'texto', error)
    data.texto = texto
  }
  return data
}

const computeDerived: CollectionBeforeChangeHook = ({ data, originalDoc, operation, req }) => {
  const merged = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>
  data.resumo = comentarioResumo(String(merged.apelido ?? ''), String(merged.texto ?? ''))
  // Hide / show by staff: who and when (the status is the only thing staff move)
  if (operation === 'update' && data.status && originalDoc && data.status !== originalDoc.status) {
    if (data.status === 'oculto') {
      data.ocultadoEm = new Date().toISOString()
      data.ocultadoPor = isStaff({ req }) ? req.user?.id : null
    } else {
      data.ocultadoEm = null
      data.ocultadoPor = null
    }
  }
  return data
}

/** Replies go with their root comment. */
const removeReplies: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await withRequestState(req, () =>
    req.payload.delete({
      collection: 'ad-comments',
      where: { parent: { equals: id } },
      overrideAccess: true,
      context: { skipAudit: true, cascade: true },
      req,
    }),
  )
}

async function auditComment(
  req: Parameters<CollectionAfterChangeHook>[0]['req'],
  action: 'comentario-ocultado' | 'comentario-reexibido' | 'comentario-apagado',
  doc: { id: number; resumo?: string | null; author?: unknown; ad?: unknown },
) {
  const authorId = relId(doc.author)
  const author =
    authorId === null
      ? null
      : await withRequestState(req, () =>
          req.payload.findByID({ collection: 'assinantes', id: authorId, depth: 0, overrideAccess: true, disableErrors: true, req }),
        )
  const verb = { 'comentario-ocultado': 'ocultado', 'comentario-reexibido': 'reexibido', 'comentario-apagado': 'apagado' }[action]
  await writeAudit(req, {
    action,
    assinante: author ? { id: author.id, name: author.name, email: author.email } : null,
    assinanteLabel: author ? assinanteLabel(author) : undefined,
    summary: `Comentário #${doc.id} (${doc.resumo ?? ''}) ${verb} no anúncio #${relId(doc.ad) ?? '?'}`,
    details: { comentario: doc.id, anuncio: relId(doc.ad) },
  })
}

const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req, context }) => {
  expire(['ad-comments'])
  if (operation === 'update' && !context?.skipAudit && auditActorOf(req).actorType === 'equipe' && previousDoc && doc.status !== previousDoc.status) {
    await auditComment(req, doc.status === 'oculto' ? 'comentario-ocultado' : 'comentario-reexibido', doc)
  }
  return doc
}

const afterDelete: CollectionAfterDeleteHook = async ({ doc, req, context }) => {
  expire(['ad-comments'])
  if (!context?.skipAudit && auditActorOf(req).actorType === 'equipe') await auditComment(req, 'comentario-apagado', doc)
  return doc
}

const dateAdmin = {
  readOnly: true,
  position: 'sidebar' as const,
  date: { pickerAppearance: 'dayAndTime' as const, displayFormat: 'dd/MM/yyyy HH:mm' },
}

/**
 * Comentários e conversa em cada anúncio do ClassiSex (pedido do cliente 2026-11-03). Staff-only
 * for every REST/GraphQL operation: the author is sensitive and contacts written here must never be
 * served raw. Members and visitors write only through src/lib/classisex/comentarios/service.ts after the session
 * guard; the site reads through the same service, which redacts contacts for everyone who is not an
 * active subscriber. Staff hide, show or delete a comment from the admin.
 */
export const AdComments: CollectionConfig = {
  slug: 'ad-comments',
  labels: { singular: 'Comentário', plural: 'Comentários' },
  admin: {
    group: 'ClassiSex',
    useAsTitle: 'resumo',
    defaultColumns: ['resumo', 'ad', 'semConta', 'status', 'createdAt'],
    listSearchableFields: ['resumo', 'apelido', 'texto'],
    description:
      'Comentários dos anúncios. Qualquer pessoa pode comentar, com ou sem conta: quem não tem conta aparece como "Sem conta" e se identifica com o nome que digitou. Para tirar um comentário do ar, mude a Situação para "Oculto" (dá para voltar a "Publicado"); para remover de vez, apague. Para impedir uma pessoa de comentar, marque "Comentários bloqueados" na conta dela.',
  },
  defaultSort: '-createdAt',
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    beforeValidate: [normalise],
    beforeChange: [computeDerived],
    beforeDelete: [removeReplies],
    afterChange: [afterChange],
    afterDelete: [afterDelete],
  },
  fields: [
    {
      name: 'resumo',
      type: 'text',
      label: 'Resumo',
      admin: { readOnly: true, description: 'Calculado: apelido — início do texto.' },
    },
    {
      name: 'ad',
      type: 'relationship',
      relationTo: 'ads',
      required: true,
      index: true,
      label: 'Anúncio',
      admin: { readOnly: true },
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'assinantes',
      index: true,
      label: 'Quem escreveu',
      admin: {
        readOnly: true,
        description: 'Só a equipe vê. No site aparece só o apelido. Vazio quando o comentário foi escrito sem conta.',
      },
    },
    {
      name: 'semConta',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: 'Sem conta',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description:
          'Marcado pelo sistema: escrito por visitante, sem login. O nome é o que a pessoa digitou. Oculte ou apague como os demais.',
      },
    },
    {
      name: 'parent',
      type: 'relationship',
      relationTo: 'ad-comments',
      index: true,
      label: 'Resposta a',
      admin: { readOnly: true, description: 'Preenchido quando este comentário é uma resposta. Fica vazio nos comentários principais.' },
    },
    {
      name: 'apelido',
      type: 'text',
      required: true,
      maxLength: APELIDO_MAX,
      label: 'Apelido',
      admin: { description: 'O que aparece no site. Sem telefone, e-mail, @ ou link.' },
    },
    {
      name: 'texto',
      type: 'textarea',
      required: true,
      maxLength: COMENTARIO_MAX,
      label: 'Comentário',
      admin: {
        description: `Até ${COMENTARIO_MAX} caracteres. Guardado como foi escrito: o site esconde os contatos de quem não é assinante.`,
      },
    },
    {
      name: 'doAnunciante',
      type: 'checkbox',
      defaultValue: false,
      label: 'Escrito pelo anunciante',
      admin: { readOnly: true, position: 'sidebar', description: 'Marcado pelo sistema: mostra o selo "Anunciante".' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'publicado',
      index: true,
      label: 'Situação',
      options: [
        { label: 'Publicado', value: 'publicado' },
        { label: 'Oculto', value: 'oculto' },
      ],
      admin: { position: 'sidebar', description: 'Oculto sai do site na hora. Dá para voltar a Publicado.' },
    },
    { name: 'ocultadoEm', type: 'date', label: 'Ocultado em', admin: dateAdmin },
    {
      name: 'ocultadoPor',
      type: 'relationship',
      relationTo: 'users',
      label: 'Ocultado por',
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'motivo',
      type: 'text',
      maxLength: 300,
      label: 'Motivo (só a equipe vê)',
      admin: { position: 'sidebar', description: 'Opcional. Anote por que o comentário foi ocultado.' },
    },
  ],
}
