import type { CollectionConfig } from 'payload'

import { isStaff } from '../access/roles'

const secureCookies = (process.env.NEXT_PUBLIC_SERVER_URL ?? '').startsWith('https://')

/**
 * Staff accounts for the admin panel (/admin).
 * No public sign-up: the very first account is created through Payload's built-in
 * create-first-user screen (only available while the collection is empty); after that,
 * only logged-in staff can create other staff accounts.
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: {
    singular: 'Usuário da equipe',
    plural: 'Usuários da equipe',
  },
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    // Payload's default is 2 h: staff editing a festa (flyer, valores, texto) for longer than that got
    // "Não autorizado" (401) on Save. 7 days; the admin keeps refreshing the token while it is open.
    tokenExpiration: 7 * 24 * 60 * 60,
    maxLoginAttempts: 5,
    lockTime: 600000, // 10 minutes
    cookies: { sameSite: 'Lax', secure: secureCookies },
  },
  access: {
    // T-03-01: only staff principals (collection `users`), never subscribers
    create: isStaff,
    read: isStaff,
    update: isStaff,
    delete: isStaff,
    // Payload's default unlock access is "any logged-in user"
    unlock: isStaff,
  },
  fields: [
    // email and password are added by `auth`
    {
      name: 'name',
      type: 'text',
      label: 'Nome',
    },
  ],
}
