import { ValidationError, type CollectionBeforeValidateHook } from 'payload'

import { isStaff } from '../../access/roles'
import { withRequestState } from './context'

const normalise = (value: string) => value.trim().toLowerCase()

export const emailEmUsoMessage = (name: string | null | undefined, email: string) =>
  `Já existe um assinante com o e-mail ${email}${name ? ` (${name})` : ''}. Procure por ele na lista de Assinantes e edite o cadastro existente em vez de criar outro.`

/**
 * Staff-only (the public sign-up answers neutrally and never reaches this message, T-CG-04):
 * replaces Payload's generic "Valor deve ser único" with a clear pt-BR error on the e-mail field.
 * The comparison ignores case and surrounding spaces, and skips the account being edited.
 */
export const avisarEmailJaCadastrado: CollectionBeforeValidateHook = async ({ data, operation, originalDoc, req }) => {
  if (!data || (operation !== 'create' && operation !== 'update')) return data
  if (typeof data.email !== 'string' || !isStaff({ req })) return data
  const email = normalise(data.email)
  if (!email) return data
  const others = originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []
  const found = await withRequestState(req, () =>
    req.payload.find({
      collection: 'assinantes',
      where: { and: [{ email: { equals: email } }, ...others] },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    }),
  )
  const dup = found.docs[0] as { name?: string | null } | undefined
  if (dup) {
    throw new ValidationError(
      { collection: 'assinantes', errors: [{ path: 'email', message: emailEmUsoMessage(dup.name, email) }], req },
      req.t,
    )
  }
  return data
}
