import { postgresAdapter } from '@payloadcms/db-postgres'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { en } from '@payloadcms/translations/languages/en'
import { pt } from '@payloadcms/translations/languages/pt'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { AdCategories } from './collections/AdCategories'
import { AdMedia } from './collections/AdMedia'
import { AdReports } from './collections/AdReports'
import { Ads } from './collections/Ads'
import { Assinantes } from './collections/Assinantes'
import { AuditLog } from './collections/AuditLog'
import { Contos } from './collections/Contos'
import { Media } from './collections/Media'
import { Models } from './collections/Models'
import { Pages } from './collections/Pages'
import { Conversations } from './collections/Conversations'
import { Blocks } from './collections/Blocks'
import { MessageReports } from './collections/MessageReports'
import { Messages } from './collections/Messages'
import { Recados } from './collections/Recados'
import { SpaceItems } from './collections/SpaceItems'
import { Subscriptions } from './collections/Subscriptions'
import { Parties } from './collections/Parties'
import { Plans } from './collections/Plans'
import { Users } from './collections/Users'
import { Videos } from './collections/Videos'
import { Contact } from './globals/Contact'
import { buildEmailAdapter } from './lib/email/config'
import { assertOutsidePublicMedia, privateMediaDir } from './lib/classisex/storage'

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

/**
 * ClassiSex photos/videos (Phase 4, CLAS-06): PRIVATE_MEDIA_DIR — `private-media` in development
 * and tests, `/app/private-media` in the container (named volume `private_media`). Never under
 * MEDIA_DIR or public/: Payload's public file routes would serve them (T-04-03). Checked at load.
 */
const privateDir = privateMediaDir()
assertOutsidePublicMedia(mediaDir, privateDir)

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
      // PAINEL-07: ClassiSex moderation queue
      beforeDashboard: [
        '/components/admin/assinantes/Vencimentos#Vencimentos',
        '/components/admin/classisex/FilaClassisex#FilaClassisex',
      ],
      graphics: {
        Logo: '/components/admin/Logo',
        Icon: '/components/admin/Icon',
      },
    },
  },
  // T-03-16: the site and the admin use REST only; GraphQL would be a second surface to secure
  graphQL: { disable: true },
  collections: [
    Users,
    Assinantes,
    Plans,
    Subscriptions,
    AuditLog,
    AdCategories,
    Ads,
    { ...AdMedia, upload: { ...(typeof AdMedia.upload === 'object' ? AdMedia.upload : {}), staticDir: privateDir } },
    AdReports,
    Recados,
    Conversations,
    Messages,
    Blocks,
    MessageReports,
    { ...Media, upload: { ...(typeof Media.upload === 'object' ? Media.upload : {}), staticDir: mediaDir } },
    {
      ...Videos,
      upload: { ...(typeof Videos.upload === 'object' ? Videos.upload : {}), staticDir: path.join(mediaDir, 'videos') },
    },
    Parties,
    Pages,
    Contos,
    SpaceItems,
    Models,
  ],
  globals: [Contact],
  // T-03-12: no `csrf` allowlist — it made extractJWT drop the cookie whenever Origin and
  // Sec-Fetch-Site were both absent (logged users out). Cookies are SameSite=Lax and src/proxy.ts
  // rejects state-changing requests carrying a foreign Origin.
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
  // Hostinger SMTP when SMTP_USER/SMTP_PASS are set; otherwise Payload's console fallback
  email: buildEmailAdapter(),
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
