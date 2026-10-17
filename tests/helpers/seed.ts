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
      return getPayload({ config })
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
}

/** Creates a party with a flyer. Implemented once the parties collection exists (plan 01-05). */
export async function seedParty(payload: Payload, partial: SeedPartyInput): Promise<unknown> {
  if (!payload.collections['parties' as keyof typeof payload.collections]) {
    throw new Error('parties collection not available')
  }
  throw new Error(`seedParty not implemented yet (${partial.title})`)
}
