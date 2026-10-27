import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import sharp from 'sharp'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { findMemberAd, findPublicAds } from '../../src/lib/classisex/board'
import { toMemberAdDTO, toPublicAdDTO } from '../../src/lib/classisex/dto'
import { loadMoreAds } from '../../src/lib/classisex/more'
import type { AdInput } from '../../src/lib/classisex/rules'
import {
  createAd,
  getModerationView,
  getOwnAdFormValues,
  listOwnAds,
  updateAd,
  ServiceError,
} from '../../src/lib/classisex/service'
import { createVisitorAd } from '../../src/lib/classisex/visitante'
import { rest, tokenFor } from '../helpers/rest'
import { getTestPayload, resetDatabase, seedAd, seedAdCategories, seedAssinante, seedStaffUser, seedSubscription } from '../helpers/seed'
import { expectFieldError } from '../helpers/errors'
import { AD_MESSAGES } from '../../src/lib/classisex/rules'

const NOW = new Date('2026-10-27T15:00:00.000Z')
const DAY = 86_400_000

// Client request 2026-10-27: e-mail, links to other platforms and "how they prefer to be contacted"
const EMAIL = 'casal.perfil@exemplo.net'
const LINK_1 = 'https://instagram.com/casal_perfil_unico'
const LINK_2 = 'https://onlyfans.com/casal_of_unico'
const OBS = 'Só mensagem, depois das 18h secreta'
const SECRETS = [EMAIL, 'casal_perfil_unico', 'casal_of_unico', 'depois das 18h secreta', 'instagram.com', 'onlyfans.com']

const jpeg = () => sharp({ create: { width: 900, height: 700, channels: 3, background: { r: 90, g: 120, b: 60 } } }).jpeg().toBuffer()

describe('ClassiSex extra contacts: e-mail, links and observation (2026-10-27)', () => {
  let payload: Payload
  let casal: number
  let staffReq: PayloadRequest

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    const { docs } = await payload.find({ collection: 'ad-categories', sort: 'order', limit: 1, overrideAccess: true })
    casal = docs[0].id as number
    const u = await seedStaffUser(payload, { email: 'staff-mc@teste.local', password: 'senha-equipe-123' })
    staffReq = await createLocalReq({ user: { ...(u as unknown as Record<string, unknown>), collection: 'users' } as never }, payload)
  })

  const input = (over: Partial<AdInput> = {}): AdInput => ({
    apelido: 'Casal Perfil',
    euSou: casal,
    cidade: 'Brasília',
    texto: 'Casal simpático procura amigos para a próxima festa.',
    whatsapp: '5561999889772',
    telegram: '',
    emailContato: `  ${EMAIL.toUpperCase()} `,
    links: ['instagram.com/casal_perfil_unico', '', LINK_2, LINK_1],
    observacao: `  ${OBS}  `,
    consent: true,
    ...over,
  })

  const stored = (id: number) =>
    payload.findByID({ collection: 'ads', id, depth: 0, overrideAccess: true }) as unknown as Promise<{
      contato?: { email?: string | null; links?: { url: string }[] | null; observacao?: string | null }
    }>

  const paying = async (email: string) => {
    const acc = await seedAssinante(payload, { email, password: 'senha-teste-1234', name: email.split('@')[0] })
    await seedSubscription(payload, {
      assinanteId: acc.id,
      startsAt: new Date(NOW.getTime() - DAY).toISOString(),
      endsAt: new Date(NOW.getTime() + 30 * DAY).toISOString(),
    })
    return acc
  }

  it('a subscriber ad keeps the contacts normalised (https added, empties and repeats dropped)', async () => {
    const owner = await paying('dono-mc@teste.local')
    const { id } = await createAd(payload, { assinanteId: owner.id, input: input(), now: NOW })
    const doc = await stored(id)
    expect(doc.contato?.email).toBe(EMAIL)
    expect((doc.contato?.links ?? []).map((l) => l.url)).toEqual([LINK_1, LINK_2])
    expect(doc.contato?.observacao).toBe(OBS)
  })

  it('refuses an invalid contact e-mail, a javascript: link, too many links and a long observation', async () => {
    const owner = await paying('dono-mc2@teste.local')
    const refused = async (over: Partial<AdInput>) => {
      const err = await createAd(payload, { assinanteId: owner.id, input: input(over), now: NOW }).then(
        () => null,
        (e: unknown) => e,
      )
      expect(err).toBeInstanceOf(ServiceError)
      return (err as ServiceError).errors as Record<string, string>
    }
    expect((await refused({ emailContato: 'nao-e-email' })).emailContato).toBe(AD_MESSAGES.emailContato)
    expect((await refused({ links: ['javascript:alert(1)'] })).links).toContain(AD_MESSAGES.link)
    expect((await refused({ links: ['data:text/html,x'] })).links).toContain(AD_MESSAGES.link)
    expect((await refused({ links: Array.from({ length: 6 }, (_, i) => `exemplo.com/${i}`) })).links).toBe(AD_MESSAGES.linksDemais)
    expect((await refused({ observacao: 'a'.repeat(121) })).observacao).toBe(AD_MESSAGES.observacaoLonga)
    expect((await payload.count({ collection: 'ads', overrideAccess: true })).totalDocs).toBe(0)
  })

  it('an ad sent without an account keeps them too', async () => {
    const { id } = await createVisitorAd(payload, {
      input: input(),
      email: 'visitante-mc@exemplo.com',
      termos: true,
      website: '',
      files: [{ data: await jpeg(), mimetype: 'image/jpeg', name: 'foto.jpg', size: 1000 }],
      ip: '203.0.113.250',
      now: NOW,
    })
    const doc = await stored(id!)
    // The visitor's own e-mail (staff only) and the contact e-mail are different things
    expect(doc.contato?.email).toBe(EMAIL)
    expect((doc.contato?.links ?? []).map((l) => l.url)).toEqual([LINK_1, LINK_2])
    const raw = (await payload.findByID({ collection: 'ads', id: id!, depth: 0, overrideAccess: true })) as unknown as { emailVisitante?: string }
    expect(raw.emailVisitante).toBe('visitante-mc@exemplo.com')
  })

  it('editing by the owner shows the values back in the form and in Meus anúncios', async () => {
    const owner = await paying('dono-mc3@teste.local')
    const { id } = await createAd(payload, { assinanteId: owner.id, input: input(), now: NOW })
    const form = await getOwnAdFormValues(payload, owner.id, id)
    expect(form).toMatchObject({ emailContato: EMAIL, links: [LINK_1, LINK_2], observacao: OBS })
    await updateAd(payload, { assinanteId: owner.id, id, input: input({ emailContato: '', links: [], observacao: '' }), now: NOW })
    expect((await stored(id)).contato).toMatchObject({ email: null, observacao: null })
    const own = await listOwnAds(payload, owner.id, NOW)
    expect(own[0]?.contato).toMatchObject({ email: null, links: [], observacao: null })
  })

  it('members get the mailto button, one labelled button per link and the note; the public DTO never reads them', async () => {
    const owner = await paying('dono-mc4@teste.local')
    const ad = await seedAd(payload, {
      author: owner.id,
      status: 'aprovado',
      contato: { whatsapp: '5561999990000', email: EMAIL, links: [{ url: LINK_1 }, { url: LINK_2 }], observacao: OBS },
    })
    const member = await findMemberAd(payload, ad.id, NOW)
    expect(member?.contato.email).toEqual({ label: EMAIL, href: `mailto:${EMAIL}` })
    expect(member?.contato.links).toEqual([
      { label: 'Instagram', href: LINK_1 },
      { label: 'OnlyFans', href: LINK_2 },
    ])
    expect(member?.contato.observacao).toBe(OBS)

    const doc = await payload.findByID({ collection: 'ads', id: ad.id, depth: 0, overrideAccess: true })
    const json = JSON.stringify(toPublicAdDTO(doc as never, { euSouLabel: 'Casal' }))
    for (const secret of SECRETS) expect(json).not.toContain(secret)
    expect(toMemberAdDTO(doc as never, { euSouLabel: 'Casal', authorTier: 'assinante' }).contato.links).toHaveLength(2)
  })

  it('free and expired accounts, visitors and the anonymous API never receive the new contacts', async () => {
    const owner = await paying('dono-mc5@teste.local')
    await seedAd(payload, {
      author: owner.id,
      status: 'aprovado',
      texto: 'Casal simpático procura amigos para a próxima festa.',
      contato: { whatsapp: '5561999990000', telegram: 'tg_mc_unico', email: EMAIL, links: [{ url: LINK_1 }], observacao: OBS },
    })
    // The viewers: a free account (never paid) and an expired subscriber. Neither has active access,
    // so the pages and the "load more" action give them the open (public) read model only.
    const free = await seedAssinante(payload, { email: 'livre-mc@teste.local', password: 'senha-livre-1234', name: 'Livre' })
    const expired = await seedAssinante(payload, { email: 'vencida-mc@teste.local', password: 'senha-venc-12345', name: 'Vencida' })
    await seedSubscription(payload, {
      assinanteId: expired.id,
      startsAt: new Date(NOW.getTime() - 40 * DAY).toISOString(),
      endsAt: new Date(NOW.getTime() - 5 * DAY).toISOString(),
    })

    // The open board (visitors, free accounts and expired subscribers) and the load-more of those audiences
    const open = JSON.stringify([await findPublicAds(payload, {}, NOW), await loadMoreAds(payload, false, { page: 1 }, NOW)])
    for (const secret of [...SECRETS, 'tg_mc_unico', '5561999990000', '"contato"', '"links"', '"observacao"']) expect(open).not.toContain(secret)

    // Control: the active-subscriber read model does carry them
    const members = JSON.stringify(await loadMoreAds(payload, true, { page: 1 }, NOW))
    for (const secret of [EMAIL, 'casal_perfil_unico', 'depois das 18h secreta']) expect(members).toContain(secret)

    // REST: anonymous, free account and expired subscriber get no ad documents at all (staff-only collection)
    const tokens = [
      undefined,
      await tokenFor(payload, 'assinantes', 'livre-mc@teste.local', 'senha-livre-1234'),
      await tokenFor(payload, 'assinantes', 'vencida-mc@teste.local', 'senha-venc-12345'),
    ]
    for (const token of tokens) {
      for (const slug of [['ads'], ['ads', '1']]) {
        const res = await rest('GET', slug, { token, query: '?depth=2&limit=100' })
        if (res.status === 200) {
          const docs = (res.json as { docs?: unknown[] } | null)?.docs
          if (docs) expect(docs).toHaveLength(0)
        } else {
          expect([401, 403, 404]).toContain(res.status)
        }
        for (const secret of SECRETS) expect(res.text).not.toContain(secret)
      }
    }
    expect(free.id).not.toBe(expired.id)
  })

  it('staff see them in the moderation view and the admin validates them like the form does', async () => {
    const owner = await paying('dono-mc6@teste.local')
    const ad = await seedAd(payload, { author: owner.id, contato: { email: EMAIL, links: [{ url: LINK_1 }], observacao: OBS } })
    const view = await getModerationView(staffReq, ad.id)
    expect(view.contato).toMatchObject({ email: EMAIL, links: [LINK_1], observacao: OBS })
    // The redacted public texts shown to staff never include them
    expect(JSON.stringify([view.publicApelido, view.publicCidade, view.publicTexto])).not.toContain(EMAIL)

    // Panel edit: normalised like the form
    await payload.update({
      collection: 'ads',
      id: ad.id,
      data: { contato: { email: ' OUTRO@Exemplo.com ', links: [{ url: 'x.com/casal' }, { url: '' }], observacao: '  ok  ' } } as never,
      overrideAccess: true,
      req: staffReq,
    })
    expect((await stored(ad.id)).contato).toMatchObject({ email: 'outro@exemplo.com', links: [{ url: 'https://x.com/casal' }], observacao: 'ok' })

    // Panel edit with a bad link, a bad e-mail and too many links is refused
    await expectFieldError(
      payload.update({ collection: 'ads', id: ad.id, data: { contato: { links: [{ url: 'javascript:alert(1)' }] } } as never, overrideAccess: true, req: staffReq }),
      AD_MESSAGES.link,
    )
    await expectFieldError(
      payload.update({ collection: 'ads', id: ad.id, data: { contato: { email: 'sem-arroba' } } as never, overrideAccess: true, req: staffReq }),
      AD_MESSAGES.emailContato,
    )
    await expect(
      payload.update({
        collection: 'ads',
        id: ad.id,
        data: { contato: { links: Array.from({ length: 6 }, (_, i) => ({ url: `https://exemplo.com/${i}` })) } } as never,
        overrideAccess: true,
        req: staffReq,
      }),
    ).rejects.toThrow()
    expect((await stored(ad.id)).contato?.links).toEqual([expect.objectContaining({ url: 'https://x.com/casal' })])
  })
})
