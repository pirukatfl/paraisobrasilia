import type { Endpoint, PayloadRequest } from 'payload'

import { isStaff } from '../../access/roles'
import { ServiceError } from '../classisex/service'
import { resolveMessageReport, type MessageResolveAction } from './service'

/**
 * Staff-only: POST /api/message-reports/:id/resolver { acao: 'descartar' | 'resolver' | 'suspender', nota? }.
 * Only `acao` and `nota` are read from the body.
 */
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

export const messageReportEndpoints: Endpoint[] = [
  {
    path: '/:id/resolver',
    method: 'post',
    handler: async (req) => {
      if (!isStaff({ req })) return Response.json({ message: 'Sem permissão.' }, { status: 403 })
      const body = await readBody(req)
      try {
        return Response.json(
          await resolveMessageReport(
            req,
            String(req.routeParams?.id ?? ''),
            { acao: body.acao as MessageResolveAction, nota: body.nota },
            new Date(),
          ),
        )
      } catch (err) {
        if (err instanceof ServiceError) return Response.json({ message: err.message }, { status: err.status })
        throw err
      }
    },
  },
]
