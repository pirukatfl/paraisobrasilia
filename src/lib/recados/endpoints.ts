import type { Endpoint, PayloadRequest } from 'payload'

import { isStaff } from '../../access/roles'
import { ServiceError } from '../classisex/service'
import { getRecadoModerationView, moderateRecado } from './service'

/**
 * Staff-only moderation actions on a recado, used by the "Moderação" panel in /admin:
 *   GET  /api/recados/:id/moderacao
 *   POST /api/recados/:id/aprovar
 *   POST /api/recados/:id/recusar     { motivo }
 *   POST /api/recados/:id/despublicar { motivo }
 * T-05-06: 403 unless the principal is staff. Only `motivo` is read from the body.
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

export const recadoEndpoints: Endpoint[] = [
  {
    path: '/:id/moderacao',
    method: 'get',
    handler: async (req) => {
      if (!isStaff({ req })) return forbidden()
      return run(() => getRecadoModerationView(req, idOf(req)))
    },
  },
  ...(['aprovar', 'recusar', 'despublicar'] as const).map(
    (kind): Endpoint => ({
      path: `/:id/${kind}`,
      method: 'post',
      handler: async (req) => {
        if (!isStaff({ req })) return forbidden()
        const body = kind === 'aprovar' ? {} : await readBody(req)
        return run(() => moderateRecado(req, idOf(req), kind, { motivo: body.motivo, now: new Date() }))
      },
    }),
  ),
]
