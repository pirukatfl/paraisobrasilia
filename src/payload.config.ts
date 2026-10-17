import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { pt } from '@payloadcms/translations/languages/pt'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Media } from './collections/Media'
import { Parties } from './collections/Parties'
import { Users } from './collections/Users'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    theme: 'dark',
    meta: {
      titleSuffix: ' — Paraíso Brasília',
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Parties],
  editor: lexicalEditor(),
  i18n: {
    supportedLanguages: { pt, en },
    fallbackLanguage: 'pt',
  },
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
    migrationDir: path.resolve(dirname, 'migrations'),
    // Schema push only on developer machines; test, staging and production run migrations.
    push: process.env.SITE_ENV === 'development',
  }),
  sharp,
  upload: {
    limits: {
      fileSize: 15000000, // 15 MB
    },
  },
  plugins: [],
})
