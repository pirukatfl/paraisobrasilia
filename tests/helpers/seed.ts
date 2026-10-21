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

const TEST_DB_PATTERN = /\/paraiso_test(_[a-z0-9]+)?$/ // paraiso_test or a per-worktree copy (paraiso_test_xyz)

function assertTestDatabase(): void {
  const uri = process.env.DATABASE_URI ?? ''
  // T-01-36: never reset anything but the dedicated test database.
  if (!TEST_DB_PATTERN.test(uri.replace(/\?.*$/, ''))) {
    throw new Error(
      `Refusing to touch database "${uri.replace(/\/\/[^@]*@/, '//***@')}": tests only run against paraiso_test[_suffix]`,
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
  // Messages (Phase 5): before the accounts that take part
  'message-reports',
  'blocks',
  'messages',
  'conversations',
  // Recados (Phase 5): before the accounts that own them
  'recados',
  // Contos (Phase 5)
  'contos',
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
  /** Which fixture image is uploaded (the site reads the real proportions from the file) */
  flyerFormat?: 'square' | 'portrait' | 'landscape' | 'stories'
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

/** Lexical editor state with one paragraph per text. */
export function lexicalParagraphs(texts: string[]) {
  const base = lexicalParagraph('')
  return {
    root: {
      ...base.root,
      children: texts.map((text) => ({
        ...base.root.children[0]!,
        children: [{ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
      })),
    },
  }
}

export interface SeedContoInput {
  title: string
  slug?: string
  /** One paragraph per entry (default: 5 generic paragraphs) */
  texto?: string[]
  paragrafosAbertos?: number
  status?: 'published' | 'draft'
  publishedAt?: string
  wpId?: number
  wpSlug?: string
  wpRestrito?: boolean
}

/** Creates a conto through the Local API (published by default). */
export async function seedConto(payload: Payload, input: SeedContoInput) {
  const status = input.status ?? 'published'
  return payload.create({
    collection: 'contos' as never,
    draft: status === 'draft',
    data: {
      _status: status,
      title: input.title,
      ...(input.slug ? { slug: input.slug } : {}),
      publishedAt: input.publishedAt ?? '2025-06-01T12:00:00.000Z',
      texto: lexicalParagraphs(
        input.texto ?? [1, 2, 3, 4, 5].map((i) => `Parágrafo ${i} do conto ${input.title}.`),
      ),
      ...(input.paragrafosAbertos !== undefined ? { paragrafosAbertos: input.paragrafosAbertos } : {}),
      ...(input.wpId !== undefined ? { wpId: input.wpId } : {}),
      ...(input.wpSlug !== undefined ? { wpSlug: input.wpSlug } : {}),
      ...(input.wpRestrito !== undefined ? { wpRestrito: input.wpRestrito } : {}),
    } as never,
    overrideAccess: true,
  }) as unknown as Promise<{ id: number; slug: string; title: string; _status?: string }>
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
    filePath: path.join(FIXTURES, `flyer-${flyerFormat}.jpg`),
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

/** Eu sou options (Casal, Mulher, Homem, Trans) — same function the classisex_ads migration runs. */
export async function seedAdCategories(payload: Payload): Promise<number> {
  const { seedAdCategoriesIfEmpty } = await import('../../src/migrations/seed/ad-categories-content')
  return seedAdCategoriesIfEmpty(payload)
}

export interface SeedAdInput {
  author: number
  apelido?: string
  euSou?: number
  cidade?: string
  texto?: string
  contato?: { whatsapp?: string; telegram?: string }
  status?: 'pendente' | 'aprovado' | 'recusado' | 'despublicado' | 'rascunho'
  publishedAt?: string
  motivo?: string
  /** Old WordPress comment id, importer-only field (06-06) */
  wpCommentId?: number
  /** Importer-only marker: draft written by the team on the old site (placeholder owner) */
  origemLegado?: 'equipe'
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
      apelido: input.apelido ?? 'Casal Teste',
      euSou,
      cidade: input.cidade ?? 'Brasília',
      texto: input.texto ?? 'Casal simpático procura amigos para a próxima festa.',
      contato: input.contato ?? { whatsapp: '5561999990000' },
      status,
      submittedAt: new Date().toISOString(),
      ...(status === 'aprovado' ? { publishedAt: input.publishedAt ?? new Date().toISOString() } : {}),
      ...(input.motivo ? { motivo: input.motivo } : {}),
      ...(input.origemLegado ? { origemLegado: input.origemLegado } : {}),
      ...(input.wpCommentId !== undefined
        ? {
            wpCommentId: input.wpCommentId,
            importadoEm: new Date().toISOString(),
            criadoNoSiteAntigoEm: '2025-05-01T13:00:00.000Z',
          }
        : {}),
    } as never,
    overrideAccess: true,
  }) as Promise<{ id: number; status: string; resumo?: string | null }>
}

/**
 * Convenience for ClassiSex tests: subscriber with a period covering `now` (30 days by default)
 * and one approved ad.
 */
export async function seedVisibleAd(
  payload: Payload,
  input: { authorEmail: string; authorName?: string; now?: Date; days?: number } & Omit<SeedAdInput, 'author' | 'status'>,
) {
  const now = input.now ?? new Date()
  const author = await seedAssinante(payload, {
    email: input.authorEmail,
    password: 'senha-anuncio-123',
    name: input.authorName ?? 'Anunciante Teste',
  })
  await seedSubscription(payload, {
    assinanteId: author.id,
    startsAt: new Date(now.getTime() - 86_400_000).toISOString(),
    endsAt: new Date(now.getTime() + (input.days ?? 30) * 86_400_000).toISOString(),
  })
  const { authorEmail: _e, authorName: _n, now: _now, days: _d, ...ad } = input
  const created = await seedAd(payload, { ...ad, author: author.id, status: 'aprovado' })
  return { author, ad: created }
}

export interface SeedRecadoInput {
  author: number
  apelido?: string
  texto?: string
  status?: 'pendente' | 'aprovado' | 'recusado' | 'despublicado'
  publishedAt?: string
  motivo?: string
}

/** Creates a recado through the Local API (default: pendente). Staff path: redaction still applies. */
export async function seedRecado(payload: Payload, input: SeedRecadoInput) {
  const status = input.status ?? 'pendente'
  const now = new Date().toISOString()
  return payload.create({
    collection: 'recados' as never,
    data: {
      author: input.author,
      apelido: input.apelido ?? 'Apelido Teste',
      texto: input.texto ?? 'Recado de teste da casa.',
      status,
      submittedAt: now,
      ...(status === 'aprovado' ? { publishedAt: input.publishedAt ?? now } : {}),
      ...(input.motivo ? { motivo: input.motivo } : {}),
    } as never,
    overrideAccess: true,
    context: { skipAudit: true },
  }) as Promise<{ id: number; apelido: string; texto: string; status: string; publishedAt?: string | null }>
}

/** Uploads a fixture (photo or espaco.mp4) to an ad through the Local API (staff path). */
export async function seedAdMedia(
  payload: Payload,
  { ad, fixture = 'flyer-square.jpg', order = 0 }: { ad: number; fixture?: string; order?: number },
) {
  return payload.create({
    collection: 'ad-media' as never,
    data: { ad, order } as never,
    filePath: path.join(FIXTURES, fixture),
    depth: 0,
    overrideAccess: true,
  }) as Promise<{ id: number; kind: 'foto' | 'video'; filename: string; previa?: string | null }>
}

type SeedConversationInput = { a: number; b: number; apelidoA?: string; apelidoB?: string; assunto?: string }

/** Conversation between two accounts (participantA = lower id). Local API, no checks. */
export async function seedConversation(payload: Payload, input: SeedConversationInput) {
  const [low, high] = input.a < input.b ? [input.a, input.b] : [input.b, input.a]
  const swapped = low !== input.a
  return payload.create({
    collection: 'conversations' as never,
    data: {
      participantA: low,
      participantB: high,
      pairKey: `${low}-${high}`,
      apelidoA: (swapped ? input.apelidoB : input.apelidoA) ?? 'Pessoa A',
      apelidoB: (swapped ? input.apelidoA : input.apelidoB) ?? 'Pessoa B',
      assunto: input.assunto ?? 'Anúncio: teste',
    } as never,
    overrideAccess: true,
  }) as Promise<{ id: number }>
}

export async function seedMessage(
  payload: Payload,
  input: { conversation: number; sender: number; texto?: string; createdAt?: string },
) {
  const created = (await payload.create({
    collection: 'messages' as never,
    data: {
      conversation: input.conversation,
      sender: input.sender,
      texto: input.texto ?? 'Mensagem de teste',
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    } as never,
    overrideAccess: true,
  })) as unknown as { id: number; createdAt: string }
  await payload.update({
    collection: 'conversations' as never,
    id: input.conversation,
    data: { lastMessageAt: created.createdAt, lastSender: input.sender } as never,
    overrideAccess: true,
  })
  return created
}

export async function seedBlock(payload: Payload, input: { blocker: number; blocked: number }) {
  return payload.create({
    collection: 'blocks' as never,
    data: { blocker: input.blocker, blocked: input.blocked, pairKey: `${input.blocker}-${input.blocked}` } as never,
    overrideAccess: true,
  }) as Promise<{ id: number }>
}

/**
 * Creates an account as the WordPress import does (M-03): random unknown password, the old
 * WordPress hash pending in `legacyPasswordHash`, origem 'site-antigo'. Local API with overrideAccess.
 */
export async function seedLegacyAssinante(
  payload: Payload,
  {
    email,
    name,
    hash,
    wpUserId,
    verified = true,
    revisar = false,
  }: { email: string; name: string; hash: string; wpUserId?: number; verified?: boolean; revisar?: boolean },
) {
  const { randomBytes } = await import('node:crypto')
  const created = (await payload.create({
    collection: 'assinantes' as never,
    data: {
      email,
      name,
      password: randomBytes(32).toString('base64url'),
      ...(wpUserId !== undefined ? { wpUserId } : {}),
      origem: 'site-antigo',
      importadoEm: new Date().toISOString(),
      revisarAssinaturaAntiga: revisar,
    } as never,
    overrideAccess: true,
    context: { trustedCreate: true, skipAudit: true },
  })) as unknown as { id: number; email: string; name: string }
  await payload.update({
    collection: 'assinantes' as never,
    id: created.id,
    data: { legacyPasswordHash: hash, ...(verified ? {} : { _verified: false }) } as never,
    overrideAccess: true,
    context: { skipAudit: true },
  })
  return created
}
