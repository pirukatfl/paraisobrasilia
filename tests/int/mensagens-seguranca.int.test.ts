import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { messageReportEndpoints } from '../../src/lib/mensagens/endpoints'
import {
  blockState,
  blockUser,
  getMessageReportCounts,
  reportConversation,
  resolveMessageReport,
  sendMessage,
  startConversation,
  unblockUser,
} from '../../src/lib/mensagens/service'
import {
  getTestPayload,
  resetDatabase,
  seedAd,
  seedAdCategories,
  seedAssinante,
  seedBlock,
  seedConversation,
  seedMessage,
  seedStaffUser,
  seedSubscription,
} from '../helpers/seed'

const DAY = 86_400_000
const NOW = new Date()
const DENIED = /permiss|forbidden|not allowed/i
const NEUTRAL = 'Não é possível mandar recados para esta pessoa.'

describe('message safety (REC-03, T-05-07, T-05-09, T-05-11, T-05-28, T-05-29)', () => {
  let payload: Payload
  let a: { id: number }
  let b: { id: number }
  let c: { id: number }
  let conv: { id: number }
  let staff: Record<string, unknown>
  let staffReq: PayloadRequest

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  async function person(email: string, name: string) {
    const acc = await seedAssinante(payload, { email, password: 'senha-seguranca-123', name })
    await seedSubscription(payload, {
      assinanteId: acc.id,
      startsAt: new Date(NOW.getTime() - DAY).toISOString(),
      endsAt: new Date(NOW.getTime() + 60 * DAY).toISOString(),
    })
    return acc
  }

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    a = await person('a@teste.local', 'Ana')
    b = await person('b@teste.local', 'Beto')
    c = await person('c@teste.local', 'Cris')
    conv = await seedConversation(payload, { a: a.id, b: b.id, apelidoA: 'Ana', apelidoB: 'Beto' })
    await seedMessage(payload, { conversation: conv.id, sender: a.id, texto: 'Oi Beto' })
    await seedMessage(payload, { conversation: conv.id, sender: b.id, texto: 'Oi Ana' })
    const u = await seedStaffUser(payload, { email: 'staff-seg@teste.local', password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
    staffReq = await createLocalReq({ user: staff as never }, payload)
  })

  const audit = async (action: string) =>
    (await payload.find({ collection: 'audit-log', where: { action: { equals: action } }, depth: 0, overrideAccess: true })).docs

  describe('blocks', () => {
    it('stop both directions with the right messages, are idempotent, and unblock restores', async () => {
      await blockUser(payload, { me: a.id, conversationId: conv.id })
      await blockUser(payload, { me: a.id, conversationId: conv.id })
      expect((await payload.count({ collection: 'blocks', overrideAccess: true })).totalDocs).toBe(1)
      expect(await blockState(payload, a.id, b.id)).toEqual({ euBloqueei: true, fuiBloqueado: false })
      expect(await blockState(payload, b.id, a.id)).toEqual({ euBloqueei: false, fuiBloqueado: true })

      const toA = await sendMessage(payload, { senderId: b.id, conversationId: conv.id, texto: 'oi?', now: NOW }).catch((e) => e)
      expect(toA).toMatchObject({ code: 'bloqueado', status: 403, message: NEUTRAL })
      const fromA = await sendMessage(payload, { senderId: a.id, conversationId: conv.id, texto: 'oi?', now: NOW }).catch((e) => e)
      expect(fromA).toMatchObject({ code: 'voceBloqueou', status: 403 })

      await unblockUser(payload, { me: a.id, conversationId: conv.id })
      await expect(sendMessage(payload, { senderId: b.id, conversationId: conv.id, texto: 'agora vai', now: NOW })).resolves.toBeTruthy()
    })

    it('a blocked person cannot start a new conversation with the blocker', async () => {
      const ad = await seedAd(payload, { author: a.id, status: 'aprovado', apelido: 'AnaBSB' })
      await seedBlock(payload, { blocker: a.id, blocked: c.id })
      const before = (await payload.count({ collection: 'conversations', overrideAccess: true })).totalDocs
      await expect(
        startConversation(payload, { senderId: c.id, id: ad.id, texto: 'oi', apelido: 'Cris', now: NOW }),
      ).rejects.toMatchObject({ code: 'bloqueado', message: NEUTRAL })
      expect((await payload.count({ collection: 'conversations', overrideAccess: true })).totalDocs).toBe(before)
    })

    it('only participants can block through a conversation', async () => {
      await expect(blockUser(payload, { me: c.id, conversationId: conv.id })).rejects.toMatchObject({ status: 404 })
    })

    it('blocks are closed for everybody including staff and hidden in the admin', async () => {
      await seedBlock(payload, { blocker: a.id, blocked: b.id })
      for (const user of [undefined, { ...a, collection: 'assinantes' }, staff]) {
        const as = { overrideAccess: false, ...(user ? { user: user as never } : {}) }
        await expect(payload.find({ collection: 'blocks', ...as })).rejects.toThrow(DENIED)
        await expect(payload.create({ collection: 'blocks', data: { blocker: a.id, blocked: c.id, pairKey: 'x' }, ...as })).rejects.toThrow(DENIED)
      }
      expect(payload.collections.blocks.config.admin?.hidden).toBe(true)
    })
  })

  describe('reports', () => {
    it('snapshots the last 20 messages, rejects a duplicate while open and flags minors as urgent', async () => {
      for (let i = 0; i < 25; i++) await seedMessage(payload, { conversation: conv.id, sender: i % 2 ? a.id : b.id, texto: `linha ${i}` })
      const { id } = await reportConversation(payload, {
        me: b.id,
        conversationId: conv.id,
        motivo: 'assedio',
        detalhes: 'Insiste muito',
        now: NOW,
      })
      const report = await payload.findByID({ collection: 'message-reports', id, depth: 0, overrideAccess: true })
      expect(report).toMatchObject({ reporter: b.id, reported: a.id, reportedApelido: 'Ana', status: 'aberta', urgente: false })
      const lines = String(report.mensagens).split('\n')
      expect(lines).toHaveLength(20)
      expect(lines[19]).toMatch(/^(Ana|Beto) · \d{2}\/\d{2} \d{2}:\d{2}: linha 24$/)
      expect(String(report.mensagens)).not.toContain('Oi Beto')
      await expect(
        reportConversation(payload, { me: b.id, conversationId: conv.id, motivo: 'spam', now: NOW }),
      ).rejects.toMatchObject({ code: 'duplicada', message: 'Você já denunciou esta conversa. A equipe vai analisar.' })
      expect(await getMessageReportCounts(payload)).toEqual({ abertas: 1, urgentes: 0 })
    })

    it('a third subscriber cannot report a conversation they are not in; bad reasons are rejected', async () => {
      await expect(
        reportConversation(payload, { me: c.id, conversationId: conv.id, motivo: 'assedio', now: NOW }),
      ).rejects.toMatchObject({ status: 404 })
      await expect(
        reportConversation(payload, { me: b.id, conversationId: conv.id, motivo: 'inventado', now: NOW }),
      ).rejects.toMatchObject({ status: 400 })
      await expect(
        reportConversation(payload, { me: b.id, conversationId: conv.id, motivo: 'assedio', detalhes: 'x'.repeat(501), now: NOW }),
      ).rejects.toMatchObject({ status: 400 })
    })

    it('limits reports to 10 per São Paulo day', async () => {
      for (let i = 0; i < 10; i++) {
        const other = await person(`o${i}@teste.local`, `O${i}`)
        const cv = await seedConversation(payload, { a: b.id, b: other.id })
        await seedMessage(payload, { conversation: cv.id, sender: other.id })
        await reportConversation(payload, { me: b.id, conversationId: cv.id, motivo: 'spam', now: NOW })
      }
      await expect(
        reportConversation(payload, { me: b.id, conversationId: conv.id, motivo: 'spam', now: NOW }),
      ).rejects.toMatchObject({ status: 429, message: 'Você fez muitas denúncias hoje. Tente amanhã.' })
    })

    it('"bloquear" also blocks the other person', async () => {
      await reportConversation(payload, { me: b.id, conversationId: conv.id, motivo: 'ofensivo', bloquear: true, now: NOW })
      expect((await blockState(payload, b.id, a.id)).euBloqueei).toBe(true)
    })

    it('a report of a minor is urgent and suspends the reported messaging at once, with an audit row', async () => {
      const { suspended, id } = await reportConversation(payload, {
        me: b.id,
        conversationId: conv.id,
        motivo: 'menor-de-idade',
        now: NOW,
      })
      expect(suspended).toBe(true)
      expect((await payload.findByID({ collection: 'message-reports', id, depth: 0, overrideAccess: true })).urgente).toBe(true)
      const acc = await payload.findByID({ collection: 'assinantes', id: a.id, depth: 0, overrideAccess: true })
      expect((acc as { mensagensSuspensas?: boolean }).mensagensSuspensas).toBe(true)
      await expect(
        sendMessage(payload, { senderId: a.id, conversationId: conv.id, texto: 'oi', now: NOW }),
      ).rejects.toMatchObject({ code: 'suspenso', message: 'Seu envio de recados foi suspenso pela equipe. Fale com a casa pelo WhatsApp.' })
      expect(await audit('mensagens-suspensas')).toHaveLength(1)
      expect(await getMessageReportCounts(payload)).toEqual({ abertas: 1, urgentes: 1 })
    })
  })

  describe('staff resolution (T-05-11)', () => {
    const open = (motivo = 'assedio') =>
      reportConversation(payload, { me: b.id, conversationId: conv.id, motivo, now: NOW }).then((r) => r.id)

    it('endpoints answer 403 to anonymous and subscribers', async () => {
      const id = await open()
      const subReq = await createLocalReq({ user: { ...a, collection: 'assinantes' } as never }, payload)
      for (const req of [await createLocalReq({}, payload), subReq]) {
        const res = await messageReportEndpoints[0]!.handler({ ...req, routeParams: { id: String(id) } } as never)
        expect(res.status).toBe(403)
      }
    })

    it('descartar and resolver close one report with an audit row', async () => {
      const id = await open()
      expect(await resolveMessageReport(staffReq, id, { acao: 'descartar', nota: 'sem problema' }, NOW)).toMatchObject({ status: 'descartada' })
      expect(await audit('denuncia-mensagem-resolvida')).toHaveLength(1)
      await expect(resolveMessageReport(staffReq, id, { acao: 'resolver' }, NOW)).rejects.toMatchObject({ status: 409 })
      const id2 = await open()
      expect(await resolveMessageReport(staffReq, id2, { acao: 'resolver' }, NOW)).toMatchObject({ status: 'resolvida', suspended: false })
    })

    it('suspender suspends the reported account, closes all its open reports and audits both rows', async () => {
      const id = await open()
      const other = await person('d@teste.local', 'Davi')
      const cv = await seedConversation(payload, { a: a.id, b: other.id })
      await seedMessage(payload, { conversation: cv.id, sender: a.id })
      const second = (await reportConversation(payload, { me: other.id, conversationId: cv.id, motivo: 'spam', now: NOW })).id
      const result = await resolveMessageReport(staffReq, id, { acao: 'suspender', nota: 'reincidente' }, NOW)
      expect(result).toMatchObject({ status: 'resolvida', closed: 2, suspended: true })
      for (const rid of [id, second]) {
        expect((await payload.findByID({ collection: 'message-reports', id: rid, depth: 0, overrideAccess: true })).status).toBe('resolvida')
      }
      expect(await audit('denuncia-mensagem-resolvida')).toHaveLength(1)
      expect(await audit('mensagens-suspensas')).toHaveLength(1)
      await expect(sendMessage(payload, { senderId: a.id, conversationId: conv.id, texto: 'x', now: NOW })).rejects.toMatchObject({ code: 'suspenso' })
      // staff untick on the account frees the person again
      await payload.update({ collection: 'assinantes', id: a.id, data: { mensagensSuspensas: false }, overrideAccess: true, context: { skipAudit: true } })
      await expect(sendMessage(payload, { senderId: a.id, conversationId: conv.id, texto: 'voltei', now: NOW })).resolves.toBeTruthy()
    })

    it('a non-staff principal cannot resolve', async () => {
      const id = await open()
      const subReq = await createLocalReq({ user: { ...b, collection: 'assinantes' } as never }, payload)
      await expect(resolveMessageReport(subReq, id, { acao: 'descartar' }, NOW)).rejects.toMatchObject({ status: 403 })
    })
  })

  describe('REST and privacy', () => {
    it('message-reports are staff-only', async () => {
      const id = await reportConversation(payload, { me: b.id, conversationId: conv.id, motivo: 'assedio', now: NOW }).then((r) => r.id)
      for (const user of [undefined, { ...b, collection: 'assinantes' }]) {
        const as = { overrideAccess: false, ...(user ? { user: user as never } : {}) }
        await expect(payload.find({ collection: 'message-reports', ...as })).rejects.toThrow(DENIED)
        await expect(payload.findByID({ collection: 'message-reports', id, ...as })).rejects.toThrow(DENIED)
      }
      const found = await payload.find({ collection: 'message-reports', overrideAccess: false, user: staff as never })
      expect(found.totalDocs).toBe(1)
    })

    it('mensagensSuspensas is staff-only at field level', async () => {
      await payload.update({ collection: 'assinantes', id: a.id, data: { mensagensSuspensas: true }, overrideAccess: true, context: { skipAudit: true } })
      const own = await payload.findByID({
        collection: 'assinantes',
        id: a.id,
        depth: 0,
        overrideAccess: false,
        user: { ...a, collection: 'assinantes' } as never,
      })
      expect('mensagensSuspensas' in own).toBe(false)
    })

    it('deleting an account removes its blocks and keeps its reports without the relation', async () => {
      await seedBlock(payload, { blocker: a.id, blocked: c.id })
      const id = await reportConversation(payload, { me: b.id, conversationId: conv.id, motivo: 'assedio', now: NOW }).then((r) => r.id)
      await payload.delete({ collection: 'assinantes', id: a.id, overrideAccess: true, context: { skipAudit: true } })
      expect((await payload.count({ collection: 'blocks', overrideAccess: true })).totalDocs).toBe(0)
      const report = await payload.findByID({ collection: 'message-reports', id, depth: 0, overrideAccess: true })
      expect(report.reported ?? null).toBeNull()
      expect(report.reportedApelido).toBe('Ana')
      expect(String(report.mensagens)).toContain('Oi Beto')
    })
  })
})
