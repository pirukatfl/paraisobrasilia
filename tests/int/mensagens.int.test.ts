import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { Conversations } from '../../src/collections/Conversations'
import { Messages } from '../../src/collections/Messages'
import { RECADO_ANUNCIO_GRATUITO } from '../../src/lib/mensagens/rules'
import {
  canSend,
  composeTargetFor,
  countUnread,
  findExistingConversation,
  getThread,
  listInbox,
  markRead,
  resolveTarget,
  sendMessage,
  startConversation,
} from '../../src/lib/mensagens/service'
import {
  getTestPayload,
  resetDatabase,
  seedAd,
  seedAdCategories,
  seedAssinante,
  seedConversation,
  seedMessage,
  seedStaffUser,
  seedSubscription,
} from '../helpers/seed'

const DAY = 86_400_000
const NOW = new Date()
const DENIED = /permiss|forbidden|not allowed/i

describe('messaging (REC-02, D-02, D-04, T-05-05..10, T-05-12)', () => {
  let payload: Payload
  let a: { id: number }
  let b: { id: number }
  let c: { id: number }

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  async function person(email: string, name: string, { active = true, days = 60 } = {}) {
    const acc = await seedAssinante(payload, { email, password: 'senha-mensagem-123', name })
    if (active) {
      await seedSubscription(payload, {
        assinanteId: acc.id,
        startsAt: new Date(NOW.getTime() - DAY).toISOString(),
        endsAt: new Date(NOW.getTime() + days * DAY).toISOString(),
      })
    }
    return acc
  }

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    a = await person('a@teste.local', 'Ana')
    b = await person('b@teste.local', 'Beto')
    c = await person('c@teste.local', 'Cris')
  })

  const adOf = (author: number, extra = {}) =>
    seedAd(payload, { author, status: 'aprovado', apelido: 'Casal BSB', ...extra })

  describe('collections are closed (T-05-09)', () => {
    it('are hidden in the admin and refuse every REST-style operation, staff included', async () => {
      expect(Conversations.admin?.hidden).toBe(true)
      expect(Messages.admin?.hidden).toBe(true)
      const staff = await seedStaffUser(payload, { email: 'staff-msg@teste.local', password: 'senha-equipe-123' })
      const conv = await seedConversation(payload, { a: a.id, b: b.id })
      const msg = await seedMessage(payload, { conversation: conv.id, sender: a.id })
      const principals = [
        undefined,
        { ...(a as object), collection: 'assinantes' },
        { ...(staff as unknown as object), collection: 'users' },
      ]
      for (const user of principals) {
        const as = { overrideAccess: false, ...(user ? { user: user as never } : {}) }
        for (const [collection, id] of [['conversations', conv.id], ['messages', msg.id]] as const) {
          await expect(payload.find({ collection, ...as })).rejects.toThrow(DENIED)
          await expect(payload.findByID({ collection, id, ...as })).rejects.toThrow(DENIED)
          await expect(payload.update({ collection, id, data: {} as never, ...as })).rejects.toThrow(DENIED)
          await expect(payload.delete({ collection, id, ...as })).rejects.toThrow(DENIED)
        }
        await expect(
          payload.create({ collection: 'messages', data: { conversation: conv.id, sender: a.id, texto: 'x' }, ...as }),
        ).rejects.toThrow(DENIED)
      }
    })

    it('pairKey is unique and messages require their fields', async () => {
      await seedConversation(payload, { a: a.id, b: b.id })
      await expect(seedConversation(payload, { a: b.id, b: a.id })).rejects.toThrow()
      const conv = await findExistingConversation(payload, b.id, a.id)
      expect(conv).not.toBeNull()
      await expect(
        payload.create({ collection: 'messages', data: { conversation: conv! } as never, overrideAccess: true }),
      ).rejects.toThrow()
    })

    it('deleting an account removes its conversations and all their messages only', async () => {
      const ab = await seedConversation(payload, { a: a.id, b: b.id })
      const bc = await seedConversation(payload, { a: b.id, b: c.id })
      await seedMessage(payload, { conversation: ab.id, sender: a.id })
      await seedMessage(payload, { conversation: ab.id, sender: b.id })
      await seedMessage(payload, { conversation: bc.id, sender: c.id })
      await payload.delete({ collection: 'assinantes', id: a.id, overrideAccess: true, context: { skipAudit: true } })
      const convs = await payload.find({ collection: 'conversations', overrideAccess: true, pagination: false })
      expect(convs.docs.map((d) => d.id)).toEqual([bc.id])
      const msgs = await payload.find({ collection: 'messages', overrideAccess: true, pagination: false })
      expect(msgs.docs).toHaveLength(1)
    })
  })

  describe('resolveTarget (T-05-10)', () => {
    it('derives the recipient from a visible ad of someone else', async () => {
      const ad = await adOf(b.id)
      const target = await resolveTarget(payload, { id: ad.id, viewerId: a.id, now: NOW })
      expect(target).toMatchObject({ recipientId: b.id, recipientApelido: 'Casal BSB' })
      expect((target as { assunto: string }).assunto).toMatch(/^Anúncio: Casal BSB · /)
      const second = await adOf(b.id, { apelido: 'Beto e Bia' })
      const t2 = await resolveTarget(payload, { id: second.id, viewerId: a.id, now: NOW })
      expect(t2).toMatchObject({ recipientId: b.id, recipientApelido: 'Beto e Bia' })
      expect((t2 as { assunto: string }).assunto).toMatch(/^Anúncio: Beto e Bia · /)
    })

    it('answers null for hidden items and propria for own items', async () => {
      const pending = await seedAd(payload, { author: b.id })
      expect(await resolveTarget(payload, { id: pending.id, viewerId: a.id, now: NOW })).toBeNull()
      const hidden = await seedAd(payload, { author: b.id, status: 'despublicado' })
      expect(await resolveTarget(payload, { id: hidden.id, viewerId: a.id, now: NOW })).toBeNull()
      const own = await adOf(a.id)
      expect(await resolveTarget(payload, { id: own.id, viewerId: a.id, now: NOW })).toEqual({ error: 'propria' })
    })
  })

  describe('ad of a free author (G-02, G-04)', () => {
    it('resolves a target, but a free account cannot receive messages (the UI hides the link)', async () => {
      const free = await person('livre@teste.local', 'Livre', { active: false })
      const ad = await seedAd(payload, { author: free.id, status: 'aprovado', apelido: 'Casal Livre' })
      const target = await resolveTarget(payload, { id: ad.id, viewerId: a.id, now: NOW })
      expect(target).toMatchObject({ recipientId: free.id, recipientApelido: 'Casal Livre' })
      expect(await canSend(payload, { senderId: a.id, recipientId: free.id, now: NOW })).toBe('destinatarioInativo')
      await expect(
        startConversation(payload, { senderId: a.id, id: ad.id, texto: 'Oi!', apelido: 'Ana', now: NOW }),
      ).rejects.toMatchObject({ code: 'destinatarioInativo' })
      expect((await payload.count({ collection: 'conversations', overrideAccess: true })).totalDocs).toBe(0)
    })
  })

  describe('recados privados — quem pode mandar (R-02, R-03, R-04)', () => {
    const counts = async () => ({
      conversations: (await payload.count({ collection: 'conversations', overrideAccess: true })).totalDocs,
      messages: (await payload.count({ collection: 'messages', overrideAccess: true })).totalDocs,
    })

    it('1: active -> ad of an active author starts a conversation', async () => {
      const ad = await adOf(b.id)
      await expect(
        startConversation(payload, { senderId: a.id, id: ad.id, texto: 'Oi', apelido: 'Ana', now: NOW }),
      ).resolves.toMatchObject({ conversationId: expect.any(Number) })
    })

    it('2: active -> ad of a FREE author is refused and creates nothing', async () => {
      const free = await person('gratis@teste.local', 'Gratis', { active: false })
      const ad = await seedAd(payload, { author: free.id, status: 'aprovado', apelido: 'Gratis' })
      await expect(
        startConversation(payload, { senderId: a.id, id: ad.id, texto: 'Oi', apelido: 'Ana', now: NOW }),
      ).rejects.toMatchObject({ code: 'destinatarioInativo' })
      expect(await counts()).toEqual({ conversations: 0, messages: 0 })
    })

    it('3: FREE sender is refused and creates nothing', async () => {
      const free = await person('livre2@teste.local', 'Livre', { active: false })
      const ad = await adOf(b.id)
      await expect(
        startConversation(payload, { senderId: free.id, id: ad.id, texto: 'Oi', apelido: 'Livre', now: NOW }),
      ).rejects.toMatchObject({ code: 'remetenteInativo' })
      expect(await counts()).toEqual({ conversations: 0, messages: 0 })
    })

    it('4: EXPIRED sender is refused and creates nothing', async () => {
      const expired = await seedAssinante(payload, { email: 'exp@teste.local', password: 'senha-mensagem-123', name: 'Exp' })
      await seedSubscription(payload, {
        assinanteId: expired.id,
        startsAt: new Date(NOW.getTime() - 40 * DAY).toISOString(),
        endsAt: new Date(NOW.getTime() - 10 * DAY).toISOString(),
      })
      const ad = await adOf(b.id)
      await expect(
        startConversation(payload, { senderId: expired.id, id: ad.id, texto: 'Oi', apelido: 'Exp', now: NOW }),
      ).rejects.toMatchObject({ code: 'remetenteInativo' })
      expect(await counts()).toEqual({ conversations: 0, messages: 0 })
    })

    it('5: own ad answers propria', async () => {
      const own = await adOf(a.id)
      await expect(
        startConversation(payload, { senderId: a.id, id: own.id, texto: 'Oi', apelido: 'Ana', now: NOW }),
      ).rejects.toMatchObject({ code: 'propria' })
      expect(await counts()).toEqual({ conversations: 0, messages: 0 })
    })

    it('6: a third subscriber never sees the A-B conversation (inbox and thread)', async () => {
      const ad = await adOf(b.id)
      const { conversationId } = await startConversation(payload, {
        senderId: a.id,
       
        id: ad.id,
        texto: 'SEGREDO-A-B',
        apelido: 'Ana',
        now: NOW,
      })
      expect((await listInbox(payload, c.id)).items).toHaveLength(0)
      expect(await getThread(payload, c.id, conversationId)).toBeNull()
      expect((await listInbox(payload, a.id)).items).toHaveLength(1)
      expect((await listInbox(payload, b.id)).items).toHaveLength(1)
    })

    it('composeTargetFor: free author -> indisponivel; active author -> novo; existing thread is kept', async () => {
      const free = await person('gratis2@teste.local', 'Gratis2', { active: false })
      const freeAd = await seedAd(payload, { author: free.id, status: 'aprovado', apelido: 'Gratis2' })
      expect(await composeTargetFor(payload, { me: a.id, id: freeAd.id, ownApelido: 'Ana', now: NOW })).toEqual({
        state: 'indisponivel',
        message: RECADO_ANUNCIO_GRATUITO,
      })
      const ad = await adOf(b.id)
      expect(await composeTargetFor(payload, { me: a.id, id: ad.id, ownApelido: 'Ana', now: NOW })).toMatchObject({
        state: 'novo',
        recipientApelido: 'Casal BSB',
        apelido: 'Ana',
      })
      const { conversationId } = await startConversation(payload, {
        senderId: a.id,
       
        id: ad.id,
        texto: 'Oi',
        apelido: 'Ana',
        now: NOW,
      })
      expect(await composeTargetFor(payload, { me: a.id, id: ad.id, ownApelido: 'Ana', now: NOW })).toEqual({
        state: 'existente',
        conversationId,
      })
      const own = await adOf(a.id)
      expect(await composeTargetFor(payload, { me: a.id, id: own.id, ownApelido: 'Ana', now: NOW })).toEqual({
        state: 'propria',
      })
    })
  })

  describe('canSend (T-05-06)', () => {
    it('needs both sides active', async () => {
      const off = await person('off@teste.local', 'Off', { active: false })
      expect(await canSend(payload, { senderId: off.id, recipientId: a.id, now: NOW })).toBe('remetenteInativo')
      expect(await canSend(payload, { senderId: a.id, recipientId: off.id, now: NOW })).toBe('destinatarioInativo')
      expect(await canSend(payload, { senderId: a.id, recipientId: b.id, now: NOW })).toBeNull()
    })
  })

  describe('startConversation', () => {
    it('creates one thread with snapshots, saves the apelido, and later contacts reuse it', async () => {
      const ad = await adOf(b.id)
      await expect(
        startConversation(payload, { senderId: a.id, id: ad.id, texto: 'Oi!', now: NOW }),
      ).rejects.toMatchObject({ code: 'semApelido', status: 400 })
      const { conversationId } = await startConversation(payload, {
        senderId: a.id,
       
        id: ad.id,
        texto: 'Oi, tudo bem?',
        apelido: 'Casal Ana',
        now: NOW,
      })
      const acc = await payload.findByID({ collection: 'assinantes', id: a.id, overrideAccess: true, depth: 0 })
      expect((acc as { apelido?: string }).apelido).toBe('Casal Ana')
      const conv = await payload.findByID({ collection: 'conversations', id: conversationId, overrideAccess: true, depth: 0 })
      expect(conv.participantA).toBe(Math.min(a.id, b.id))
      expect([conv.apelidoA, conv.apelidoB].sort()).toEqual(['Casal Ana', 'Casal BSB'])
      expect(conv.assunto).toMatch(/^Anúncio: /)
      const second = await adOf(b.id, { apelido: 'Segundo anúncio' })
      const again = await startConversation(payload, { senderId: a.id, id: second.id, texto: 'Segunda', now: NOW })
      expect(again.conversationId).toBe(conversationId)
      const after = await payload.findByID({ collection: 'conversations', id: conversationId, overrideAccess: true, depth: 0 })
      expect(after.assunto).toBe(conv.assunto)
      const thread = await getThread(payload, a.id, conversationId)
      expect(thread!.mensagens.map((m) => m.texto)).toEqual(['Oi, tudo bem?', 'Segunda'])
    })

    it('extra recipientId is ignored: the ad author is always the recipient', async () => {
      const ad = await adOf(b.id)
      const { conversationId } = await startConversation(payload, {
        senderId: a.id,
       
        id: ad.id,
        texto: 'Oi',
        apelido: 'Ana',
        recipientId: c.id,
        now: NOW,
      } as never)
      expect(await findExistingConversation(payload, a.id, b.id)).toBe(conversationId)
      expect(await findExistingConversation(payload, a.id, c.id)).toBeNull()
    })

    it('refuses own ads, hidden ads, inactive sides and bad texts', async () => {
      const own = await adOf(a.id)
      await expect(
        startConversation(payload, { senderId: a.id, id: own.id, texto: 'x', apelido: 'Ana', now: NOW }),
      ).rejects.toMatchObject({ code: 'propria' })
      await expect(
        startConversation(payload, { senderId: a.id, id: 99999, texto: 'x', apelido: 'Ana', now: NOW }),
      ).rejects.toMatchObject({ status: 404 })
      const ad = await adOf(b.id)
      for (const [texto, code] of [['  ', 'vazio'], ['x'.repeat(2001), 'longa']] as const) {
        await expect(
          startConversation(payload, { senderId: a.id, id: ad.id, texto, apelido: 'Ana', now: NOW }),
        ).rejects.toMatchObject({ code, status: 400 })
      }
      const off = await person('off2@teste.local', 'Off', { active: false })
      await expect(
        startConversation(payload, { senderId: off.id, id: ad.id, texto: 'oi', apelido: 'Off', now: NOW }),
      ).rejects.toMatchObject({ code: 'remetenteInativo', status: 403 })
      await expect(
        startConversation(payload, { senderId: a.id, id: ad.id, texto: 'oi', apelido: 'Ana@telefone', now: NOW }),
      ).rejects.toMatchObject({ code: 'apelido' })
    })
  })

  describe('sendMessage, thread, inbox, unread', () => {
    it('only participants write and read; replies update the thread markers', async () => {
      const conv = await seedConversation(payload, { a: a.id, b: b.id, apelidoA: 'Ana', apelidoB: 'Beto' })
      await seedMessage(payload, { conversation: conv.id, sender: a.id, texto: 'Oi' })
      await expect(sendMessage(payload, { senderId: c.id, conversationId: conv.id, texto: 'intruso', now: NOW })).rejects.toMatchObject({
        code: 'nao-encontrado',
        status: 404,
      })
      expect(await getThread(payload, c.id, conv.id)).toBeNull()
      await expect(sendMessage(payload, { senderId: b.id, conversationId: conv.id, texto: '', now: NOW })).rejects.toMatchObject({ code: 'vazio' })
      await expect(sendMessage(payload, { senderId: b.id, conversationId: conv.id, texto: 'x'.repeat(2001), now: NOW })).rejects.toMatchObject({ code: 'longa' })
      await sendMessage(payload, { senderId: b.id, conversationId: conv.id, texto: 'Oi, Ana!', now: NOW })
      const after = await payload.findByID({ collection: 'conversations', id: conv.id, overrideAccess: true, depth: 0 })
      expect(after.lastSender).toBe(b.id)
      expect(after.lastMessageAt).toBe(NOW.toISOString())
      const thread = await getThread(payload, a.id, conv.id)
      expect(thread!.mensagens.map((m) => [m.minha, m.texto])).toEqual([[true, 'Oi'], [false, 'Oi, Ana!']])
      const json = JSON.stringify(thread)
      expect(json).not.toContain('@teste.local')
      expect(json).not.toMatch(new RegExp(`"(?:sender|participant\\w*|author)"`))
    })

    it('paginates the thread: newest 50, then antes', async () => {
      const conv = await seedConversation(payload, { a: a.id, b: b.id })
      for (let i = 1; i <= 55; i++) await seedMessage(payload, { conversation: conv.id, sender: a.id, texto: `m${i}` })
      const first = await getThread(payload, b.id, conv.id)
      expect(first!.mensagens).toHaveLength(50)
      expect(first!.mensagens[0]!.texto).toBe('m6')
      expect(first!.mensagens[49]!.texto).toBe('m55')
      expect(first!.temAnteriores).toBe(true)
      const older = await getThread(payload, b.id, conv.id, { antes: first!.antesDe! })
      expect(older!.mensagens.map((m) => m.texto)).toEqual(['m1', 'm2', 'm3', 'm4', 'm5'])
      expect(older!.temAnteriores).toBe(false)
    })

    it('inbox marks unread for the receiver, truncates the last message, and read clears the count', async () => {
      const conv = await seedConversation(payload, { a: a.id, b: b.id, apelidoA: 'Ana', apelidoB: 'Beto' })
      await seedMessage(payload, { conversation: conv.id, sender: a.id, texto: 'Primeira' })
      await seedMessage(payload, { conversation: conv.id, sender: a.id, texto: 'x'.repeat(100) })
      const inbox = await listInbox(payload, b.id)
      expect(inbox.items).toHaveLength(1)
      expect(inbox.items[0]).toMatchObject({ outroApelido: 'Ana', naoLida: true })
      expect(inbox.items[0]!.ultimo.length).toBeLessThanOrEqual(60)
      expect((await listInbox(payload, a.id)).items[0]!.naoLida).toBe(false)
      expect(await countUnread(payload, b.id)).toBe(2)
      expect(await countUnread(payload, a.id)).toBe(0)
      await markRead(payload, b.id, conv.id, new Date())
      await new Promise((r) => setTimeout(r, 25))
      expect(await countUnread(payload, b.id)).toBe(0)
      expect((await listInbox(payload, b.id)).items[0]!.naoLida).toBe(false)
      await seedMessage(payload, { conversation: conv.id, sender: a.id, texto: 'Nova' })
      expect(await countUnread(payload, b.id)).toBe(1)
    })

    it('caps the unread count at 100', async () => {
      const conv = await seedConversation(payload, { a: a.id, b: b.id })
      for (let i = 0; i < 120; i++) {
        await payload.create({ collection: 'messages', data: { conversation: conv.id, sender: a.id, texto: `n${i}` }, overrideAccess: true })
      }
      await payload.update({ collection: 'conversations', id: conv.id, data: { lastSender: a.id, lastMessageAt: new Date().toISOString() }, overrideAccess: true })
      expect(await countUnread(payload, b.id)).toBe(100)
    })
  })

  describe('limits (T-05-08)', () => {
    it('stops the 21st new conversation of the day and allows it the next day', async () => {
      const ad = await adOf(b.id)
      // 20 conversations started by `a` today with other people (seeded directly)
      for (let i = 0; i < 20; i++) {
        const other = await person(`o${i}@teste.local`, `O${i}`)
        const conv = await payload.create({
          collection: 'conversations',
          data: {
            participantA: Math.min(a.id, other.id),
            participantB: Math.max(a.id, other.id),
            pairKey: `${Math.min(a.id, other.id)}-${Math.max(a.id, other.id)}`,
            startedBy: a.id,
            createdAt: NOW.toISOString(),
          },
          overrideAccess: true,
        })
        expect(conv.id).toBeGreaterThan(0)
      }
      await expect(
        startConversation(payload, { senderId: a.id, id: ad.id, texto: 'oi', apelido: 'Ana', now: NOW }),
      ).rejects.toMatchObject({ code: 'limiteConversas', status: 429 })
      const tomorrow = new Date(NOW.getTime() + DAY)
      await expect(
        startConversation(payload, { senderId: a.id, id: ad.id, texto: 'oi', apelido: 'Ana', now: tomorrow }),
      ).resolves.toMatchObject({ conversationId: expect.any(Number) })
    })

    it('stops the 201st message of the day', async () => {
      const conv = await seedConversation(payload, { a: a.id, b: b.id })
      for (let i = 0; i < 200; i++) {
        await payload.create({
          collection: 'messages',
          data: { conversation: conv.id, sender: a.id, texto: 'm', createdAt: NOW.toISOString() },
          overrideAccess: true,
        })
      }
      await expect(sendMessage(payload, { senderId: a.id, conversationId: conv.id, texto: 'mais uma', now: NOW })).rejects.toMatchObject({
        code: 'limiteMensagens',
        status: 429,
      })
      await expect(
        sendMessage(payload, { senderId: a.id, conversationId: conv.id, texto: 'amanhã', now: new Date(NOW.getTime() + DAY) }),
      ).resolves.toBeTruthy()
    })
  })
})
