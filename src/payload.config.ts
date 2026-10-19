import { postgresAdapter } from '@payloadcms/db-postgres'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { pt } from '@payloadcms/translations/languages/pt'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Assinantes } from './collections/Assinantes'
import { AuditLog } from './collections/AuditLog'
import { Media } from './collections/Media'
import { Models } from './collections/Models'
import { Pages } from './collections/Pages'
import { SpaceItems } from './collections/SpaceItems'
import { Subscriptions } from './collections/Subscriptions'
import { Parties } from './collections/Parties'
import { Plans } from './collections/Plans'
import { Users } from './collections/Users'
import { Videos } from './collections/Videos'
import { Contact } from './globals/Contact'

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
      // PAINEL-06: who expires this week, first thing staff see
      beforeDashboard: ['/components/admin/assinantes/Vencimentos#Vencimentos'],
      graphics: {
        Logo: '/components/admin/Logo',
        Icon: '/components/admin/Icon',
      },
    },
  },
  collections: [
    Users,
    Assinantes,
    Plans,
    Subscriptions,
    AuditLog,
    { ...Media, upload: { ...(typeof Media.upload === 'object' ? Media.upload : {}), staticDir: mediaDir } },
    {
      ...Videos,
      upload: { ...(typeof Videos.upload === 'object' ? Videos.upload : {}), staticDir: path.join(mediaDir, 'videos') },
    },
    Parties,
    Pages,
    SpaceItems,
    Models,
  ],
  globals: [Contact],
  // T-03-12: a cookie sent from another origin is ignored (same-origin admin and server actions keep working)
  csrf: [process.env.NEXT_PUBLIC_SERVER_URL].filter((url): url is string => Boolean(url)),
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
      // 100 MB for venue videos; images are capped at 15 MB by the Media beforeOperation hook
      fileSize: 104_857_600,
    },
  },
  plugins: [
    seoPlugin({
      collections: ['parties', 'pages'],
      uploadsCollection: 'media',
      generateTitle: ({ doc }) => (doc as { title?: string })?.title ?? '',
      // Parties describe themselves with `summary`, pages with `intro`
      generateDescription: ({ doc }) =>
        (doc as { summary?: string; intro?: string })?.summary ?? (doc as { intro?: string })?.intro ?? '',
      tabbedUI: false,
    }),
  ],
})
