import type { PayloadRequest, Where } from 'payload'

import { withRequestState } from '../../assinantes/context'

/**
 * Deletes comments matching `where`, replies first (a root's own delete hook removes its replies,
 * so deleting roots after their replies never meets a missing document). Never audited: these are
 * cascades (ad deleted, account deleted), not a staff decision on one comment.
 */
export async function deleteCommentsWhere(req: PayloadRequest, where: Where): Promise<void> {
  for (const level of [{ parent: { exists: true } }, { parent: { exists: false } }]) {
    await withRequestState(req, () =>
      req.payload.delete({
        collection: 'ad-comments',
        where: { and: [where, level] },
        overrideAccess: true,
        context: { skipAudit: true, cascade: true },
        req,
      }),
    )
  }
}
