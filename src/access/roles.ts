import type { Where } from 'payload'

/**
 * Role helpers shared by every collection, global and field.
 *
 * T-03-01: before Phase 3 every access rule used `Boolean(req.user)` as "is staff". With a second
 * auth collection (`assinantes`) any logged-in subscriber would pass those checks, so the role is
 * now taken from the collection the principal was loaded from: `users` = staff.
 */
type ReqLike = { req: { user?: { collection?: string; id?: number | string } | null } }

export const isStaff = ({ req }: ReqLike): boolean => req.user?.collection === 'users'

export const isAssinante = ({ req }: ReqLike): boolean => req.user?.collection === 'assinantes'

/** Drafts-enabled collections: staff read everything, everybody else only published documents. */
export const staffOrPublished = (args: ReqLike): true | Where =>
  isStaff(args) ? true : { _status: { equals: 'published' } }

/** Field-level access for data only staff may see or change. */
export const staffOnlyField = {
  read: isStaff,
  update: isStaff,
  create: isStaff,
}
