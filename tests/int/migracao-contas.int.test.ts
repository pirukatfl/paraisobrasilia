import { createLocalReq, type Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { assinanteEndpoints } from '../../src/lib/assinantes/endpoints'
import { AUDIT_ACTIONS, writeAudit } from '../../src/lib/assinantes/audit'
import { grantOrRenew } from '../../src/lib/assinantes/service'
import { listRevisarSiteAntigo } from '../../src/lib/assinantes/site-antigo'
import { graphql, rest, tokenFor } from '../helpers/rest'
import { getTestPayload, resetDatabase, seedAssinante, seedLegacyAssinante, seedPlan, seedStaffUser } from '../helpers/seed'

// Vectors from 06-RESEARCH §1 (synthetic)
const WP_HASH = '$wp$2y$10$9Q4zpTS2fiTKXOlU7LXUSeIvoh2bfYHnt8hHjrVynU50s9CXKFica'
const PHPASS_HASH = '$P$BMqVaElQIGOM7G/gvip1NrrFWhngog.'
const STAFF = { email: 'staff-migracao@teste.local', password: 'senha-equipe-123' }

describe('conta migrada: campos, hash antigo e marcador (06-04)', () => {
  let payload: Payload
  let staffUser: Record<string, unknown>
  let staffToken: string

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    const u = await seedStaffUser(payload, STAFF)
    staffUser = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
    staffToken = await tokenFor(payload, 'users', STAFF.email, STAFF.password)
  })

  const hashOf = async (id: number) =>
    (
      (await payload.findByID({
        collection: 'assinantes',
        id,
        depth: 0,
        overrideAccess: true,
        showHiddenFields: true,
      })) as unknown as { legacyPasswordHash?: string | null }
    ).legacyPasswordHash ?? null

  const auditRows = async (summary?: string) =>
    (await payload.find({ collection: 'audit-log', depth: 0, overrideAccess: true, limit: 200 })).docs.filter(
      (d) => !summary || d.summary === summary,
    )

  describe('fields and visibility', () => {
    it('seeds a migrated account; wpUserId is unique', async () => {
      const a = await seedLegacyAssinante(payload, { email: 'a@teste.local', name: 'Antiga A', hash: WP_HASH, wpUserId: 2 })
      const doc = await payload.findByID({ collection: 'assinantes', id: a.id, depth: 0, overrideAccess: true })
      expect(doc.origem).toBe('site-antigo')
      expect(doc._verified).toBe(true)
      expect(doc.wpUserId).toBe(2)
      await expect(
        seedLegacyAssinante(payload, { email: 'b@teste.local', name: 'Antiga B', hash: WP_HASH, wpUserId: 2 }),
      ).rejects.toThrow()
    })

    it('the hash is hidden from the Local API unless showHiddenFields', async () => {
      const a = await seedLegacyAssinante(payload, { email: 'a@teste.local', name: 'Antiga A', hash: WP_HASH, wpUserId: 2 })
      const plain = await payload.findByID({ collection: 'assinantes', id: a.id, depth: 0, overrideAccess: true })
      expect('legacyPasswordHash' in plain).toBe(false)
      expect(await hashOf(a.id)).toBe(WP_HASH)
    })

    it('never appears in REST for staff or for the account itself', async () => {
      const a = await seedLegacyAssinante(payload, { email: 'a@teste.local', name: 'Antiga A', hash: WP_HASH, wpUserId: 2 })
      await payload.update({ collection: 'assinantes', id: a.id, data: { password: 'senha-nova-1234' }, overrideAccess: true })
      await seedLegacyAssinante(payload, { email: 'p@teste.local', name: 'Antiga P', hash: PHPASS_HASH, wpUserId: 3 })
      const one = await rest('GET', ['assinantes', String(a.id)], { token: staffToken })
      const list = await rest('GET', ['assinantes'], { token: staffToken, query: '?limit=50&depth=0' })
      expect(one.status).toBe(200)
      expect(list.status).toBe(200)
      for (const r of [one, list]) {
        expect(r.text).not.toContain('legacyPasswordHash')
        expect(r.text).not.toContain('$wp$')
        expect(r.text).not.toContain('$P$')
      }
      // the second account still holds its hash: the list must not leak it
      expect(await hashOf((await payload.find({ collection: 'assinantes', where: { email: { equals: 'p@teste.local' } }, overrideAccess: true })).docs[0]!.id)).toBe(PHPASS_HASH)
    })

    it('no where-query oracle, and GraphQL is off', async () => {
      await seedLegacyAssinante(payload, { email: 'a@teste.local', name: 'Antiga A', hash: WP_HASH, wpUserId: 2 })
      await seedAssinante(payload, { email: 'n@teste.local', name: 'Nova N', password: 'senha-nova-1234' })
      const withHash = await rest('GET', ['assinantes'], { token: staffToken, query: '?where[legacyPasswordHash][exists]=true' })
      const without = await rest('GET', ['assinantes'], { token: staffToken, query: '?where[legacyPasswordHash][exists]=false' })
      const like = await rest('GET', ['assinantes'], { token: staffToken, query: '?where[legacyPasswordHash][like]=$wp' })
      const total = (r: { json: unknown }) => (r.json as { totalDocs?: number } | null)?.totalDocs
      for (const r of [withHash, like]) {
        // either refused, or not dependent on the hidden field
        expect(r.status >= 400 || total(r) === total(without)).toBe(true)
      }
      const gql = await graphql('{ Assinantes { docs { id legacyPasswordHash } } }', staffToken)
      // GraphQL is disabled on this site (T-03-16): there is no schema and no field to ask for
      expect(gql.status).toBe(404)
      expect(gql.text).not.toContain('legacyPasswordHash')
      expect(gql.text).not.toContain('$wp$')
    })

    it('REST create/update cannot set wpUserId, legacyPasswordHash or importadoEm; staff can set the marker', async () => {
      const created = await rest('POST', ['assinantes'], {
        token: staffToken,
        body: {
          email: 'rest@teste.local',
          name: 'Rest',
          password: 'senha-rest-1234',
          wpUserId: 99,
          legacyPasswordHash: WP_HASH,
          importadoEm: '2026-01-01T00:00:00.000Z',
          revisarAssinaturaAntiga: true,
        },
      })
      expect(created.status).toBe(201)
      const id = ((created.json as { doc: { id: number } }).doc).id
      const doc = await payload.findByID({ collection: 'assinantes', id, depth: 0, overrideAccess: true })
      expect(doc.wpUserId ?? null).toBeNull()
      expect(doc.importadoEm ?? null).toBeNull()
      expect(doc.revisarAssinaturaAntiga).toBe(true)
      expect(await hashOf(id)).toBeNull()

      const patched = await rest('PATCH', ['assinantes', String(id)], {
        token: staffToken,
        body: { legacyPasswordHash: WP_HASH, wpUserId: 77 },
      })
      expect(patched.status).toBe(200)
      expect(await hashOf(id)).toBeNull()
      expect((await payload.findByID({ collection: 'assinantes', id, depth: 0, overrideAccess: true })).wpUserId ?? null).toBeNull()
    })

    it('REST create with a password cannot plant a hash either', async () => {
      // password present + hash in the body: the guard overwrites the field with null
      const created = await rest('POST', ['assinantes'], {
        token: staffToken,
        body: { email: 'plant@teste.local', name: 'Plant', password: 'senha-plant-123', legacyPasswordHash: WP_HASH },
      })
      const id = ((created.json as { doc: { id: number } }).doc).id
      expect(await hashOf(id)).toBeNull()
    })

    it('a subscriber cannot read the marker on /me', async () => {
      await seedLegacyAssinante(payload, { email: 'r@teste.local', name: 'Revisar R', hash: WP_HASH, wpUserId: 5, revisar: true })
      const pw = 'senha-revisar-123'
      const acc = (await payload.find({ collection: 'assinantes', where: { email: { equals: 'r@teste.local' } }, overrideAccess: true })).docs[0]!
      await payload.update({ collection: 'assinantes', id: acc.id, data: { password: pw }, overrideAccess: true })
      const token = await tokenFor(payload, 'assinantes', 'r@teste.local', pw)
      const me = await rest('GET', ['assinantes', 'me'], { token })
      expect(me.status).toBe(200)
      expect(me.text).not.toContain('revisarAssinaturaAntiga')
      expect(me.text).not.toContain('legacyPasswordHash')
      expect(me.text).not.toContain('wpUserId')
    })

    it('self sign-up cannot carry migration fields', async () => {
      const prev = process.env.EMAIL_CAPTURE_DIR
      process.env.EMAIL_CAPTURE_DIR = process.env.EMAIL_CAPTURE_DIR ?? '/tmp/paraiso-emails-int'
      try {
        const created = (await payload.create({
          collection: 'assinantes',
          data: {
            email: 'signup@teste.local',
            password: 'senha-signup-123',
            name: 'Signup',
            wpUserId: 55,
            legacyPasswordHash: WP_HASH,
            importadoEm: '2026-01-01T00:00:00.000Z',
            revisarAssinaturaAntiga: true,
            origem: 'site-antigo',
          } as never,
          overrideAccess: true,
          context: { selfSignup: true },
        })) as unknown as { id: number }
        const doc = await payload.findByID({ collection: 'assinantes', id: created.id, depth: 0, overrideAccess: true })
        expect(doc.origem).toBe('cadastro')
        expect(doc.wpUserId ?? null).toBeNull()
        expect(doc.importadoEm ?? null).toBeNull()
        expect(doc.revisarAssinaturaAntiga).toBe(false)
        expect(await hashOf(created.id)).toBeNull()
      } finally {
        process.env.EMAIL_CAPTURE_DIR = prev
        if (prev === undefined) delete process.env.EMAIL_CAPTURE_DIR
      }
    })
  })

  describe('a new password always erases the old hash (T-06-12)', () => {
    it('staff REST PATCH with a password', async () => {
      const a = await seedLegacyAssinante(payload, { email: 'a@teste.local', name: 'Antiga A', hash: WP_HASH, wpUserId: 2 })
      expect(await hashOf(a.id)).toBe(WP_HASH)
      const res = await rest('PATCH', ['assinantes', String(a.id)], { token: staffToken, body: { password: 'nova-senha-123' } })
      expect(res.status).toBe(200)
      expect(await hashOf(a.id)).toBeNull()
    })

    it('the subscriber changing the own password (Local API with the principal)', async () => {
      const a = await seedLegacyAssinante(payload, { email: 'a@teste.local', name: 'Antiga A', hash: WP_HASH, wpUserId: 2 })
      await payload.update({
        collection: 'assinantes',
        id: a.id,
        data: { password: 'nova-senha-456' },
        user: { id: a.id, collection: 'assinantes', email: a.email } as never,
        // as trocarSenha does: the principal is the subscriber, access checks are done by the action
        overrideAccess: true,
      })
      expect(await hashOf(a.id)).toBeNull()
    })

    it('overrideAccess update with a password (the rehash path of 06-05)', async () => {
      const a = await seedLegacyAssinante(payload, { email: 'a@teste.local', name: 'Antiga A', hash: PHPASS_HASH, wpUserId: 2 })
      await payload.update({ collection: 'assinantes', id: a.id, data: { password: 'nova-senha-789' }, overrideAccess: true })
      expect(await hashOf(a.id)).toBeNull()
    })

    it('an update without a password keeps the hash', async () => {
      const a = await seedLegacyAssinante(payload, { email: 'a@teste.local', name: 'Antiga A', hash: WP_HASH, wpUserId: 2 })
      await payload.update({ collection: 'assinantes', id: a.id, data: { name: 'Outro Nome' }, overrideAccess: true })
      expect(await hashOf(a.id)).toBe(WP_HASH)
    })
  })

  describe('audit', () => {
    it('never records the hash, and accepts the two new actions', async () => {
      const created = await payload.create({
        collection: 'assinantes',
        data: { email: 'aud@teste.local', name: 'Aud', password: 'senha-aud-1234' },
        overrideAccess: true,
        context: { trustedCreate: true },
      })
      await payload.update({
        collection: 'assinantes',
        id: created.id,
        data: { legacyPasswordHash: WP_HASH },
        overrideAccess: true,
      })
      await payload.update({ collection: 'assinantes', id: created.id, data: { password: 'senha-aud-5678' }, overrideAccess: true })
      const req = await createLocalReq({ user: staffUser as never }, payload)
      await writeAudit(req, { action: 'conta-importada', assinante: created, summary: 'Conta importada (teste)' })
      await writeAudit(req, { action: 'senha-migrada', assinante: created, summary: 'Senha convertida (teste)' })
      expect(AUDIT_ACTIONS.map((a) => a.value)).toEqual(expect.arrayContaining(['conta-importada', 'senha-migrada']))
      const all = JSON.stringify(await auditRows())
      expect(all).not.toContain('$wp$')
      expect(all).not.toContain('$P$')
      expect(all).not.toContain('legacyPasswordHash')
      expect((await auditRows()).some((r) => r.action === 'conta-importada')).toBe(true)
    })
  })

  describe('marker "Assinante antigo sem data de vencimento"', () => {
    const SUM_CLEARED = 'Aviso "assinante antigo sem data de vencimento" removido: assinatura definida pela equipe'
    const SUM_DISMISSED = 'Aviso "assinante antigo sem data de vencimento" dispensado'

    async function seedThree() {
      const b = await seedLegacyAssinante(payload, { email: 'b@teste.local', name: 'Beta Revisar', hash: WP_HASH, wpUserId: 11, revisar: true })
      const a = await seedLegacyAssinante(payload, { email: 'a@teste.local', name: 'Alfa Revisar', hash: WP_HASH, wpUserId: 12, revisar: true })
      const c = await seedLegacyAssinante(payload, { email: 'c@teste.local', name: 'Gama Livre', hash: WP_HASH, wpUserId: 13, revisar: false })
      return { a, b, c }
    }

    it('listRevisarSiteAntigo returns only flagged accounts by name', async () => {
      await seedThree()
      const { total, rows } = await listRevisarSiteAntigo(payload)
      expect(total).toBe(2)
      expect(rows.map((r) => r.name)).toEqual(['Alfa Revisar', 'Beta Revisar'])
      expect(rows.every((r) => r.contaTipo === 'Gratuita')).toBe(true)
    })

    it('contaTipo explains the marker for staff', async () => {
      const { a, c } = await seedThree()
      const flagged = await payload.findByID({ collection: 'assinantes', id: a.id, depth: 0, user: staffUser as never, overrideAccess: false })
      expect(flagged.contaTipo).toBe('Gratuita · assinante antigo sem data de vencimento')
      const free = await payload.findByID({ collection: 'assinantes', id: c.id, depth: 0, user: staffUser as never, overrideAccess: false })
      expect(free.contaTipo).toBe('Gratuita')
    })

    it('staff REST filter finds exactly the flagged accounts', async () => {
      await seedThree()
      const res = await rest('GET', ['assinantes'], { token: staffToken, query: '?where[revisarAssinaturaAntiga][equals]=true&limit=50' })
      const emails = ((res.json as { docs: { email: string }[] }).docs).map((d) => d.email).sort()
      expect(emails).toEqual(['a@teste.local', 'b@teste.local'])
    })

    it('liberar clears the marker and audits it', async () => {
      const { a, c } = await seedThree()
      const plan = await seedPlan(payload, { name: 'Mensal', durationDays: 30, price: 30, order: 1 })
      const req = await createLocalReq({ user: staffUser as never }, payload)
      await grantOrRenew(payload, { assinanteId: a.id, planId: plan.id, method: 'pix', req })
      expect((await payload.findByID({ collection: 'assinantes', id: a.id, depth: 0, overrideAccess: true })).revisarAssinaturaAntiga).toBe(false)
      expect(await auditRows(SUM_CLEARED)).toHaveLength(1)
      // an unflagged account gets no such row
      await grantOrRenew(payload, { assinanteId: c.id, planId: plan.id, method: 'pix', req })
      expect(await auditRows(SUM_CLEARED)).toHaveLength(1)
    })

    it('a period created directly in the admin clears the marker', async () => {
      const { b } = await seedThree()
      await payload.create({
        collection: 'subscriptions',
        data: {
          assinante: b.id,
          startsAt: new Date().toISOString(),
          endsAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
          payment: { method: 'cortesia', amount: 0 },
        } as never,
        user: staffUser as never,
        overrideAccess: false,
      })
      expect((await payload.findByID({ collection: 'assinantes', id: b.id, depth: 0, overrideAccess: true })).revisarAssinaturaAntiga).toBe(false)
      expect(await auditRows(SUM_CLEARED)).toHaveLength(1)
    })

    describe('dispensar-aviso-site-antigo endpoint', () => {
      const handler = assinanteEndpoints.find((e) => e.path === '/:id/dispensar-aviso-site-antigo' && e.method === 'post')!.handler

      async function call(id: number, user: unknown) {
        const req = await createLocalReq({ user: user as never }, payload)
        req.routeParams = { id: String(id) }
        ;(req as unknown as { json: () => Promise<unknown> }).json = async () => ({})
        const res = await handler(req)
        return res.status
      }

      it('staff dismiss it, audited', async () => {
        const { a } = await seedThree()
        expect(await call(a.id, staffUser)).toBe(200)
        expect((await payload.findByID({ collection: 'assinantes', id: a.id, depth: 0, overrideAccess: true })).revisarAssinaturaAntiga).toBe(false)
        expect(await auditRows(SUM_DISMISSED)).toHaveLength(1)
      })

      it('subscribers and anonymous callers are refused', async () => {
        const { a, b } = await seedThree()
        expect(await call(a.id, { ...b, collection: 'assinantes' })).toBe(403)
        expect(await call(a.id, null)).toBe(403)
        expect((await payload.findByID({ collection: 'assinantes', id: a.id, depth: 0, overrideAccess: true })).revisarAssinaturaAntiga).toBe(true)
      })

      it('a foreign Origin is refused by the proxy before the route', async () => {
        const { a } = await seedThree()
        const { proxy } = await import('../../src/proxy')
        const { NextRequest } = await import('next/server')
        const req = new NextRequest(`http://localhost:3000/api/assinantes/${a.id}/dispensar-aviso-site-antigo`, {
          method: 'POST',
          headers: { origin: 'https://evil.example', host: 'localhost:3000' },
        })
        const res = await proxy(req)
        expect(res.status).toBe(403)
      })
    })
  })
})
