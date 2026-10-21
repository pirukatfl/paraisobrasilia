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
import { SEM_DATA_LABEL } from '../lib/assinantes/site-antigo-label'
import { expire } from '../lib/cache/expire'
import { emailEnabled } from '../lib/email/config'
import { buildVerifyEmail, VERIFY_SUBJECT, verifyUrl } from '../lib/email/verify-account'
import { formatShortDate } from '../lib/format/date'
import { recadoApelidoError } from '../lib/recados/rules'

export const MIN_PASSWORD_LENGTH = 8
export const PASSWORD_TOO_SHORT = 'A senha precisa ter pelo menos 8 caracteres.'

/** 30 days: JWT expiry, session expiry and cookie Expires (ASS-01: stays logged in between visits). */
export const ASSINANTE_TOKEN_SECONDS = 2_592_000

const secureCookies = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').startsWith('https://')

/**
 * Guards the operations Payload exposes for every auth collection.
 * - create: only staff, trusted server code (migrations, imports, tests) via `req.context.trustedCreate`,
 *   or the public sign-up service (`req.context.selfSignup`, G-01) while e-mail is configured.
 *   Closes POST /api/assinantes/first-register, which creates with overrideAccess while the
 *   collection is empty (T-03-02). Staff and trusted creates are born confirmed and never send the
 *   verification e-mail (T-CG-07); a self sign-up is born unconfirmed with origem 'cadastro' and
 *   server-clock consent dates, whatever the input says (T-CG-05, T-CG-11). Payload's own
 *   verification mail is always off: the sign-up service sends it (background, neutral answer).
 * - forgotPassword: only the staff "link de nova senha" service (`req.context.staffPasswordLink`)
 *   or the rate-limited /esqueci-senha action (`req.context.emailedPasswordLink`, and only while
 *   e-mail is configured). The public REST endpoint cannot set either flag, so it stays closed
 *   (T-03-03). A newer token (staff link or e-mail) replaces the older one.
 * - password writes: minimum length; a password typed by staff is temporary (D-04).
 */
const guardOperations: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  const staff = isStaff({ req })
  if (operation === 'create') {
    const selfSignup = !staff && req.context?.trustedCreate !== true && req.context?.selfSignup === true && emailEnabled()
    if (!staff && req.context?.trustedCreate !== true && !selfSignup) throw new Forbidden(req.t)
    ;(args as { disableVerificationEmail?: boolean }).disableVerificationEmail = true
    const createArgs = args as { data?: Record<string, unknown> }
    const input = createArgs.data ?? {}
    if (selfSignup) {
      const nowIso = new Date().toISOString()
      const {
        accessUntil: _a,
        staffNotes: _s,
        mensagensSuspensas: _m,
        mustChangePassword: _p,
        _verificationToken: _t,
        wpUserId: _w,
        legacyPasswordHash: _l,
        importadoEm: _i,
        revisarAssinaturaAntiga: _r,
        ...rest
      } = input
      void [_a, _s, _m, _p, _t, _w, _l, _i, _r]
      createArgs.data = {
        ...rest,
        _verified: false,
        origem: 'cadastro',
        declaracao18Em: nowIso,
        termosAceitosEm: nowIso,
      }
    } else {
      createArgs.data = { ...input, _verified: true }
    }
  }
  if (operation === 'forgotPassword') {
    // Staff link (no e-mail), or the "Esqueci minha senha" action — only while e-mail is configured
    const staffLink = req.context?.staffPasswordLink === true
    const emailed = req.context?.emailedPasswordLink === true && emailEnabled()
    // Server-only: set by legacy-login after the old WordPress password was verified (T-06-17).
    // `context` cannot be set over HTTP, so the public REST endpoint stays closed.
    const legacyUpgrade = req.context?.legacyPasswordUpgrade === true
    if (!staffLink && !emailed && !legacyUpgrade) throw new Forbidden(req.t)
  }
  const writeArgs = args as { data?: Record<string, unknown> }
  const data = operation === 'create' || operation === 'update' ? writeArgs.data : undefined
  if (data && typeof data.password === 'string') {
    if (data.password.length < MIN_PASSWORD_LENGTH) {
      throw new APIError(PASSWORD_TOO_SHORT, 400, null, true)
    }
    // M-03: a new password always erases the old WordPress hash (T-06-12). Whatever the caller sent in
    // that field is overwritten; the flag lets this server-made write through the field access.
    writeArgs.data = { ...data, legacyPasswordHash: null }
    req.context = { ...req.context, legacyHashClear: true }
    // D-04: a password typed by staff is temporary; the subscriber's own change clears the flag.
    // passwordSetBy tells the audit hook which row to write (T-03-11).
    if (staff) {
      writeArgs.data = { ...writeArgs.data, mustChangePassword: true }
      req.context = { ...req.context, passwordSetBy: 'equipe' }
    } else if (isAssinante({ req })) {
      writeArgs.data = { ...writeArgs.data, mustChangePassword: false }
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
  _verified: 'e-mail confirmado',
  origem: 'origem da conta',
  declaracao18Em: 'declaração de 18+',
  termosAceitosEm: 'aceite dos Termos',
  wpUserId: 'ID no site antigo',
  importadoEm: 'importada do site antigo em',
  revisarAssinaturaAntiga: SEM_DATA_LABEL,
}

/** PAINEL-08: account created / edited (skipped for bookkeeping writes with context.skipAudit). */
/** D-06: a new access end date moves the author's ads on/off the public preview. */
const expireAdsOnAccessChange: CollectionAfterChangeHook = ({ doc, previousDoc }) => {
  if ((doc.accessUntil ?? null) !== (previousDoc?.accessUntil ?? null)) expire(['ads'])
  return doc
}

const auditAccount: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (req.context?.skipAudit) return doc
  const passwordSetBy = req.context?.passwordSetBy as 'equipe' | 'assinante' | undefined
  if (operation === 'create') {
    const details = diffForAudit(null, doc)
    delete details.mustChangePassword
    delete details._verified
    await writeAudit(req, {
      action: 'conta-criada',
      assinante: doc,
      summary:
        req.context?.selfSignup === true
          ? `Conta criada pelo cadastro do site: ${assinanteLabel(doc)}`
          : `Conta criada${passwordSetBy === 'equipe' ? ' com senha provisória' : ''}: ${assinanteLabel(doc)}`,
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
    defaultColumns: ['name', 'email', 'contaTipo', 'origem', 'emailStatus', 'updatedAt'],
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
    // G-01: e-mail confirmation for self sign-ups. Every account created by staff, seeds or the
    // migration is confirmed (guardOperations / migration backfill), otherwise the JWT strategy
    // would log it out. The link goes to /cadastro/confirmar, never to the admin.
    verify: {
      generateEmailSubject: () => VERIFY_SUBJECT,
      generateEmailHTML: ({ token, user }) =>
        buildVerifyEmail({
          name: String((user as { name?: string } | undefined)?.name ?? ''),
          url: verifyUrl(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000', String(token)),
        }).html,
    },
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
      // M-02 (client adjustment 2026-10-21): warning on the record of an old subscriber without an expiry date
      name: 'avisoSemData',
      type: 'ui',
      admin: { components: { Field: '/components/admin/assinantes/AvisoSemData#AvisoSemData' } },
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
      label: 'Apelido nos recados',
      admin: { description: 'Escolhido pelo assinante. Nunca use o nome verdadeiro.' },
      validate: (value: unknown) => {
        const apelido = String(value ?? '').replace(/\s+/g, ' ').trim()
        return apelido ? (recadoApelidoError(apelido) ?? true) : true
      },
    },
    {
      name: 'origem',
      type: 'select',
      defaultValue: 'equipe',
      label: 'Origem da conta',
      options: [
        { label: 'Equipe', value: 'equipe' },
        { label: 'Cadastro no site', value: 'cadastro' },
        { label: 'Site antigo', value: 'site-antigo' },
      ],
      // Set by the server only (guardOperations); staff read it, nobody edits it
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, position: 'sidebar', description: 'Quem criou a conta: a equipe ou a própria pessoa pelo site.' },
    },
    {
      name: 'declaracao18Em',
      type: 'date',
      label: 'Declarou 18+ em',
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' } },
    },
    {
      name: 'termosAceitosEm',
      type: 'date',
      label: 'Aceitou Termos e Privacidade em',
      access: { create: () => false, update: () => false },
      admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' } },
    },
    {
      name: 'wpUserId',
      type: 'number',
      unique: true,
      index: true,
      label: 'ID no site antigo',
      // Written only by the importer (Local API with overrideAccess); never by REST (T-06-14)
      access: { create: () => false, update: () => false, read: isStaff },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'importadoEm',
      type: 'date',
      label: 'Importada do site antigo em',
      access: { create: () => false, update: () => false, read: isStaff },
      admin: { readOnly: true, position: 'sidebar', date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' } },
    },
    {
      // M-03: pending WordPress password hash. Invisible to every API and to the admin (T-06-13).
      // Written by the importer / the legacy login (overrideAccess) and erased by guardOperations on any
      // password write (the one server-made write that passes the field access, via context.legacyHashClear).
      name: 'legacyPasswordHash',
      type: 'text',
      hidden: true,
      access: {
        read: () => false,
        create: ({ req }) => req.context?.legacyHashClear === true,
        update: ({ req }) => req.context?.legacyHashClear === true,
      },
    },
    {
      name: 'revisarAssinaturaAntiga',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      label: SEM_DATA_LABEL,
      access: staffOnlyField,
      admin: {
        position: 'sidebar',
        description:
          'Marcado pela importação: no site antigo era assinante, mas sem data de vencimento. Some sozinho quando a equipe libera uma assinatura; para dispensar sem liberar, desmarque e salve.',
      },
    },
    {
      // Read-only summary for the list (G-01/G-02): derived on read, never stored, staff only
      name: 'contaTipo',
      type: 'text',
      label: 'Conta',
      virtual: true,
      access: { create: () => false, update: () => false, read: isStaff },
      admin: { readOnly: true, disableBulkEdit: true },
      hooks: {
        afterRead: [
          ({ siblingData }) => {
            const data = siblingData as { accessUntil?: string | null; revisarAssinaturaAntiga?: boolean | null }
            const until = data.accessUntil
            const time = until ? new Date(until).getTime() : NaN
            if (Number.isFinite(time) && time > Date.now()) {
              return `Assinante até ${formatShortDate(new Date(time - 1).toISOString())}`
            }
            return data.revisarAssinaturaAntiga === true ? `Gratuita · ${SEM_DATA_LABEL.toLowerCase()}` : 'Gratuita'
          },
        ],
      },
    },
    {
      name: 'emailStatus',
      type: 'text',
      label: 'E-mail confirmado',
      virtual: true,
      access: { create: () => false, update: () => false, read: isStaff },
      admin: {
        disableBulkEdit: true,
        components: { Field: '/components/admin/assinantes/EmailConfirmado#EmailConfirmado' },
      },
      hooks: {
        afterRead: [({ siblingData }) => ((siblingData as { _verified?: boolean })._verified ? 'Sim' : 'Não')],
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
