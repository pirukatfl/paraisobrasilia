import { postgresAdapter } from '@payloadcms/db-postgres'
import { seoPlugin } from '@payloadcms/plugin-seo'
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

/**
 * Media files live on the server disk (client decision 2026-10-17: no object storage).
 * MEDIA_DIR: `media` (relative to the working directory) in development and tests,
 * `/app/media` in the container, where the named Docker volume `media` is mounted.
 * Files are served by Payload's own route (/api/media/file/...), so flyer and OG URLs
 * stay on the site host.
 */
const mediaDir = path.resolve(/* turbopackIgnore: true */ process.env.MEDIA_DIR || 'media')

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
    components: {
      graphics: {
        Logo: '/components/admin/Logo',
        Icon: '/components/admin/Icon',
      },
    },
  },
  collections: [
    Users,
    { ...Media, upload: { ...(typeof Media.upload === 'object' ? Media.upload : {}), staticDir: mediaDir } },
    Parties,
  ],
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
  plugins: [
    seoPlugin({
      collections: ['parties'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => (doc as { title?: string })?.title ?? '',
      generateDescription: ({ doc }) => (doc as { summary?: string })?.summary ?? '',
      tabbedUI: false,
    }),
  ],
})
