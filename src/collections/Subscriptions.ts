import {
  ValidationError,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionBeforeChangeHook,
  type CollectionBeforeValidateHook,
  type CollectionConfig,
  type PayloadRequest,
} from 'payload'

import { isStaff } from '../access/roles'
import { diffForAudit, writeAudit, type AuditAction } from '../lib/assinantes/audit'
import { withRequestState } from '../lib/assinantes/context'
import { expire } from '../lib/cache/expire'
import { accessUntilOf, addDaysToDate, type PeriodLike, spDate, spMidnight } from '../lib/assinantes/periods'
import { formatShortDate } from '../lib/format/date'
import { formatBRL } from '../lib/format/money'

export const PAYMENT_METHODS = [
  { label: 'Pix', value: 'pix' },
  { label: 'PagBank (cartão/boleto pelo link)', value: 'pagbank' },
  { label: 'Dinheiro', value: 'dinheiro' },
  { label: 'Transferência', value: 'transferencia' },
  { label: 'Cortesia', value: 'cortesia' },
  { label: 'Outro', value: 'outro' },
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value']

const NO_PLAN_LABEL = 'Cortesia / outro prazo'

const relId = (value: unknown): number | string | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') return ((value as { id?: number | string }).id ?? null) as number | string | null
  return value as number | string
}

async function loadPlan(req: PayloadRequest, plan: unknown): Promise<{ name: string; durationDays: number } | null> {
  const id = relId(plan)
  if (id === null) return null
  if (typeof plan === 'object' && plan && 'durationDays' in plan) return plan as { name: string; durationDays: number }
  return withRequestState(req, () =>
    req.payload.findByID({ collection: 'plans', id, depth: 0, overrideAccess: true, req }),
  )
}

/** endsAt from the plan when empty; date order. Messages in Portuguese on the right field. */
const fillAndValidateDates: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data
  const merged = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>
  if (!merged.startsAt) return data // the required check on startsAt reports it
  const startsAt = new Date(merged.startsAt as string)
  if (!merged.endsAt) {
    const plan = await loadPlan(req, merged.plan)
    if (!plan) {
      throw new ValidationError(
        {
          collection: 'subscriptions',
          errors: [{ path: 'endsAt', message: 'Escolha um plano ou informe a data de término.' }],
          req,
        },
        req.t,
      )
    }
    data.endsAt = spMidnight(addDaysToDate(spDate(startsAt), plan.durationDays)).toISOString()
    merged.endsAt = data.endsAt
  }
  if (new Date(merged.endsAt as string).getTime() <= startsAt.getTime()) {
    throw new ValidationError(
      {
        collection: 'subscriptions',
        errors: [{ path: 'endsAt', message: 'A data de término precisa ser depois do início.' }],
        req,
      },
      req.t,
    )
  }
  return data
}

/** Readable title ("Mensal · 19/10/2026 a 17/11/2026") and closedAt when staff end the period. */
const fillSummaryAndClosedAt: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const merged = { ...(originalDoc ?? {}), ...data } as Record<string, unknown>
  if (merged.startsAt && merged.endsAt) {
    const plan = await loadPlan(req, merged.plan)
    const lastDay = new Date(new Date(merged.endsAt as string).getTime() - 1).toISOString()
    data.summary = `${plan?.name ?? NO_PLAN_LABEL} · ${formatShortDate(new Date(merged.startsAt as string).toISOString())} a ${formatShortDate(lastDay)}`
  }
  if (data.status === 'encerrada' && originalDoc?.status !== 'encerrada' && !data.closedAt) {
    data.closedAt = new Date().toISOString()
  }
  return data
}

/** Denormalised `assinantes.accessUntil` (admin list column and the 7-day panel). */
export async function recomputeAccessUntil(req: PayloadRequest, assinanteId: number | string): Promise<void> {
  await withRequestState(req, async () => {
    const { docs } = await req.payload.find({
      collection: 'subscriptions',
      where: { assinante: { equals: assinanteId } },
      depth: 0,
      limit: 500,
      pagination: false,
      overrideAccess: true,
      req,
    })
    const until = accessUntilOf(docs as PeriodLike[])
    // skipAudit: bookkeeping, not a staff edit of the account (PAINEL-08 hooks ignore it)
    await req.payload.update({
      collection: 'assinantes',
      id: assinanteId,
      data: { accessUntil: until ? until.toISOString() : null },
      overrideAccess: true,
      context: { skipAudit: true },
      req,
    })
  })
}

const syncAccessUntil: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const ids = new Set([relId(doc.assinante), relId(previousDoc?.assinante)].filter((v) => v !== null))
  for (const id of ids) await recomputeAccessUntil(req, id as number | string)
  // D-06: the author's ads appear/disappear with the access period (public preview cache)
  expire(['ads'])
  return doc
}

const syncAccessUntilAfterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
  const id = relId(doc.assinante)
  if (id !== null && !req.context?.assinanteBeingDeleted) await recomputeAccessUntil(req, id)
  expire(['ads'])
  return doc
}

const methodLabel = (value: unknown) => PAYMENT_METHODS.find((m) => m.value === value)?.label ?? String(value ?? '')

type PeriodDoc = {
  id: number | string
  assinante: unknown
  plan?: unknown
  startsAt: string
  endsAt: string
  status?: string | null
  summary?: string | null
  payment?: { amount?: number | null; method?: string | null; paidAt?: string | null; note?: string | null } | null
}

async function loadAccount(req: PayloadRequest, id: number | string) {
  return withRequestState(req, () =>
    req.payload.findByID({ collection: 'assinantes', id, depth: 0, overrideAccess: true, req, disableErrors: true }),
  )
}

/** Did the subscriber already have access running into this new period? (renewal vs first grant) */
async function hadAccessBefore(req: PayloadRequest, doc: PeriodDoc): Promise<boolean> {
  const start = new Date(doc.startsAt).getTime()
  const now = Date.now()
  const { docs } = await withRequestState(req, () =>
    req.payload.find({
      collection: 'subscriptions',
      where: { and: [{ assinante: { equals: relId(doc.assinante) } }, { id: { not_equals: doc.id } }] },
      depth: 0,
      limit: 500,
      pagination: false,
      overrideAccess: true,
      req,
    }),
  )
  return docs.some((p) => {
    if (p.status === 'encerrada' || !p.endsAt) return false
    const s = new Date(p.startsAt).getTime()
    const e = new Date(p.endsAt).getTime()
    return (s <= start && e >= start) || (s <= now && now < e)
  })
}

/** PAINEL-08: grants, renewals, endings and corrections, with the payment record (D-06). */
const auditPeriod: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (req.context?.skipAudit) return doc
  const period = doc as PeriodDoc
  const assinanteId = relId(period.assinante)
  const account = assinanteId === null ? null : await loadAccount(req, assinanteId)
  const plan = await loadPlan(req, period.plan)
  const planName = plan?.name ?? NO_PLAN_LABEL
  const lastDay = formatShortDate(new Date(new Date(period.endsAt).getTime() - 1).toISOString())
  const subject = account ? { id: account.id, name: account.name, email: account.email } : null

  if (operation === 'create') {
    const contextAction = req.context?.auditAction as AuditAction | undefined
    const action: AuditAction =
      contextAction ?? ((await hadAccessBefore(req, period)) ? 'acesso-renovado' : 'acesso-liberado')
    const amount = period.payment?.amount
    const forma = methodLabel(period.payment?.method)
    await writeAudit(req, {
      action,
      assinante: subject,
      summary: `${action === 'acesso-renovado' ? 'Acesso renovado' : 'Acesso liberado'}: ${planName} até ${lastDay} — ${forma}${typeof amount === 'number' ? ` ${formatBRL(amount)}` : ''}`,
      details: {
        periodo: { inicio: period.startsAt, fim: period.endsAt },
        pagamento: {
          plano: planName,
          valor: typeof amount === 'number' ? amount : null,
          forma,
          data: period.payment?.paidAt ?? null,
          observação: period.payment?.note ?? null,
        },
      },
    })
    return doc
  }

  if (period.status === 'encerrada' && previousDoc?.status !== 'encerrada') {
    await writeAudit(req, {
      action: 'acesso-encerrado',
      assinante: subject,
      summary: `Acesso encerrado: ${period.summary ?? planName}`,
      details: { motivo: (req.context?.reason as string | undefined) ?? null, periodo: period.summary ?? null },
    })
    return doc
  }

  const pick = (p: Record<string, unknown> | undefined | null) =>
    p ? { plan: relId(p.plan), startsAt: p.startsAt, endsAt: p.endsAt, status: p.status, payment: p.payment } : null
  const diff = diffForAudit(pick(previousDoc), pick(doc) as Record<string, unknown>)
  if (Object.keys(diff).length > 0) {
    await writeAudit(req, {
      action: 'periodo-corrigido',
      assinante: subject,
      summary: `Período corrigido: ${period.summary ?? planName}`,
      details: diff,
    })
  }
  return doc
}

/**
 * Subscription periods with the payment record (D-05, D-06). Access is computed from these
 * periods on every request; nothing flips a flag. Periods are never deleted through the API:
 * staff end them ("Encerrar").
 */
export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  labels: { singular: 'Período de assinatura', plural: 'Assinaturas e pagamentos' },
  admin: {
    group: 'Assinantes',
    useAsTitle: 'summary',
    defaultColumns: ['summary', 'assinante', 'status', 'payment.method', 'createdAt'],
    description:
      'Cada pagamento vira um período com início e fim. Para dar ou renovar acesso, use o botão "Assinatura" na ficha do assinante; aqui fica o histórico. Períodos não são apagados: para cortar o acesso, use Encerrar.',
  },
  defaultSort: '-startsAt',
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    // History is kept (T-03-06); "Encerrar" ends a period instead
    delete: () => false,
  },
  hooks: {
    beforeValidate: [fillAndValidateDates],
    beforeChange: [fillSummaryAndClosedAt],
    afterChange: [syncAccessUntil, auditPeriod],
    afterDelete: [syncAccessUntilAfterDelete],
  },
  fields: [
    {
      name: 'assinante',
      type: 'relationship',
      relationTo: 'assinantes',
      required: true,
      index: true,
      label: 'Assinante',
    },
    {
      name: 'plan',
      type: 'relationship',
      relationTo: 'plans',
      label: 'Plano',
      admin: { description: 'Vazio = cortesia ou prazo combinado; informe a data de término.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'startsAt',
          type: 'date',
          required: true,
          label: 'Início',
          defaultValue: () => new Date().toISOString(),
          admin: { date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' } },
        },
        {
          name: 'endsAt',
          type: 'date',
          index: true,
          label: 'Fim do acesso',
          admin: {
            description:
              'Deixe vazio para calcular pelo plano. O acesso vale até o dia anterior a esta data, 23h59 de Brasília.',
            date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
          },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'ativa',
      label: 'Situação',
      options: [
        { label: 'Ativa', value: 'ativa' },
        { label: 'Encerrada', value: 'encerrada' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'closedAt',
      type: 'date',
      label: 'Encerrada em',
      admin: {
        readOnly: true,
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
      },
    },
    {
      name: 'payment',
      type: 'group',
      label: 'Pagamento',
      fields: [
        { name: 'amount', type: 'number', min: 0, label: 'Valor pago (R$)' },
        {
          name: 'method',
          type: 'select',
          required: true,
          label: 'Forma de pagamento',
          options: PAYMENT_METHODS.map((m) => ({ ...m })),
        },
        {
          name: 'paidAt',
          type: 'date',
          label: 'Data do pagamento',
          defaultValue: () => new Date().toISOString(),
          admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' } },
        },
        {
          name: 'note',
          type: 'textarea',
          label: 'Observação (ex.: comprovante recebido no WhatsApp em 19/10)',
          admin: { description: 'Não guarde o comprovante nem dados bancários: só uma anotação.' },
        },
      ],
    },
    {
      name: 'summary',
      type: 'text',
      label: 'Resumo',
      admin: { readOnly: true, hidden: true },
    },
  ],
}
