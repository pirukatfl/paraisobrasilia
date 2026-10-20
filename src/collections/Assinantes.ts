import {
  APIError,
  Forbidden,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionBeforeDeleteHook,
  type CollectionBeforeOperationHook,
  type CollectionConfig,
} from 'payload'

import { isAssinante, isStaff, staffOnlyField } from '../access/roles'
import { assinanteLabel, diffForAudit, writeAudit } from '../lib/assinantes/audit'
import { withRequestState } from '../lib/assinantes/context'
import { assinanteEndpoints } from '../lib/assinantes/endpoints'
import { expire } from '../lib/cache/expire'
import { emailEnabled } from '../lib/email/config'
import { recadoApelidoError } from '../lib/recados/rules'

export const MIN_PASSWORD_LENGTH = 8
export const PASSWORD_TOO_SHORT = 'A senha precisa ter pelo menos 8 caracteres.'

/** 30 days: JWT expiry, session expiry and cookie Expires (ASS-01: stays logged in between visits). */
export const ASSINANTE_TOKEN_SECONDS = 2_592_000

const secureCookies = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').startsWith('https://')

/**
 * Guards the operations Payload exposes for every auth collection.
 * - create: only staff, or trusted server code (migrations, imports, tests) via `req.context.trustedCreate`.
 *   Closes POST /api/assinantes/first-register, which creates with overrideAccess while the
 *   collection is empty (T-03-02).
 * - forgotPassword: only the staff "link de nova senha" service (`req.context.staffPasswordLink`)
 *   or the rate-limited /esqueci-senha action (`req.context.emailedPasswordLink`, and only while
 *   e-mail is configured). The public REST endpoint cannot set either flag, so it stays closed
 *   (T-03-03). A newer token (staff link or e-mail) replaces the older one.
 * - password writes: minimum length; a password typed by staff is temporary (D-04).
 */
const guardOperations: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  const staff = isStaff({ req })
  if (operation === 'create' && !staff && req.context?.trustedCreate !== true) {
    throw new Forbidden(req.t)
  }
  if (operation === 'forgotPassword') {
    // Staff link (no e-mail), or the "Esqueci minha senha" action — only while e-mail is configured
    const staffLink = req.context?.staffPasswordLink === true
    const emailed = req.context?.emailedPasswordLink === true && emailEnabled()
    if (!staffLink && !emailed) throw new Forbidden(req.t)
  }
  const writeArgs = args as { data?: Record<string, unknown> }
  const data = operation === 'create' || operation === 'update' ? writeArgs.data : undefined
  if (data && typeof data.password === 'string') {
    if (data.password.length < MIN_PASSWORD_LENGTH) {
      throw new APIError(PASSWORD_TOO_SHORT, 400, null, true)
    }
    // D-04: a password typed by staff is temporary; the subscriber's own change clears the flag.
    // passwordSetBy tells the audit hook which row to write (T-03-11).
    if (staff) {
      writeArgs.data = { ...data, mustChangePassword: true }
      req.context = { ...req.context, passwordSetBy: 'equipe' }
    } else if (isAssinante({ req })) {
      writeArgs.data = { ...data, mustChangePassword: false }
      req.context = { ...req.context, passwordSetBy: 'assinante' }
    }
  }
  return args
}

/**
 * Deleting an account removes its periods first (subscriptions.assinante is required, and the
 * API never deletes periods on its own). Same request/transaction; the count is kept in
 * req.context for the audit entry.
 * Phase 4 (T-04-20, LGPD): the account's ClassiSex ads go too (ads.author is required); deleting
 * an ad cascades to its media files and detaches its reports.
 */
const removePeriods: CollectionBeforeDeleteHook = async ({ id, req }) => {
  // Reports made by this account stay for the record, without the reporter (04-08)
  await withRequestState(req, () =>
    req.payload.update({
      collection: 'ad-reports',
      where: { reporter: { equals: id } },
      data: { reporter: null },
      overrideAccess: true,
      req,
    }),
  )
  // Phase 5 (T-05-12, LGPD): blocks involving the account go; message reports stay for the record
  await withRequestState(req, () =>
    req.payload.delete({
      collection: 'blocks',
      where: { or: [{ blocker: { equals: id } }, { blocked: { equals: id } }] },
      overrideAccess: true,
      context: { skipAudit: true, assinanteBeingDeleted: true },
      req,
    }),
  )
  for (const side of ['reporter', 'reported'] as const) {
    await withRequestState(req, () =>
      req.payload.update({
        collection: 'message-reports',
        where: { [side]: { equals: id } },
        data: { [side]: null },
        overrideAccess: true,
        req,
      }),
    )
  }
  // Phase 5 (T-05-12, LGPD): conversations the account takes part in go with all their messages
  const convs = await withRequestState(req, () =>
    req.payload.find({
      collection: 'conversations',
      where: { or: [{ participantA: { equals: id } }, { participantB: { equals: id } }] },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
  )
  if (convs.docs.length > 0) {
    const ids = convs.docs.map((c) => c.id)
    await withRequestState(req, () =>
      req.payload.delete({
        collection: 'messages',
        where: { conversation: { in: ids } },
        overrideAccess: true,
        context: { skipAudit: true, assinanteBeingDeleted: true },
        req,
      }),
    )
    await withRequestState(req, () =>
      req.payload.delete({
        collection: 'conversations',
        where: { id: { in: ids } },
        overrideAccess: true,
        context: { skipAudit: true, assinanteBeingDeleted: true },
        req,
      }),
    )
  }
  // Phase 5 (T-05-12, LGPD): the account's recados go too (recados.author is required)
  await withRequestState(req, () =>
    req.payload.delete({
      collection: 'recados',
      where: { author: { equals: id } },
      overrideAccess: true,
      context: { skipAudit: true, assinanteBeingDeleted: true },
      req,
    }),
  )
  await withRequestState(req, () =>
    req.payload.delete({
      collection: 'ads',
      where: { author: { equals: id } },
      overrideAccess: true,
      context: { skipAudit: true, assinanteBeingDeleted: true },
      req,
    }),
  )
  const removed = await withRequestState(req, async () => {
    const result = await req.payload.delete({
      collection: 'subscriptions',
      where: { assinante: { equals: id } },
      overrideAccess: true,
      context: { skipAudit: true, assinanteBeingDeleted: true },
      req,
    })
    return result.docs.length
  })
  req.context = { ...req.context, periodosRemovidos: removed }
}

const FIELD_LABELS: Record<string, string> = {
  name: 'nome',
  email: 'e-mail',
  whatsapp: 'WhatsApp',
  staffNotes: 'observações',
  mustChangePassword: 'senha provisória',
  accessUntil: 'acesso até',
  apelido: 'apelido',
  mensagensSuspensas: 'mensagens suspensas',
}

/** PAINEL-08: account created / edited (skipped for bookkeeping writes with context.skipAudit). */
/** D-06: a new access end date moves the author's ads on/off the public preview. */
const expireAdsOnAccessChange: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  if ((doc.accessUntil ?? null) !== (previousDoc?.accessUntil ?? null)) expire(['ads', 'recados'])
  return doc
}

const auditAccount: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (req.context?.skipAudit) return doc
  const passwordSetBy = req.context?.passwordSetBy as 'equipe' | 'assinante' | undefined
  if (operation === 'create') {
    const details = diffForAudit(null, doc)
    delete details.mustChangePassword
    await writeAudit(req, {
      action: 'conta-criada',
      assinante: doc,
      summary: `Conta criada${passwordSetBy === 'equipe' ? ' com senha provisória' : ''}: ${assinanteLabel(doc)}`,
      details,
    })
    return doc
  }
  if (passwordSetBy === 'equipe') {
    await writeAudit(req, {
      action: 'senha-definida-pela-equipe',
      assinante: doc,
      summary: 'Senha provisória definida pela equipe (o assinante troca no próximo acesso; outras sessões encerradas)',
    })
  } else if (passwordSetBy === 'assinante') {
    await writeAudit(req, {
      action: 'senha-trocada-pelo-assinante',
      assinante: doc,
      summary: 'Senha trocada pelo assinante',
    })
  }
  const diff = diffForAudit(previousDoc ?? null, doc)
  // The temporary-password flag follows the password rows above
  if (passwordSetBy) delete diff.mustChangePassword
  const fields = Object.keys(diff)
  if (fields.length > 0) {
    await writeAudit(req, {
      action: 'conta-editada',
      assinante: doc,
      summary: `Conta editada (${fields.map((f) => FIELD_LABELS[f] ?? f).join(', ')})`,
      details: diff,
    })
  }
  return doc
}

const auditAccountDeleted: CollectionAfterDeleteHook = async ({ doc, req }) => {
  if (req.context?.skipAudit) return doc
  // The account no longer exists: keep the "Nome <e-mail>" snapshot, relation empty
  await writeAudit(req, {
    action: 'conta-excluida',
    assinante: null,
    assinanteLabel: assinanteLabel(doc),
    summary: `Conta excluída: ${assinanteLabel(doc)}`,
    details: { periodosRemovidos: Number(req.context?.periodosRemovidos ?? 0) },
  })
  return doc
}

/**
 * Subscriber accounts (ASS-01, D-01). Created by staff after checking the payment receipt; an
 * account can exist without access (access comes from subscription periods).
 */
export const Assinantes: CollectionConfig = {
  slug: 'assinantes',
  labels: { singular: 'Assinante', plural: 'Assinantes' },
  admin: {
    group: 'Assinantes',
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'accessUntil', 'updatedAt'],
    listSearchableFields: ['name', 'email', 'whatsapp'],
    description:
      'Crie a conta depois de conferir o comprovante. A conta pode existir sem acesso; o acesso é liberado em "Assinatura".',
  },
  auth: {
    tokenExpiration: ASSINANTE_TOKEN_SECONDS,
    maxLoginAttempts: 5, // T-03-04
    lockTime: 600_000, // 10 minutes
    useSessions: true,
    cookies: { sameSite: 'Lax', secure: secureCookies },
    // Staff-generated "nova senha" link (D-04): 48 hours, single use
    forgotPassword: { expiration: 172_800_000 },
  },
  access: {
    // T-03-07: a subscriber reads only its own account
    read: ({ req }) => {
      if (isStaff({ req })) return true
      if (isAssinante({ req }) && req.user) return { id: { equals: req.user.id } }
      return false
    },
    create: isStaff,
    update: isStaff,
    delete: isStaff,
    unlock: isStaff,
    // Subscribers never open /admin (T-03-17)
    admin: () => false,
  },
  // Staff-only actions for the "Assinatura" panel (src/lib/assinantes/endpoints.ts)
  endpoints: assinanteEndpoints,
  hooks: {
    beforeOperation: [guardOperations],
    beforeDelete: [removePeriods],
    afterChange: [auditAccount, expireAdsOnAccessChange],
    afterDelete: [auditAccountDeleted],
  },
  fields: [
    // email and password are added by `auth`
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nome ou apelido',
      admin: { description: 'Como o assinante é chamado no site ("Olá, …").' },
    },
    {
      // Liberar / renovar / encerrar with the payment record (PAINEL-05); hidden on create
      name: 'assinaturaPainel',
      type: 'ui',
      label: 'Assinatura',
      admin: { components: { Field: '/components/admin/assinantes/AssinaturaPanel#AssinaturaPanel' } },
    },
    {
      name: 'whatsapp',
      type: 'text',
      label: 'WhatsApp',
      admin: { description: 'Só números, com 55 e DDD. Usado pela equipe para enviar senha e avisos.' },
      validate: (value: unknown) =>
        value === undefined || value === null || value === '' || /^55\d{10,11}$/.test(String(value))
          ? true
          : 'Use só números, com 55 e DDD (ex.: 5561999998888).',
    },
    {
      // One nickname per account for recados and messages (orchestrator default 4); ads keep their own
      name: 'apelido',
      type: 'text',
      maxLength: 40,
      label: 'Apelido nos recados e mensagens',
      admin: { description: 'Escolhido pelo assinante. Nunca use o nome verdadeiro.' },
      validate: (value: unknown) => {
        const apelido = String(value ?? '').replace(/\s+/g, ' ').trim()
        return apelido ? (recadoApelidoError(apelido) ?? true) : true
      },
    },
    {
      name: 'staffNotes',
      type: 'textarea',
      label: 'Observações da equipe',
      admin: { description: 'Só a equipe vê. Não anote dados bancários nem comprovantes.' },
      access: staffOnlyField,
    },
    {
      name: 'mensagensSuspensas',
      type: 'checkbox',
      defaultValue: false,
      label: 'Mensagens suspensas',
      access: staffOnlyField,
      admin: {
        position: 'sidebar',
        description: 'Marcado pela equipe após denúncia. Desmarque para liberar de novo.',
      },
    },
    {
      name: 'accessUntil',
      type: 'date',
      label: 'Acesso até',
      // Maintained by the subscription hooks; subscribers can never write it (T-03-06)
      access: { create: isStaff, update: isStaff },
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Calculado pelos períodos de assinatura. O acesso termina às 00h deste dia (Brasília).',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
      },
    },
    {
      name: 'periodos',
      type: 'join',
      collection: 'subscriptions',
      on: 'assinante',
      label: 'Períodos e pagamentos',
      defaultSort: '-startsAt',
      admin: { allowCreate: false },
    },
    {
      name: 'historico',
      type: 'join',
      collection: 'audit-log',
      on: 'assinante',
      label: 'Histórico',
      defaultSort: '-createdAt',
      admin: { allowCreate: false },
    },
    {
      name: 'mustChangePassword',
      type: 'checkbox',
      label: 'Senha provisória',
      defaultValue: false,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Marcado quando a equipe define a senha; some quando o assinante troca.',
      },
    },
  ],
}
