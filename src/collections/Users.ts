import type { CollectionConfig } from 'payload'

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
    maxLoginAttempts: 5,
    lockTime: 600000, // 10 minutes
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
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
