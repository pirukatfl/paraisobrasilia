import type { Endpoint, PayloadRequest } from 'payload'

import { isStaff } from '../../access/roles'
import { approveAd, rejectAd, ServiceError, unpublishAd } from './service'

/**
 * Staff-only moderation actions on an ad, used by the "Moderação" panel in /admin (PAINEL-07):
 *   POST /api/ads/:id/aprovar
 *   POST /api/ads/:id/recusar     { motivo }
 *   POST /api/ads/:id/despublicar { motivo }
 * T-04-04: 403 unless the principal is staff. Only `motivo` is read from the body.
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

export const adEndpoints: Endpoint[] = [
  {
    path: '/:id/aprovar',
    method: 'post',
    handler: async (req) => {
      if (!isStaff({ req })) return forbidden()
      return run(() => approveAd(req, idOf(req), new Date()))
    },
  },
  {
    path: '/:id/recusar',
    method: 'post',
    handler: async (req) => {
      if (!isStaff({ req })) return forbidden()
      const body = await readBody(req)
      return run(() => rejectAd(req, idOf(req), body.motivo, new Date()))
    },
  },
  {
    path: '/:id/despublicar',
    method: 'post',
    handler: async (req) => {
      if (!isStaff({ req })) return forbidden()
      const body = await readBody(req)
      return run(() => unpublishAd(req, idOf(req), body.motivo, new Date()))
    },
  },
]
