import { APIError, Forbidden, type CollectionBeforeOperationHook, type CollectionConfig } from 'payload'

import { isAssinante, isStaff, staffOnlyField } from '../access/roles'

export const MIN_PASSWORD_LENGTH = 8
export const PASSWORD_TOO_SHORT = 'A senha precisa ter pelo menos 8 caracteres.'

/** 30 days: JWT expiry, session expiry and cookie Expires (ASS-01: stays logged in between visits). */
export const ASSINANTE_TOKEN_SECONDS = 2_592_000

const secureCookies = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').startsWith('https://')

/**
 * Guards the operations Payload exposes for every auth collection.
 * - create: only staff, or trusted server code (migrations, imports, tests) via `req.context.trustedCreate`.
 *   Closes POST /api/assinantes/first-register, which creates with overrideAccess while the
 *   collection is empty (T-03-02).
 * - forgotPassword: only the staff "link de nova senha" service (`req.context.staffPasswordLink`);
 *   the public endpoint would otherwise mint tokens and overwrite a staff-generated link (T-03-03).
 * - password writes: minimum length; a password typed by staff is temporary (D-04).
 */
const guardOperations: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  const staff = isStaff({ req })
  if (operation === 'create' && !staff && req.context?.trustedCreate !== true) {
    throw new Forbidden(req.t)
  }
  if (operation === 'forgotPassword' && req.context?.staffPasswordLink !== true) {
    throw new Forbidden(req.t)
  }
  const writeArgs = args as { data?: Record<string, unknown> }
  const data = operation === 'create' || operation === 'update' ? writeArgs.data : undefined
  if (data && typeof data.password === 'string') {
    if (data.password.length < MIN_PASSWORD_LENGTH) {
      throw new APIError(PASSWORD_TOO_SHORT, 400, null, true)
    }
    if (staff) {
      writeArgs.data = { ...data, mustChangePassword: true }
    }
  }
  return args
}

/**
 * Subscriber accounts (ASS-01, D-01). Created by staff after checking the payment receipt; an
 * account can exist without access (access comes from subscription periods).
 */
export const Assinantes: CollectionConfig = {
  slug: 'assinantes',
  labels: { singular: 'Assinante', plural: 'Assinantes' },
  admin: {
    group: 'Assinantes',
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'updatedAt'],
    listSearchableFields: ['name', 'email', 'whatsapp'],
    description:
      'Crie a conta depois de conferir o comprovante. A conta pode existir sem acesso; o acesso é liberado em "Assinatura".',
  },
  auth: {
    tokenExpiration: ASSINANTE_TOKEN_SECONDS,
    maxLoginAttempts: 5, // T-03-04
    lockTime: 600_000, // 10 minutes
    useSessions: true,
    cookies: { sameSite: 'Lax', secure: secureCookies },
    // Staff-generated "nova senha" link (D-04): 48 hours, single use
    forgotPassword: { expiration: 172_800_000 },
  },
  access: {
    // T-03-07: a subscriber reads only its own account
    read: ({ req }) => {
      if (isStaff({ req })) return true
      if (isAssinante({ req }) && req.user) return { id: { equals: req.user.id } }
      return false
    },
    create: isStaff,
    update: isStaff,
    delete: isStaff,
    unlock: isStaff,
    // Subscribers never open /admin (T-03-17)
    admin: () => false,
  },
  hooks: {
    beforeOperation: [guardOperations],
  },
  fields: [
    // email and password are added by `auth`
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nome ou apelido',
      admin: { description: 'Como o assinante é chamado no site ("Olá, …").' },
    },
    {
      name: 'whatsapp',
      type: 'text',
      label: 'WhatsApp',
      admin: { description: 'Só números, com 55 e DDD. Usado pela equipe para enviar senha e avisos.' },
      validate: (value: unknown) =>
        value === undefined || value === null || value === '' || /^55\d{10,11}$/.test(String(value))
          ? true
          : 'Use só números, com 55 e DDD (ex.: 5561999998888).',
    },
    {
      name: 'staffNotes',
      type: 'textarea',
      label: 'Observações da equipe',
      admin: { description: 'Só a equipe vê. Não anote dados bancários nem comprovantes.' },
      access: staffOnlyField,
    },
    {
      name: 'mustChangePassword',
      type: 'checkbox',
      label: 'Senha provisória',
      defaultValue: false,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Marcado quando a equipe define a senha; some quando o assinante troca.',
      },
    },
  ],
}
