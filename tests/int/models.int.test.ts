import path from 'path'
import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { backfillModelSlugs } from '../../src/lib/gallery/model-slug'
import {
  getPublishedModel,
  getPublishedModels,
  hasPublishedModels,
  toModelCardDTO,
} from '../../src/lib/gallery/queries'
import type { Model } from '../../src/payload-types'
import { expectFieldError } from '../helpers/errors'
import { getTestPayload, resetDatabase, seedAssinante, seedModel, seedStaffUser } from '../helpers/seed'

const FIXTURE = path.resolve('tests/fixtures/flyer-square.jpg')
const CONTACT = 'Tire telefone, WhatsApp, e-mail, @ e links: esta página é aberta ao público.'

describe('models (MIDIA-06/07, PAINEL-09, G-01..G-06, D-09)', () => {
  let payload: Payload
  let mediaId: number
  let staff: Record<string, unknown> & { collection: 'users' }
  let sub: Record<string, unknown> & { collection: 'assinantes' }

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    const media = await payload.create({ collection: 'media', data: { alt: 'foto' }, filePath: FIXTURE, overrideAccess: true })
    mediaId = media.id
    const u = await seedStaffUser(payload, { email: 'staff-modelos@teste.local', password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
    const s = await seedAssinante(payload, { email: 'sub-modelos@teste.local', password: 'senha-assinante-1', name: 'Sub Modelos' })
    sub = { ...(s as unknown as Record<string, unknown>), collection: 'assinantes' }
  })

  const rows = (n: number) => Array.from({ length: n }, () => ({ image: mediaId }))
  const create = (data: Record<string, unknown>) =>
    payload.create({
      collection: 'models',
      overrideAccess: false,
      user: staff as never,
      data: { name: 'Modelo', photos: rows(1), _status: 'published', ...data } as never,
    })

  it('rejects a 31st photo with the Portuguese message; accepts 30; rejects zero', async () => {
    await expectFieldError(create({ name: 'Trinta e uma', photos: rows(31) }), 'Cada modelo pode ter no máximo 30 fotos.')
    const ok = await create({ name: 'Trinta', photos: rows(30) })
    expect(ok._status).toBe('published')
    expect(ok.photos).toHaveLength(30)
    await expect(create({ name: 'Nenhuma', photos: [] })).rejects.toThrow()
  })

  it('creates the slug from the name, suffixes duplicates and validates staff-typed slugs', async () => {
    await resetDatabase(payload)
    const a = await create({ name: 'Luna Clara' })
    expect(a.slug).toBe('luna-clara')
    const b = await create({ name: 'Luna Clara' })
    expect(b.slug).toBe('luna-clara-2')
    await expectFieldError(create({ name: 'Outra', slug: 'Luna Clara!' }), 'Use só letras minúsculas, números e hífens.')
    await expectFieldError(create({ name: 'Outra', slug: 'luna-clara' }), 'Já existe uma modelo com este endereço.')

    // a model whose slug was cleared (legacy row) gets one again on the next save
    await payload.db.drizzle.execute(sql`update models set slug = null where id = ${a.id}`)
    const updated = await payload.update({
      collection: 'models',
      id: a.id,
      overrideAccess: false,
      user: staff as never,
      data: { order: 5 } as never,
    })
    expect(updated.slug).toMatch(/^luna-clara(-\d+)?$/)
  })

  it('refuses contacts in the name and in the description; description is capped at 300', async () => {
    await expectFieldError(create({ name: 'Zap', description: 'Chama no zap 61 99999-8888' }), CONTACT)
    await expectFieldError(create({ name: 'Luna @lunabsb' }), CONTACT)
    await expectFieldError(create({ name: 'Mail', description: 'escreva para luna@exemplo.com' }), CONTACT)
    await expect(create({ name: 'Longa', description: 'a'.repeat(301) })).rejects.toThrow()
    const ok = await create({ name: 'Simples', description: 'Ruiva, simpática e muito animada.' })
    expect(ok.description).toBe('Ruiva, simpática e muito animada.')
  })

  it('backfillModelSlugs fills empty slugs from the name (suffix on clash) and is idempotent', async () => {
    await resetDatabase(payload)
    await create({ name: 'Aurora' })
    await create({ name: 'Aurora' })
    await payload.db.drizzle.execute(sql`update models set slug = null`)
    await payload.db.drizzle.execute(sql`update _models_v set version_slug = null`)

    expect(await backfillModelSlugs(payload.db.drizzle)).toBe(2)
    const { docs } = await payload.find({ collection: 'models', overrideAccess: true, depth: 0, sort: 'id' })
    expect(docs.map((d) => d.slug)).toEqual(['aurora', 'aurora-2'])
    const versions = await payload.db.drizzle.execute(sql`select version_slug from _models_v where version_slug is not null`)
    expect(versions.rows.length).toBeGreaterThan(0)
    expect(await backfillModelSlugs(payload.db.drizzle)).toBe(0)
  })

  it('anonymous reads: published only, no authorization; subscriber cannot read versions, staff can', async () => {
    await resetDatabase(payload)
    await seedModel(payload, { name: 'Rascunho', photoCount: 1, published: false, authorization: { note: 'nota privada' } })
    expect(await hasPublishedModels()).toBe(false)

    await seedModel(payload, {
      name: 'Aurora',
      photoCount: 3,
      description: 'Ruiva, simpática e muito animada.',
      authorization: { date: '2026-10-12T12:00:00.000Z', note: 'enviou por WhatsApp' },
    })
    expect(await hasPublishedModels()).toBe(true)

    const { docs } = await payload.find({ collection: 'models', overrideAccess: false, depth: 0 })
    expect(docs.map((d) => d.name)).toEqual(['Aurora'])
    expect(docs[0]).not.toHaveProperty('imageAuthorization')

    await expect(
      payload.findVersions({ collection: 'models', overrideAccess: false, user: sub as never }),
    ).rejects.toThrow(/permiss|forbidden|not allowed/i)
    const staffVersions = await payload.findVersions({ collection: 'models', overrideAccess: false, user: staff as never })
    expect(staffVersions.docs.length).toBeGreaterThan(0)
  })

  it('card and page DTOs: slug, cover, counts, photo items; drafts and bad slugs are null', async () => {
    const models = await getPublishedModels()
    expect(models).toHaveLength(1)
    expect(models[0].name).toBe('Aurora')
    expect(models[0].slug).toBe('aurora')
    expect(models[0].photoCount).toBe(3)
    expect(models[0].videoCount).toBe(0)
    expect(models[0].cover.thumbUrl).toMatch(/\.webp$/)

    const page = await getPublishedModel('aurora')
    expect(page?.name).toBe('Aurora')
    expect(page?.description).toBe('Ruiva, simpática e muito animada.')
    expect(page?.items).toHaveLength(page?.photoCount ?? -1)
    expect(page?.items.every((i) => i.kind === 'photo')).toBe(true)

    expect(await getPublishedModel('rascunho')).toBeNull()
    expect(await getPublishedModel('../x')).toBeNull()
    expect(await getPublishedModel('nao-existe')).toBeNull()
  })

  it('anonymous visitors cannot create or update models', async () => {
    await expect(
      payload.create({ collection: 'models', overrideAccess: false, data: { name: 'x', photos: [{ image: mediaId }] } }),
    ).rejects.toThrow(/permiss|forbidden|not allowed/i)
  })

  it('photo alt falls back to "{name} — modelo do Paraíso Brasília"', () => {
    const dto = toModelCardDTO({
      id: 1,
      name: 'Luna',
      slug: 'luna',
      updatedAt: '2026-10-23T00:00:00.000Z',
      photos: [{ image: { id: 9, alt: '', url: '/api/media/file/x.webp', width: 800, height: 1000 } }],
    } as unknown as Model)
    expect(dto?.cover.alt).toBe('Luna — modelo do Paraíso Brasília')
  })
})
