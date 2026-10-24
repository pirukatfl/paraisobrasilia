import type { PayloadRequest } from 'payload'

import { mensagemAmigavel } from './index'

/**
 * Answer for an unexpected error inside a custom endpoint: the original goes to the server log,
 * the caller gets a JSON `{ message }` in Portuguese (never the raw error, T-01-14).
 */
export function respostaDeErroInesperado(err: unknown, req?: PayloadRequest): Response {
  if (req?.payload?.logger) req.payload.logger.error({ err }, 'Erro inesperado em endpoint')
  else console.error('Erro inesperado em endpoint', err)
  return Response.json({ message: mensagemAmigavel(err) }, { status: 500 })
}
