import type { PayloadRequest } from 'payload'

/**
 * Payload's Local API merges `context` (and `user`) into the request object it receives, so a
 * flag such as `skipAudit` set for one nested operation would stay on `req` for every later
 * hook in the same request. Run the nested operation and restore what was there before.
 */
export async function withRequestState<T>(req: PayloadRequest, fn: () => Promise<T>): Promise<T> {
  const context = req.context
  const user = req.user
  try {
    return await fn()
  } finally {
    req.context = context
    req.user = user
  }
}
