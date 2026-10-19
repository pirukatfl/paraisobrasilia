/**
 * Staff operations on subscribers (PAINEL-05, D-05, D-06). Called by the staff-only collection
 * endpoints and directly by int tests. Dates are always computed here with the server clock;
 * nothing date-related is accepted from the browser (T-03-15).
 * No 'server-only' import: loaded through the Payload config in plain Node too.
 */
import type { Payload, PayloadRequest } from 'payload'

import { PAYMENT_METHODS, type PaymentMethod } from '../../collections/Subscriptions'
import { assinanteLabel, writeAudit } from './audit'
import { withRequestState } from './context'
import { renewalWindow, validUntilLabel } from './periods'
import { accessStatusFor, accessStatusOf, findPeriods, type AccessStatus } from './status'

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
