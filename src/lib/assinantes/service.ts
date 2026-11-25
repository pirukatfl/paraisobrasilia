/**
 * Staff operations on subscribers (PAINEL-05, D-05, D-06). Called by the staff-only collection
 * endpoints and directly by int tests. Dates are always computed here with the server clock;
 * nothing date-related is accepted from the browser (T-03-15).
 * No 'server-only' import: loaded through the Payload config in plain Node too.
 */
import { randomBytes } from 'node:crypto'

import type { Payload, PayloadRequest } from 'payload'

import { PAYMENT_METHODS, type PaymentMethod } from '../../collections/Subscriptions'
import { isStaff } from '../../access/roles'
import { assinanteLabel, writeAudit } from './audit'
import { withRequestState } from './context'
import { ensureLinkExpiration, LINK_HOURS } from './reset-token'
import { daysLeft, renewalWindow, validUntilLabel } from './periods'
import { RENEWAL_WARNING_DAYS } from './renewal'
import { accessStatusFor, accessStatusOf, findPeriods, type AccessStatus } from './status'

const isStaffUser = (req: PayloadRequest) => isStaff({ req })

/** Validation problem shown to staff as-is (400). */
export class ServiceError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ServiceError'
    this.status = status
  }
}

const isMethod = (value: unknown): value is PaymentMethod => PAYMENT_METHODS.some((m) => m.value === value)

async function loadAssinante(payload: Payload, id: number | string, req?: PayloadRequest) {
  const doc = await payload.findByID({
    collection: 'assinantes',
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
    ...(req ? { req } : {}),
  })
  if (!doc) throw new ServiceError('Assinante não encontrado.', 404)
  return doc
}

export type GrantInput = {
  assinanteId: number | string
  planId: number | string | null
  durationDays?: number | null
  amount?: number | null
  method: PaymentMethod
  paidAt?: string | null
  note?: string | null
  req: PayloadRequest
  now?: Date
}

export type GrantResult = {
  subscriptionId: number
  startsAt: string
  endsAt: string
  validUntilLabel: string
  action: 'acesso-liberado' | 'acesso-renovado'
}

/** "Liberar acesso" / "Renovar": new period from max(now, current end), payment recorded. */
export async function grantOrRenew(payload: Payload, input: GrantInput): Promise<GrantResult> {
  const now = input.now ?? new Date()
  const { req } = input
  if (!isMethod(input.method)) throw new ServiceError('Escolha a forma de pagamento.')

  let durationDays: number
  let defaultAmount = 0
  let planId: number | null = null
  if (input.planId !== null && input.planId !== undefined && input.planId !== '') {
    const plan = await withRequestState(req, () =>
      payload.findByID({ collection: 'plans', id: input.planId as number, depth: 0, overrideAccess: true, disableErrors: true, req }),
    )
    if (!plan) throw new ServiceError('Plano não encontrado.')
    planId = plan.id
    durationDays = plan.durationDays
    defaultAmount = typeof plan.promoPrice === 'number' && plan.promoPrice > 0 ? plan.promoPrice : plan.price
  } else {
    const days = Number(input.durationDays)
    if (!Number.isInteger(days) || days < 1) {
      throw new ServiceError('Escolha um plano ou informe quantos dias de acesso.')
    }
    durationDays = days
  }

  const amount = input.amount === null || input.amount === undefined ? defaultAmount : Number(input.amount)
  if (!Number.isFinite(amount) || amount < 0) throw new ServiceError('Informe um valor válido.')

  await withRequestState(req, () => loadAssinante(payload, input.assinanteId, req))
  const status = await withRequestState(req, () => accessStatusFor(payload, input.assinanteId, now, req))
  const window = renewalWindow({
    now,
    currentAccessUntil: status.state === 'ativa' ? status.validUntil : null,
    durationDays,
  })
  const action = window.renewing ? 'acesso-renovado' : 'acesso-liberado'

  const created = await withRequestState(req, () =>
    payload.create({
      collection: 'subscriptions',
      data: {
        assinante: Number(input.assinanteId),
        ...(planId ? { plan: planId } : {}),
        startsAt: window.startsAt.toISOString(),
        endsAt: window.endsAt.toISOString(),
        status: 'ativa',
        payment: {
          amount,
          method: input.method,
          paidAt: input.paidAt || now.toISOString(),
          note: input.note?.trim() || null,
        },
      },
      // Staff access rules apply (the endpoint already checked the role)
      overrideAccess: false,
      user: req.user,
      context: { auditAction: action },
      req,
    }),
  )
  return {
    subscriptionId: created.id,
    startsAt: window.startsAt.toISOString(),
    endsAt: window.endsAt.toISOString(),
    validUntilLabel: validUntilLabel(window.endsAt),
    action,
  }
}

/** "Encerrar acesso agora": every active or future period ends now; one audit row with the reason. */
export async function endAccess(
  payload: Payload,
  input: { assinanteId: number | string; reason: string; req: PayloadRequest; now?: Date },
): Promise<{ ended: number }> {
  const now = input.now ?? new Date()
  const { req } = input
  const reason = (input.reason ?? '').trim()
  if (!reason) throw new ServiceError('Informe o motivo.')
  const account = await withRequestState(req, () => loadAssinante(payload, input.assinanteId, req))
  const periods = await withRequestState(req, () => findPeriods(payload, input.assinanteId, req))
  const open = periods.filter((p) => p.status !== 'encerrada' && new Date(p.endsAt).getTime() > now.getTime())
  if (open.length === 0) throw new ServiceError('Não há acesso ativo para encerrar.')
  for (const p of open) {
    await withRequestState(req, () =>
      payload.update({
        collection: 'subscriptions',
        id: p.id,
        data: { status: 'encerrada', closedAt: now.toISOString() },
        overrideAccess: false,
        user: req.user,
        // One row for the whole action, written below
        context: { skipAudit: true },
        req,
      }),
    )
  }
  await writeAudit(req, {
    action: 'acesso-encerrado',
    assinante: account,
    summary: `Acesso encerrado: ${assinanteLabel(account)} — ${reason}`,
    details: { motivo: reason, periodosEncerrados: open.length },
  })
  return { ended: open.length }
}

/**
 * Staff marks an account's e-mail as confirmed (or not): for a person who cannot get the
 * confirmation e-mail. Audited as 'conta-editada' by the collection hook (G-01).
 */
export async function setEmailConfirmed(
  payload: Payload,
  input: { assinanteId: number | string; confirmed: boolean; req: PayloadRequest },
): Promise<{ confirmed: boolean }> {
  const { req } = input
  if (!isStaffUser(req)) throw new ServiceError('Sem permissão.', 403)
  await withRequestState(req, () => loadAssinante(payload, input.assinanteId, req))
  await withRequestState(req, () =>
    payload.update({
      collection: 'assinantes',
      id: input.assinanteId,
      data: { _verified: input.confirmed, ...(input.confirmed ? { _verificationToken: null } : {}) } as never,
      overrideAccess: true,
      req,
    }),
  )
  return { confirmed: input.confirmed }
}

export type Situacao = {
  assinante: { id: number; name: string; email: string; whatsapp: string | null }
  access: Omit<AccessStatus, 'validUntil' | 'lastEndedAt'> & { validUntil: string | null; lastEndedAt: string | null }
  plans: { id: number; name: string; durationDays: number; price: number; promoPrice: number | null }[]
  periods: { id: number; summary: string | null; status: string | null; startsAt: string; endsAt: string; method: string | null; amount: number | null }[]
}

/** Everything the "Assinatura" panel shows. */
export async function getSituacao(payload: Payload, assinanteId: number | string, now: Date = new Date()): Promise<Situacao> {
  const account = await loadAssinante(payload, assinanteId)
  const periods = await findPeriods(payload, assinanteId)
  const access = accessStatusOf(periods, now)
  const { docs: plans } = await payload.find({
    collection: 'plans',
    where: { active: { equals: true } },
    sort: ['order', 'durationDays'],
    depth: 0,
    limit: 20,
    overrideAccess: true,
  })
  const recent = [...periods]
    .sort((a, b) => new Date(b.startsAt as string).getTime() - new Date(a.startsAt as string).getTime())
    .slice(0, 10) as unknown as {
    id: number
    summary?: string | null
    status?: string | null
    startsAt: string
    endsAt: string
    payment?: { method?: string | null; amount?: number | null } | null
  }[]
  return {
    assinante: { id: account.id, name: account.name, email: account.email, whatsapp: account.whatsapp ?? null },
    access: {
      ...access,
      validUntil: access.validUntil?.toISOString() ?? null,
      lastEndedAt: access.lastEndedAt?.toISOString() ?? null,
    },
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      durationDays: p.durationDays,
      price: p.price,
      promoPrice: typeof p.promoPrice === 'number' && p.promoPrice > 0 ? p.promoPrice : null,
    })),
    periods: recent.map((p) => ({
      id: p.id,
      summary: p.summary ?? null,
      status: p.status ?? null,
      startsAt: p.startsAt,
      endsAt: p.endsAt,
      method: p.payment?.method ?? null,
      amount: p.payment?.amount ?? null,
    })),
  }
}


const siteBase = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

/**
 * "Gerar link de nova senha" (D-04, no e-mail): Payload's forgot-password token with e-mail
 * disabled, valid 48 h, single use; a newer link replaces the previous one. The token only
 * travels in the returned URL — never in the audit log or server logs (T-03-11).
 */
export async function createPasswordLink(
  payload: Payload,
  input: { assinanteId: number | string; req: PayloadRequest },
): Promise<{ url: string; expiresAt: string; assinante: { id: number; name: string; email: string; whatsapp: string | null } }> {
  const { req } = input
  const account = await withRequestState(req, () => loadAssinante(payload, input.assinanteId, req))
  const token = await withRequestState(req, () =>
    payload.forgotPassword({
      collection: 'assinantes',
      data: { email: account.email },
      disableEmail: true,
      // Only this service may mint tokens (beforeOperation guard, T-03-03)
      context: { staffPasswordLink: true },
      req,
    }),
  )
  if (!token) throw new ServiceError('Não foi possível gerar o link.')
  const expiresAt = await ensureLinkExpiration(payload, token)
  await writeAudit(req, {
    action: 'link-de-senha-gerado',
    assinante: account,
    summary: `Link de nova senha gerado (vale ${LINK_HOURS} h)`,
    details: { validoAte: expiresAt },
  })
  return {
    url: `${siteBase()}/nova-senha?token=${encodeURIComponent(token)}`,
    expiresAt,
    assinante: { id: account.id, name: account.name, email: account.email, whatsapp: account.whatsapp ?? null },
  }
}

/** True while a staff link is unused and not expired (the /nova-senha page checks before showing the form). */
export async function passwordLinkIsValid(payload: Payload, token: string): Promise<boolean> {
  if (!/^[0-9a-f]{20,128}$/i.test(token)) return false
  const doc = await payload.db.findOne({
    collection: 'assinantes',
    where: {
      and: [
        { resetPasswordToken: { equals: token } },
        { resetPasswordExpiration: { greater_than: new Date().toISOString() } },
      ],
    },
  })
  return Boolean(doc)
}

export type ExpiringRow = {
  id: number
  name: string
  email: string
  whatsapp: string | null
  accessUntil: string
  validUntilLabel: string
  daysLeft: number
}

/**
 * "Vencem nos próximos 7 dias" (PAINEL-06): accounts whose access ends after `now` and no later
 * than `now + days`, soonest first. Uses the denormalised accessUntil (latest non-ended period),
 * so renewed and ended accounts drop out on their own. Staff-only caller (dashboard).
 */
export async function getExpiringSoon(payload: Payload, now: Date, days = RENEWAL_WARNING_DAYS): Promise<ExpiringRow[]> {
  const limit = new Date(now.getTime() + days * 24 * 3600_000)
  const { docs } = await payload.find({
    collection: 'assinantes',
    where: {
      and: [
        { accessUntil: { greater_than: now.toISOString() } },
        { accessUntil: { less_than_equal: limit.toISOString() } },
      ],
    },
    sort: 'accessUntil',
    limit: 100,
    depth: 0,
    overrideAccess: true,
  })
  return docs
    .filter((d): d is typeof d & { accessUntil: string } => Boolean(d.accessUntil))
    .map((d) => ({
      id: d.id,
      name: d.name,
      email: d.email,
      whatsapp: d.whatsapp ?? null,
      accessUntil: d.accessUntil,
      validUntilLabel: validUntilLabel(d.accessUntil),
      daysLeft: daysLeft(d.accessUntil, now),
    }))
}

export type CadastroCompletoInput = {
  name: string
  email: string
  whatsapp?: string | null
  /** Empty plan and no days: the account is created without access. */
  planId?: number | string | null
  durationDays?: number | null
  amount?: number | null
  method?: PaymentMethod | null
  paidAt?: string | null
  note?: string | null
  req: PayloadRequest
}

export type CadastroCompletoResult = {
  assinante: { id: number; name: string; email: string }
  access: { validUntilLabel: string } | null
  link: { url: string; expiresAt: string; whatsappUrl: string | null }
}

/**
 * Payload's ValidationError keeps the real reason per field (for example "Já existe um assinante com
 * o e-mail ...") in `data.errors`, but its own `message` is only "The following field is invalid:
 * email", which the panel showed as if a valid e-mail had been refused. Bring the field messages up.
 */
function fieldErrorToServiceError(err: unknown): unknown {
  const e = err as { name?: unknown; data?: { errors?: unknown } } | null
  if (e?.name !== 'ValidationError' || !Array.isArray(e.data?.errors)) return err
  const messages = (e.data.errors as Array<{ message?: unknown }>)
    .map((x) => (typeof x?.message === 'string' ? x.message.trim() : ''))
    .filter(Boolean)
  return messages.length ? new ServiceError(messages.join(' ')) : err
}

/**
 * "Novo assinante em uma etapa": creates the account (random password nobody sees), releases the
 * chosen plan with the payment record and mints the 48 h password link. The plan is checked before
 * the account exists; if the release still fails, the new account is removed so staff can retry
 * without hitting "e-mail já cadastrado".
 */
export async function createAssinanteCompleto(
  payload: Payload,
  input: CadastroCompletoInput,
  buildWhatsappUrl: (phone: string, message: string) => string,
): Promise<CadastroCompletoResult> {
  const { req } = input
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  const whatsapp = input.whatsapp?.replace(/\D/g, '') || null
  if (!name) throw new ServiceError('Informe o nome ou apelido.')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ServiceError('Informe um e-mail válido.')
  if (whatsapp && !/^55\d{10,11}$/.test(whatsapp)) {
    throw new ServiceError('WhatsApp: use só números, com 55 e DDD (ex.: 5561999998888).')
  }

  const hasPlan = input.planId !== null && input.planId !== undefined && input.planId !== ''
  const hasDays = input.durationDays !== null && input.durationDays !== undefined
  const grant = hasPlan || hasDays
  if (grant) {
    if (!isMethod(input.method)) throw new ServiceError('Escolha a forma de pagamento.')
    if (!hasPlan && !(Number.isInteger(Number(input.durationDays)) && Number(input.durationDays) >= 1)) {
      throw new ServiceError('Informe quantos dias de acesso.')
    }
    if (input.amount !== null && input.amount !== undefined && !(Number.isFinite(input.amount) && input.amount >= 0)) {
      throw new ServiceError('Informe um valor válido.')
    }
  }

  const password = randomBytes(24).toString('hex')
  const created = await withRequestState(req, () =>
    payload.create({
      collection: 'assinantes',
      data: { name, email, password, ...(whatsapp ? { whatsapp } : {}) },
      overrideAccess: false,
      user: req.user,
      context: { cadastroCompleto: true },
      req,
    }),
  ).catch((err: unknown) => {
    throw fieldErrorToServiceError(err)
  })

  try {
    const granted = grant
      ? await grantOrRenew(payload, {
          assinanteId: created.id,
          planId: hasPlan ? (input.planId as number | string) : null,
          durationDays: hasPlan ? null : Number(input.durationDays),
          amount: input.amount,
          method: input.method as PaymentMethod,
          paidAt: input.paidAt,
          note: input.note,
          req,
        })
      : null
    const link = await createPasswordLink(payload, { assinanteId: created.id, req })
    const message = `Olá, ${link.assinante.name}! Este é o link para criar sua senha no site do Paraíso (vale por 48 horas): ${link.url}`
    return {
      assinante: { id: created.id, name, email },
      access: granted ? { validUntilLabel: granted.validUntilLabel } : null,
      link: {
        url: link.url,
        expiresAt: link.expiresAt,
        whatsappUrl: link.assinante.whatsapp ? buildWhatsappUrl(link.assinante.whatsapp, message) : null,
      },
    }
  } catch (err) {
    await withRequestState(req, () =>
      payload.delete({ collection: 'assinantes', id: created.id, overrideAccess: true, req }),
    ).catch(() => undefined)
    throw err
  }
}
