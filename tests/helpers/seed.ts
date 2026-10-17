/**
 * Seed helpers shared by integration (vitest) and e2e (playwright global setup) tests.
 * Everything goes through the Payload Local API against the isolated test database.
 */
import { config as loadEnv } from 'dotenv'
import path from 'path'
import type { Payload } from 'payload'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(dirname, '../..')

const TEST_DB_SUFFIX = '/paraiso_test'

function assertTestDatabase(): void {
  const uri = process.env.DATABASE_URI ?? ''
  // T-01-36: never reset anything but the dedicated test database.
  if (!uri.replace(/\?.*$/, '').endsWith(TEST_DB_SUFFIX)) {
    throw new Error(
      `Refusing to touch database "${uri.replace(/\/\/[^@]*@/, '//***@')}": tests only run against ${TEST_DB_SUFFIX}`,
    )
  }
}

let payloadPromise: Promise<Payload> | null = null

/** Payload instance bound to DATABASE_URI from .env.test (paraiso_test). */
export async function getTestPayload(): Promise<Payload> {
  if (!payloadPromise) {
    loadEnv({ path: path.join(rootDir, '.env.test'), override: true })
    assertTestDatabase()
    payloadPromise = (async () => {
      const [{ getPayload }, { default: config }] = await Promise.all([
        import('payload'),
        import('../../src/payload.config'),
      ])
      const payload = await getPayload({ config })
      // Test DB runs the committed migrations (no dev-mode schema push outside development).
      const { migrations } = await import('../../src/migrations')
      await payload.db.migrate({ migrations: migrations as never })
      return payload
    })()
  }
  return payloadPromise
}

const RESET_ORDER = ['parties', 'media', 'users'] as const

/** Deletes every document in parties, media and users (collections not registered yet are skipped). */
export async function resetDatabase(payload: Payload): Promise<void> {
  assertTestDatabase()
  for (const slug of RESET_ORDER) {
    if (!payload.collections[slug as keyof typeof payload.collections]) continue
    await payload.delete({
      collection: slug as never,
      where: { id: { exists: true } },
      overrideAccess: true,
    })
  }
}

export async function seedStaffUser(
  payload: Payload,
  { email, password }: { email: string; password: string },
) {
  return payload.create({
    collection: 'users',
    data: { email, password, name: 'Equipe de Teste' },
    overrideAccess: true,
  })
}

export interface SeedPartyInput {
  title: string
  startsAt?: string
  endsAt?: string
  flyerFormat?: 'square' | 'portrait'
  summary?: string
  prices?: { label: string; value: string }[]
  dressCode?: string
  attractions?: { kind: 'dj' | 'show' | 'modelo' | 'outro'; name: string }[]
  /** Plain text turned into a one-paragraph Lexical document */
  details?: string
}

/** Minimal Lexical editor state with one paragraph. */
export function lexicalParagraph(text: string) {
  return {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [
        {
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          textFormat: 0,
          textStyle: '',
          children: [{ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
        },
      ],
    },
  }
}

const FIXTURES = path.join(rootDir, 'tests/fixtures')

/** Uploads the matching fixture flyer and creates a party through the Local API. */
export async function seedParty(payload: Payload, partial: SeedPartyInput) {
  if (!payload.collections['parties' as keyof typeof payload.collections]) {
    throw new Error('parties collection not available')
  }
  const flyerFormat = partial.flyerFormat ?? 'portrait'
  const flyer = await payload.create({
    collection: 'media',
    data: { alt: `Flyer da ${partial.title}` },
    filePath: path.join(FIXTURES, flyerFormat === 'square' ? 'flyer-square.jpg' : 'flyer-portrait.jpg'),
    overrideAccess: true,
  })
  return payload.create({
    collection: 'parties',
    data: {
      title: partial.title,
      startsAt: partial.startsAt ?? new Date(Date.now() + 3 * 86_400_000).toISOString(),
      ...(partial.endsAt ? { endsAt: partial.endsAt } : {}),
      flyer: flyer.id,
      flyerFormat,
      ...(partial.summary !== undefined ? { summary: partial.summary } : {}),
      ...(partial.prices !== undefined ? { prices: partial.prices } : {}),
      ...(partial.dressCode !== undefined ? { dressCode: partial.dressCode } : {}),
      ...(partial.attractions !== undefined ? { attractions: partial.attractions } : {}),
      ...(partial.details !== undefined ? { details: lexicalParagraph(partial.details) } : {}),
    } as never,
    overrideAccess: true,
  })
}
