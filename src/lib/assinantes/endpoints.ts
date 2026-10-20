import type { Endpoint, PayloadRequest } from 'payload'

import { isStaff } from '../../access/roles'
import { whatsappUrl } from '../site/contact'
import { createPasswordLink, endAccess, getSituacao, grantOrRenew, ServiceError, setEmailConfirmed } from './service'

/**
 * Staff-only actions on a subscriber, used by the "Assinatura" panel in /admin:
 *   GET  /api/assinantes/:id/situacao
 *   POST /api/assinantes/:id/liberar   { planId, durationDays?, amount?, method, paidAt?, note? }
 *   POST /api/assinantes/:id/encerrar  { reason }
 *   POST /api/assinantes/:id/email-confirmado { confirmado }
 *   POST /api/assinantes/:id/link-senha (single-use 48 h link to send by WhatsApp, D-04)
 * Period dates are never read from the request: the service computes them (T-03-15).
 */
const forbidden = () => Response.json({ message: 'Sem permissão.' }, { status: 403 })

async function readBody(req: PayloadRequest): Promise<Record<string, unknown>> {
  if (req.data && typeof req.data === 'object') return req.data as Record<string, unknown>
  if (typeof req.json !== 'function') return {}
  try {
    const body = await req.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

const idOf = (req: PayloadRequest) => String(req.routeParams?.id ?? '')

async function run(fn: () => Promise<unknown>): Promise<Response> {
  try {
    return Response.json(await fn())
  } catch (err) {
    if (err instanceof ServiceError) return Response.json({ message: err.message }, { status: err.status })
    throw err
  }
}

const num = (value: unknown) => (value === null || value === undefined || value === '' ? null : Number(value))
const text = (value: unknown) => (typeof value === 'string' ? value : null)

export const assinanteEndpoints: Endpoint[] = [
  {
    path: '/:id/situacao',
    method: 'get',
    handler: async (req) => {
      if (!isStaff({ req })) return forbidden()
      return run(() => getSituacao(req.payload, idOf(req)))
    },
  },
  {
    path: '/:id/liberar',
    method: 'post',
    handler: async (req) => {
      if (!isStaff({ req })) return forbidden()
      const body = await readBody(req)
      return run(() =>
        grantOrRenew(req.payload, {
          assinanteId: idOf(req),
          planId: num(body.planId),
          durationDays: num(body.durationDays),
          amount: num(body.amount),
          method: body.method as never,
          paidAt: text(body.paidAt),
          note: text(body.note),
          req,
        }),
      )
    },
  },
  {
    path: '/:id/encerrar',
    method: 'post',
    handler: async (req) => {
      if (!isStaff({ req })) return forbidden()
      const body = await readBody(req)
      return run(() => endAccess(req.payload, { assinanteId: idOf(req), reason: text(body.reason) ?? '', req }))
    },
  },
  {
    path: '/:id/email-confirmado',
    method: 'post',
    handler: async (req) => {
      if (!isStaff({ req })) return forbidden()
      const body = await readBody(req)
      return run(() => setEmailConfirmed(req.payload, { assinanteId: idOf(req), confirmed: body.confirmado === true, req }))
    },
  },
  {
    path: '/:id/link-senha',
    method: 'post',
    handler: async (req) => {
      if (!isStaff({ req })) return forbidden()
      return run(async () => {
        const { url, expiresAt, assinante } = await createPasswordLink(req.payload, { assinanteId: idOf(req), req })
        const message = `Olá, ${assinante.name}! Este é o link para criar sua nova senha no site do Paraíso (vale por 48 horas): ${url}`
        return { url, expiresAt, whatsappUrl: assinante.whatsapp ? whatsappUrl(assinante.whatsapp, message) : null }
      })
    },
  },
]
