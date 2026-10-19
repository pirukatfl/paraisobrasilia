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

const RESET_ORDER = [
  // ClassiSex (Phase 4): reports and media before ads, ads before their Eu sou options and authors
  'ad-reports',
  'ad-media',
  'ads',
  'ad-categories',
  'audit-log',
  'subscriptions',
  'assinantes',
  'plans',
  'models',
  'pages',
  'space-items',
  'videos',
  'parties',
  'media',
  'users',
] as const

/** Deletes every document in RESET_ORDER (children before parents; collections not registered yet are skipped). */
export async function resetDatabase(payload: Payload): Promise<void> {
  assertTestDatabase()
  for (const slug of RESET_ORDER) {
    if (!payload.collections[slug as keyof typeof payload.collections]) continue
    await payload.delete({
      collection: slug as never,
      where: { id: { exists: true } },
      overrideAccess: true,
      // Test cleanup is not a staff action: no audit rows
      context: { skipAudit: true },
    })
  }
}

/** Restores (or overrides) the "Contato e endereço" global with the seeded values. */
export async function seedContact(payload: Payload, overrides: Record<string, unknown> = {}) {
  const { CONTACT_SEED } = await import('../../src/migrations/seed/contact-content')
  return payload.updateGlobal({
    slug: 'contact' as never,
    data: { ...CONTACT_SEED, ...overrides } as never,
    overrideAccess: true,
  })
}

/** Creates the six institutional pages (published) when missing — same function the migration runs. */
export async function seedPages(payload: Payload) {
  const { seedPages: seed } = await import('../../src/migrations/seed/markdown-to-lexical')
  return seed(payload)
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

/**
 * Creates a subscriber account the way migrations and imports do (trusted context: the
 * beforeOperation guard only lets staff or trusted calls create accounts, T-03-02).
 */
export async function seedAssinante(
  payload: Payload,
  { email, password, name, whatsapp }: { email: string; password: string; name: string; whatsapp?: string },
) {
  return payload.create({
    collection: 'assinantes' as never,
    data: { email, password, name, ...(whatsapp ? { whatsapp } : {}) } as never,
    overrideAccess: true,
    context: { trustedCreate: true, skipAudit: true },
  }) as Promise<{ id: number; email: string; name: string; mustChangePassword?: boolean | null }>
}

export interface SeedPlanInput {
  name: string
  durationDays: number
  price: number
  promoPrice?: number | null
  paymentUrl?: string
  description?: string
  active?: boolean
  order?: number
}

/** Creates a subscription plan (Assine Já) through the Local API. */
export async function seedPlan(payload: Payload, input: SeedPlanInput) {
  return payload.create({
    collection: 'plans' as never,
    data: { active: true, order: 0, ...input } as never,
    overrideAccess: true,
  }) as Promise<{ id: number; name: string; durationDays: number; price: number; promoPrice?: number | null }>
}

export interface SeedSubscriptionInput {
  assinanteId: number
  planId?: number | null
  startsAt: string
  endsAt?: string
  status?: 'ativa' | 'encerrada'
  method?: 'pix' | 'pagbank' | 'dinheiro' | 'transferencia' | 'cortesia' | 'outro'
  amount?: number
}

/** Creates a subscription period (no audit) through the Local API. */
export async function seedSubscription(payload: Payload, input: SeedSubscriptionInput) {
  return payload.create({
    collection: 'subscriptions' as never,
    data: {
      assinante: input.assinanteId,
      ...(input.planId ? { plan: input.planId } : {}),
      startsAt: input.startsAt,
      ...(input.endsAt ? { endsAt: input.endsAt } : {}),
      status: input.status ?? 'ativa',
      payment: { method: input.method ?? 'pix', amount: input.amount ?? 30 },
    } as never,
    overrideAccess: true,
    context: { skipAudit: true },
  }) as Promise<{ id: number; startsAt: string; endsAt: string; summary?: string | null; status: string }>
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
  /** Publication status (drafts exist from plan 01-09); default published */
  status?: 'draft' | 'published'
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
  const status = partial.status ?? 'published'
  return payload.create({
    collection: 'parties',
    draft: status === 'draft',
    data: {
      _status: status,
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

export interface SeedSpacePhotoInput {
  order?: number
  published?: boolean
  caption?: string
  alt?: string
  /** Fixture file name in tests/fixtures (default flyer-square.jpg) */
  fixture?: string
  authorization?: { date?: string; note?: string }
}

/** Uploads a fixture image and creates a space gallery photo (published by default). */
export async function seedSpacePhoto(payload: Payload, input: SeedSpacePhotoInput = {}) {
  const image = await payload.create({
    collection: 'media',
    data: { alt: input.alt ?? 'Pista de dança do Paraíso' },
    filePath: path.join(FIXTURES, input.fixture ?? 'flyer-square.jpg'),
    overrideAccess: true,
  })
  const published = input.published ?? true
  return payload.create({
    collection: 'space-items' as never,
    draft: !published,
    data: {
      _status: published ? 'published' : 'draft',
      kind: 'photo',
      image: image.id,
      order: input.order ?? 0,
      ...(input.caption ? { caption: input.caption } : {}),
      ...(input.authorization ? { imageAuthorization: input.authorization } : {}),
    } as never,
    overrideAccess: true,
  })
}

/** Uploads tests/fixtures/espaco.mp4 with a poster and creates a space gallery video. */
export async function seedSpaceVideo(
  payload: Payload,
  input: { order?: number; published?: boolean; title?: string } = {},
) {
  const poster = await payload.create({
    collection: 'media',
    data: { alt: 'Capa do vídeo do espaço' },
    filePath: path.join(FIXTURES, 'flyer-square.jpg'),
    overrideAccess: true,
  })
  const video = await payload.create({
    collection: 'videos' as never,
    data: { title: input.title ?? 'Pista de dança numa noite de festa', poster: poster.id } as never,
    filePath: path.join(FIXTURES, 'espaco.mp4'),
    overrideAccess: true,
  })
  const published = input.published ?? true
  return payload.create({
    collection: 'space-items' as never,
    draft: !published,
    data: {
      _status: published ? 'published' : 'draft',
      kind: 'video',
      video: (video as { id: number }).id,
      order: input.order ?? 0,
    } as never,
    overrideAccess: true,
  })
}

/** Creates a model with `photoCount` fixture photos (published by default). */
export async function seedModel(
  payload: Payload,
  input: { name: string; photoCount: number; published?: boolean; order?: number; authorization?: { date?: string; note?: string } },
) {
  const photos = []
  for (let i = 0; i < input.photoCount; i++) {
    const media = await payload.create({
      collection: 'media',
      data: { alt: `${input.name} — foto ${i + 1}` },
      filePath: path.join(FIXTURES, i % 2 ? 'flyer-square.jpg' : 'flyer-portrait.jpg'),
      overrideAccess: true,
    })
    photos.push({ image: media.id })
  }
  const published = input.published ?? true
  return payload.create({
    collection: 'models' as never,
    draft: !published,
    data: {
      _status: published ? 'published' : 'draft',
      name: input.name,
      photos,
      order: input.order ?? 0,
      ...(input.authorization ? { imageAuthorization: input.authorization } : {}),
    } as never,
    overrideAccess: true,
  })
}

/** Eu sou options (Casal, Solteiro, Solteira) — same function the classisex_ads migration runs. */
export async function seedAdCategories(payload: Payload): Promise<number> {
  const { seedAdCategoriesIfEmpty } = await import('../../src/migrations/seed/ad-categories-content')
  return seedAdCategoriesIfEmpty(payload)
}

export interface SeedAdInput {
  author: number
  euSou?: number
  cidade?: string
  texto?: string
  contato?: { whatsapp?: string; telegram?: string; email?: string }
  status?: 'pendente' | 'aprovado' | 'recusado' | 'despublicado'
  publishedAt?: string
  motivo?: string
}

/** Creates a ClassiSex ad through the Local API (default: first Eu sou option, pendente). */
export async function seedAd(payload: Payload, input: SeedAdInput) {
  let euSou = input.euSou
  if (euSou === undefined) {
    const { docs } = await payload.find({ collection: 'ad-categories' as never, sort: 'order', limit: 1, overrideAccess: true })
    euSou = (docs[0] as { id: number }).id
  }
  const status = input.status ?? 'pendente'
  return payload.create({
    collection: 'ads' as never,
    data: {
      author: input.author,
      euSou,
      cidade: input.cidade ?? 'Brasília',
      texto: input.texto ?? 'Casal simpático procura amigos para a próxima festa.',
      contato: input.contato ?? { whatsapp: '5561999990000' },
      status,
      submittedAt: new Date().toISOString(),
      ...(status === 'aprovado' ? { publishedAt: input.publishedAt ?? new Date().toISOString() } : {}),
      ...(input.motivo ? { motivo: input.motivo } : {}),
    } as never,
    overrideAccess: true,
  }) as Promise<{ id: number; status: string; resumo?: string | null }>
}
