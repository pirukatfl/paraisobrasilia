import config from '@payload-config'
import { getPayload } from 'payload'

import { accessStatusFor } from '@/lib/assinantes/status'
import { countUnread } from '@/lib/mensagens/service'

export const dynamic = 'force-dynamic'

/**
 * Unread messages of the logged-in subscriber (D-04): GET -> { count }.
 * T-05-18: private, no-store, noindex; the count is the caller's own; non-subscribers get 401.
 */
const HEADERS = {
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  Vary: 'Cookie',
}

export async function GET(request: Request) {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (!user || user.collection !== 'assinantes') {
    return Response.json({ count: 0 }, { status: 401, headers: HEADERS })
  }
  const access = await accessStatusFor(payload, user.id, new Date())
  if (access.state !== 'ativa') return Response.json({ count: 0 }, { headers: HEADERS })
  return Response.json({ count: await countUnread(payload, user.id) }, { headers: HEADERS })
}
