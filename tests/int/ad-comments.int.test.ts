import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { findMemberAds, findPublicAds } from '../../src/lib/classisex/board'
import { countCommentsByAd, createComment, deleteOwnComment, listComments } from '../../src/lib/classisex/comentarios/service'
import { LIMITE_DIARIO, QUEM_COMENTA, VISITANTE_LIMITE_DIA, VISITANTE_LIMITE_HORA } from '../../src/lib/classisex/comentarios/rules'
import { REDACTED_LABEL } from '../../src/lib/classisex/redact'
import { graphql, rest, tokenFor } from '../helpers/rest'
import {
  getTestPayload,
  resetDatabase,
  seedAd,
  seedAdCategories,
  seedAssinante,
  seedStaffUser,
  seedSubscription,
  seedVisibleAd,
} from '../helpers/seed'

const NOW = new Date('2026-11-03T18:00:00.000Z')
const DAY = 86_400_000
const DENIED = /not allowed|forbidden|permiss/i

describe('comentários dos anúncios (quick classisex-comentarios)', () => {
  let payload: Payload
  let owner: { id: number; email: string }
  let adId: number
  let free: { id: number; email: string }
  let paying: { id: number; email: string }
  let staffReq: PayloadRequest
  let staffToken: string

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  async function account(email: string, name: string, active: boolean) {
    const a = await seedAssinante(payload, { email, password: 'senha-teste-1234', name })
    if (active) {
      await seedSubscription(payload, {
        assinanteId: a.id,
        startsAt: new Date(NOW.getTime() - DAY).toISOString(),
        endsAt: new Date(NOW.getTime() + 20 * DAY).toISOString(),
      })
    }
    return a
  }

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    const staff = await seedStaffUser(payload, { email: 'staff-com@teste.local', password: 'senha-equipe-123' })
    staffReq = await createLocalReq({ user: { ...(staff as unknown as Record<string, unknown>), collection: 'users' } as never }, payload)
    staffToken = await tokenFor(payload, 'users', 'staff-com@teste.local', 'senha-equipe-123')
    const seeded = await seedVisibleAd(payload, { authorEmail: 'dona@teste.local', authorName: 'Dona', now: NOW })
    owner = seeded.author
    adId = seeded.ad.id
    free = await account('gratis@teste.local', 'Gratis', false)
    paying = await account('assina@teste.local', 'Assina', true)
  })

  type CommentInput = Partial<Parameters<typeof createComment>[1]>
  /** What staff do in the admin: "Em análise" → "Publicado". */
  const approve = async (id: number | null) => {
    if (id !== null) await payload.update({ collection: 'ad-comments', id, data: { status: 'publicado' }, overrideAccess: true, context: { skipAudit: true } })
  }
  /** A comment already approved (the service itself creates it "pendente"). */
  const comment = async (over: CommentInput = {}): Promise<{ id: number }> => {
    const res = await createComment(payload, { assinanteId: free.id, adId, apelido: 'Lua', texto: 'Que anúncio simpático!', now: NOW, ...over })
    await approve(res.id)
    return { id: res.id as number }
  }
  let ipSeq = 0
  /** A visitor (no account); each call gets its own address unless one is given. */
  const visitor = async (over: CommentInput = {}) => {
    const res = await createComment(payload, {
      assinanteId: null,
      adId,
      apelido: 'Visitante Teste',
      texto: 'Passando para dizer oi.',
      now: NOW,
      ip: `198.51.100.${++ipSeq}`,
      ...over,
    })
    await approve(res.id)
    return res
  }
  const rows = async (where: Record<string, unknown> = {}) =>
    (await payload.find({ collection: 'ad-comments', where: where as never, depth: 0, limit: 100, overrideAccess: true, sort: 'id' }))
      .docs as unknown as Array<Record<string, unknown> & { id: number }>
  const audit = async (action: string) =>
    (await payload.find({ collection: 'audit-log', where: { action: { equals: action } }, depth: 0, overrideAccess: true })).docs

  describe('REST e GraphQL são só da equipe', () => {
    it('visitante e assinante não leem, criam, mudam nem apagam em /api/ad-comments', async () => {
      const { id } = await comment({ texto: 'Fala comigo em dona@exemplo.com' })
      const subToken = await tokenFor(payload, 'assinantes', 'assina@teste.local', 'senha-teste-1234')
      for (const token of [undefined, subToken]) {
        const list = await rest('GET', ['ad-comments'], { token })
        const one = await rest('GET', ['ad-comments', String(id)], { token })
        const create = await rest('POST', ['ad-comments'], { token, body: { ad: adId, author: paying.id, apelido: 'X', texto: 'y' } })
        const patch = await rest('PATCH', ['ad-comments', String(id)], { token, body: { status: 'oculto' } })
        const del = await rest('DELETE', ['ad-comments', String(id)], { token })
        for (const res of [list, one, create, patch, del]) {
          expect([401, 403, 404]).toContain(res.status)
          expect(res.text).not.toContain('dona@exemplo.com')
        }
      }
      expect(await rows()).toHaveLength(1)
      const gql = await graphql('{ AdComments { docs { texto author { email } } } }')
      expect(gql.text).not.toContain('dona@exemplo.com')
      await expect(payload.find({ collection: 'ad-comments', overrideAccess: false, user: null })).rejects.toThrow(DENIED)
      await expect(
        payload.find({ collection: 'ad-comments', overrideAccess: false, user: { ...paying, collection: 'assinantes' } as never }),
      ).rejects.toThrow(DENIED)
    })

    it('a equipe lê pelo REST', async () => {
      await comment()
      const res = await rest('GET', ['ad-comments'], { token: staffToken })
      expect(res.status).toBe(200)
      expect((res.json as { totalDocs: number }).totalDocs).toBe(1)
    })
  })

  describe('moderação', () => {
    it('comentário novo (com ou sem conta) nasce "pendente" e não aparece até a equipe aprovar', async () => {
      const mine = await createComment(payload, { assinanteId: free.id, adId, apelido: 'Lua', texto: 'Olá pendente', now: NOW })
      const vis = await createComment(payload, { assinanteId: null, adId, apelido: 'Zé', texto: 'Visitante pendente', now: NOW, ip: '198.51.100.250' })
      for (const id of [mine.id, vis.id]) expect((await rows({ id: { equals: id } }))[0].status).toBe('pendente')
      expect(await listComments(payload, adId, { verContatos: true, now: NOW })).toEqual([])
      expect((await countCommentsByAd(payload, [adId])).get(adId) ?? 0).toBe(0)
      await approve(mine.id)
      const thread = await listComments(payload, adId, { verContatos: true, now: NOW })
      expect(thread?.map((c) => c.texto)).toEqual(['Olá pendente'])
    })

    it('não dá para responder a um comentário ainda em análise', async () => {
      const root = await createComment(payload, { assinanteId: free.id, adId, apelido: 'Lua', texto: 'Raiz pendente', now: NOW })
      await expect(
        createComment(payload, { assinanteId: free.id, adId, parentId: root.id as number, apelido: 'Lua', texto: 'Resposta', now: NOW }),
      ).rejects.toMatchObject({ status: 400 })
    })
  })

  describe('criar', () => {
    it('conta gratuita comenta; o comentário guarda o texto como escrito e o autor da sessão', async () => {
      const { id } = await comment({ texto: '  Oi!\r\n\r\n\r\n\r\nMe chama: dona@exemplo.com  ' })
      const [row] = await rows({ id: { equals: id } })
      expect(row.author).toBe(free.id)
      expect(row.ad).toBe(adId)
      expect(row.status).toBe('publicado')
      expect(row.parent ?? null).toBeNull()
      expect(row.doAnunciante).toBe(false)
      expect(row.texto).toBe('Oi!\n\nMe chama: dona@exemplo.com')
      expect(String(row.resumo)).toContain('Lua')
    })

    it('o anunciante é marcado e o apelido da conta é guardado e reaproveitado', async () => {
      const { id } = await comment({ assinanteId: owner.id, apelido: 'Casal Dona' })
      expect((await rows({ id: { equals: id } }))[0].doAnunciante).toBe(true)
      const acc = await payload.findByID({ collection: 'assinantes', id: owner.id, depth: 0, overrideAccess: true })
      expect(acc.apelido).toBe('Casal Dona')
      const second = await comment({ assinanteId: owner.id, apelido: '', texto: 'Outro' })
      expect((await rows({ id: { equals: second.id } }))[0].apelido).toBe('Casal Dona')
    })

    it('recusa texto vazio ou longo, apelido com contato e sem apelido', async () => {
      expect(((await comment({ texto: '   ' }).catch((e) => e)) as { status: number }).status).toBe(400)
      expect(((await comment({ texto: 'x'.repeat(1001) }).catch((e) => e)) as { message: string }).message).toContain('1000')
      expect(((await comment({ apelido: 'casal@gmail.com' }).catch((e) => e)) as { status: number }).status).toBe(400)
      expect(((await comment({ apelido: '' }).catch((e) => e)) as { status: number }).status).toBe(400)
      expect(await rows()).toHaveLength(0)
    })

    it.each(['pendente', 'recusado', 'despublicado', 'rascunho'] as const)('anúncio %s não recebe comentário (404)', async (status) => {
      const other = await seedAd(payload, { author: owner.id, status })
      const err = (await comment({ adId: other.id }).catch((e) => e)) as { status: number }
      expect(err.status).toBe(404)
      expect(await rows()).toHaveLength(0)
    })

    it('anúncio inexistente ou id inválido: 404', async () => {
      expect(((await comment({ adId: 999_999 }).catch((e) => e)) as { status: number }).status).toBe(404)
      expect(((await comment({ adId: 'abc' }).catch((e) => e)) as { status: number }).status).toBe(404)
    })

    it('conta bloqueada pela equipe não comenta', async () => {
      await payload.update({ collection: 'assinantes', id: free.id, data: { comentariosBloqueados: true }, overrideAccess: true, context: { skipAudit: true } })
      const err = (await comment().catch((e) => e)) as { status: number; message: string }
      expect(err.status).toBe(403)
      expect(err.message).toContain('sem permissão')
      expect(await rows()).toHaveLength(0)
    })

    it('comentariosBloqueados é um campo só da equipe', async () => {
      await payload.update({ collection: 'assinantes', id: free.id, data: { comentariosBloqueados: true }, overrideAccess: true, context: { skipAudit: true } })
      const own = await payload.findByID({ collection: 'assinantes', id: free.id, depth: 0, overrideAccess: false, user: { ...free, collection: 'assinantes' } as never })
      expect('comentariosBloqueados' in own).toBe(false)
    })

    it(`limite de ${LIMITE_DIARIO} comentários por conta por dia de Brasília`, async () => {
      for (let i = 0; i < LIMITE_DIARIO; i++) await comment({ texto: `comentário ${i}` })
      const err = (await comment().catch((e) => e)) as { status: number; message: string }
      expect(err.status).toBe(429)
      expect(err.message).toContain('muitos comentários')
      // outra conta não é afetada; no dia seguinte a conta volta
      await expect(comment({ assinanteId: paying.id })).resolves.toHaveProperty('id')
      await expect(comment({ now: new Date(NOW.getTime() + DAY) })).resolves.toHaveProperty('id')
    })
  })

  describe('respostas (um nível só)', () => {
    it('responder a uma resposta grava a raiz como pai', async () => {
      const root = await comment({ texto: 'Raiz' })
      const reply = await comment({ assinanteId: paying.id, parentId: root.id, texto: 'Resposta' })
      const deep = await comment({ assinanteId: owner.id, parentId: reply.id, texto: 'Resposta da resposta' })
      const [r, d] = await rows({ id: { in: [reply.id, deep.id] } })
      expect(r.parent).toBe(root.id)
      expect(d.parent).toBe(root.id)
      const thread = await listComments(payload, adId, { verContatos: true, now: NOW })
      expect(thread).toHaveLength(1)
      expect(thread![0].respostas.map((x) => x.texto)).toEqual(['Resposta', 'Resposta da resposta'])
    })

    it('pai de outro anúncio, oculto ou inexistente é recusado', async () => {
      const other = await seedVisibleAd(payload, { authorEmail: 'outra@teste.local', now: NOW })
      const foreign = await comment({ adId: other.ad.id, texto: 'Em outro anúncio' })
      const root = await comment({ texto: 'Raiz' })
      expect(((await comment({ parentId: foreign.id }).catch((e) => e)) as { status: number }).status).toBe(400)
      expect(((await comment({ parentId: 999_999 }).catch((e) => e)) as { status: number }).status).toBe(400)
      await payload.update({ collection: 'ad-comments', id: root.id, data: { status: 'oculto' }, overrideAccess: true, context: { skipAudit: true } })
      expect(((await comment({ parentId: root.id }).catch((e) => e)) as { status: number }).status).toBe(400)
    })
  })

  describe('leitura', () => {
    it('DTO público: sem contato, sem id nem e-mail do autor; assinante vê o texto inteiro', async () => {
      await comment({ texto: 'Zap 61 99988-7766 ou dona@exemplo.com ou @dona_bsb' })
      const pub = await listComments(payload, adId, { verContatos: false, now: NOW })
      const json = JSON.stringify(pub)
      expect(json).not.toContain('99988')
      expect(json).not.toContain('dona@exemplo.com')
      expect(json).not.toContain('@dona_bsb')
      expect(json).toContain(REDACTED_LABEL)
      expect(json).not.toContain('gratis@teste.local')
      expect(json).not.toMatch(/"author"/)
      expect(Object.keys(pub![0]).sort()).toEqual(['apelido', 'doAnunciante', 'id', 'meu', 'quando', 'respostas', 'semConta', 'texto'])

      const member = await listComments(payload, adId, { verContatos: true, meId: paying.id, now: NOW })
      expect(member![0].texto).toBe('Zap 61 99988-7766 ou dona@exemplo.com ou @dona_bsb')
      expect(member![0].meu).toBe(false)
    })

    it('"meu" só nos comentários da própria conta', async () => {
      const mine = await comment({ texto: 'Meu' })
      await comment({ assinanteId: paying.id, texto: 'Dele' })
      const thread = await listComments(payload, adId, { verContatos: false, meId: free.id, now: NOW })
      expect(thread!.map((c) => [c.id === mine.id, c.meu])).toEqual([
        [true, true],
        [false, false],
      ])
    })

    it('comentário oculto não aparece, e a resposta dele some junto', async () => {
      const root = await comment({ texto: 'Raiz' })
      await comment({ assinanteId: paying.id, parentId: root.id, texto: 'Resposta' })
      const other = await comment({ texto: 'Outro' })
      await payload.update({ collection: 'ad-comments', id: root.id, data: { status: 'oculto' }, overrideAccess: true, context: { skipAudit: true } })
      const thread = await listComments(payload, adId, { verContatos: true, now: NOW })
      expect(thread!.map((c) => c.id)).toEqual([other.id])
      expect(JSON.stringify(thread)).not.toContain('Resposta')
    })

    it('anúncio despublicado: a conversa some (null) e o quadro conta zero', async () => {
      await comment()
      await payload.update({ collection: 'ads', id: adId, data: { status: 'despublicado', motivo: 'x x x' }, overrideAccess: true })
      expect(await listComments(payload, adId, { verContatos: false, now: NOW })).toBeNull()
    })

    it('o quadro traz a contagem em lote (só publicados), nas duas áreas', async () => {
      const root = await comment()
      await comment({ assinanteId: paying.id, parentId: root.id, texto: 'Resposta' })
      const hidden = await comment({ texto: 'Escondido' })
      await payload.update({ collection: 'ad-comments', id: hidden.id, data: { status: 'oculto' }, overrideAccess: true, context: { skipAudit: true } })
      const second = await seedVisibleAd(payload, { authorEmail: 'segunda@teste.local', now: NOW })
      const pub = await findPublicAds(payload, { page: 1 }, NOW)
      const mem = await findMemberAds(payload, { page: 1 }, NOW)
      const countOf = (items: { id: number; comentarios: number }[], id: number) => items.find((i) => i.id === id)?.comentarios
      expect(countOf(pub.items, adId)).toBe(2)
      expect(countOf(pub.items, second.ad.id)).toBe(0)
      expect(countOf(mem.items, adId)).toBe(2)
      expect(JSON.stringify(pub.items)).not.toContain('Resposta')
    })
  })

  describe('apagar', () => {
    it('o autor apaga o próprio comentário (e as respostas), não o dos outros', async () => {
      const root = await comment({ texto: 'Raiz' })
      const reply = await comment({ assinanteId: paying.id, parentId: root.id, texto: 'Resposta' })
      const theirs = await comment({ assinanteId: paying.id, texto: 'Dele' })
      const err = (await deleteOwnComment(payload, free.id, theirs.id).catch((e) => e)) as { status: number }
      expect(err.status).toBe(404)
      expect(((await deleteOwnComment(payload, free.id, 999_999).catch((e) => e)) as { status: number }).status).toBe(404)
      await deleteOwnComment(payload, free.id, root.id)
      const left = (await rows()).map((r) => r.id)
      expect(left).toEqual([theirs.id])
      expect(left).not.toContain(reply.id)
    })

    it('apagar o anúncio apaga os comentários e as respostas', async () => {
      const root = await comment()
      await comment({ assinanteId: paying.id, parentId: root.id, texto: 'Resposta' })
      await payload.delete({ collection: 'ads', id: adId, overrideAccess: true, context: { skipAudit: true } })
      expect(await rows()).toHaveLength(0)
    })

    it('apagar a conta apaga os comentários dela (e as respostas a eles), não os dos outros', async () => {
      const root = await comment({ texto: 'Raiz' })
      await comment({ assinanteId: paying.id, parentId: root.id, texto: 'Resposta de outra conta' })
      const keep = await comment({ assinanteId: paying.id, texto: 'Fica' })
      await comment({ assinanteId: paying.id, parentId: keep.id, texto: 'Resposta dela' })
      await payload.delete({ collection: 'assinantes', id: free.id, overrideAccess: true, context: { skipAudit: true } })
      expect((await rows()).map((r) => r.texto)).toEqual(['Fica', 'Resposta dela'])
    })
  })

  describe('sem conta (ajuste do cliente 2026-11-03)', () => {
    it('o padrão é "todos" e o visitante comenta com o nome que quiser: sem autora, semConta true', async () => {
      expect(QUEM_COMENTA).toBe('todos')
      const res = await visitor({ apelido: 'Zé do Plano', texto: 'Adorei a ideia!' })
      expect(res.id).toBeGreaterThan(0)
      const [row] = await rows({ id: { equals: res.id } })
      expect(row.author ?? null).toBeNull()
      expect(row.semConta).toBe(true)
      expect(row.apelido).toBe('Zé do Plano')
      expect(row.doAnunciante).toBe(false)
      expect(row.status).toBe('publicado')
      // nenhum endereço guardado no banco
      expect(JSON.stringify(row)).not.toContain('198.51.100')
    })

    it('nome com contato ou vazio é recusado e nada é gravado', async () => {
      for (const apelido of ['fala 61 99988-7766', 'eu@exemplo.com', '@fulano', 'www.site.com', '   ']) {
        const err = (await visitor({ apelido }).catch((e) => e)) as { status: number; errors?: Record<string, string> }
        expect(err.status).toBe(400)
        expect(err.errors?.apelido).toBeTruthy()
      }
      expect(await rows()).toHaveLength(0)
    })

    it('comentário vazio é recusado', async () => {
      expect(((await visitor({ texto: '   ' }).catch((e) => e)) as { status: number }).status).toBe(400)
    })

    it('anúncio que não está visível responde como inexistente', async () => {
      const pending = await seedAd(payload, { author: owner.id, status: 'pendente' })
      expect(((await visitor({ adId: pending.id }).catch((e) => e)) as { status: number }).status).toBe(404)
      expect(((await visitor({ adId: 999_999 }).catch((e) => e)) as { status: number }).status).toBe(404)
    })

    it('honeypot preenchido: sucesso neutro (id null) e nada gravado', async () => {
      const res = await visitor({ website: 'http://spam.example' })
      expect(res.id).toBeNull()
      expect(await rows()).toHaveLength(0)
    })

    it('limite por IP: por hora e por dia, só para visitantes e sem tocar o banco', async () => {
      const ip = '203.0.113.7'
      for (let i = 0; i < VISITANTE_LIMITE_HORA; i++) await visitor({ ip, texto: `Comentário ${i}` })
      const err = (await visitor({ ip }).catch((e) => e)) as { status: number; code?: string }
      expect(err.status).toBe(429)
      expect(await rows()).toHaveLength(VISITANTE_LIMITE_HORA)
      // outro endereço não é afetado, e quem tem conta também não
      await visitor({ ip: '203.0.113.8' })
      await comment()
      // uma hora depois a janela da hora reabre
      const later = new Date(NOW.getTime() + 61 * 60_000)
      await visitor({ ip, now: later })
    })

    it('limite diário por IP', async () => {
      const ip = '203.0.113.9'
      for (let i = 0; i < VISITANTE_LIMITE_DIA; i++) {
        // 1 a cada 15 minutos: nunca passa de 4 por hora
        await visitor({ ip, now: new Date(NOW.getTime() + i * 15 * 60_000), texto: `Dia ${i}` })
      }
      const err = (await visitor({ ip, now: new Date(NOW.getTime() + VISITANTE_LIMITE_DIA * 15 * 60_000) }).catch((e) => e)) as { status: number }
      expect(err.status).toBe(429)
    })

    it('visitante nunca ganha o selo do anunciante, nem usando o apelido do anúncio', async () => {
      const ad = (await payload.findByID({ collection: 'ads', id: adId, depth: 0, overrideAccess: true })) as { apelido: string }
      const res = await visitor({ apelido: ad.apelido })
      const [row] = await rows({ id: { equals: res.id } })
      expect(row.doAnunciante).toBe(false)
      // a dona logada continua com o selo
      const mine = await comment({ assinanteId: owner.id, apelido: ad.apelido })
      expect((await rows({ id: { equals: mine.id } }))[0].doAnunciante).toBe(true)
      // e o DTO não deixa um registro antigo ou editado levar o selo junto com semConta
      const thread = await listComments(payload, adId, { verContatos: false, now: NOW })
      expect(thread!.find((c) => c.id === res.id)).toMatchObject({ doAnunciante: false, semConta: true })
    })

    it('visitante responde a um comentário (um nível só) e a resposta vai para o principal', async () => {
      const root = await comment({ texto: 'Raiz' })
      const reply = await visitor({ parentId: root.id, texto: 'Resposta de visitante' })
      const again = await visitor({ parentId: reply.id, texto: 'Resposta da resposta' })
      const [row] = await rows({ id: { equals: again.id } })
      expect((row.parent as number) ?? null).toBe(root.id)
      expect(((await visitor({ parentId: 999_999 }).catch((e) => e)) as { status: number }).status).toBe(400)
      const other = await seedVisibleAd(payload, { authorEmail: 'outra2@teste.local', now: NOW })
      const foreign = await comment({ adId: other.ad.id, texto: 'Em outro anúncio' })
      expect(((await visitor({ parentId: foreign.id }).catch((e) => e)) as { status: number }).status).toBe(400)
    })

    it('DTO público do visitante: sem contato no texto nem no nome, sem dado de autoria, só a marca "semConta"', async () => {
      await visitor({ apelido: 'Lua', texto: 'Zap 61 99988-7766 e lua@exemplo.com' })
      const pub = await listComments(payload, adId, { verContatos: false, now: NOW })
      const json = JSON.stringify(pub)
      expect(json).not.toContain('99988')
      expect(json).not.toContain('lua@exemplo.com')
      expect(json).toContain(REDACTED_LABEL)
      expect(json).not.toMatch(/"author"/)
      expect(pub![0].semConta).toBe(true)
      const member = await listComments(payload, adId, { verContatos: true, meId: paying.id, now: NOW })
      expect(member![0].texto).toBe('Zap 61 99988-7766 e lua@exemplo.com')
    })

    it('visitante não apaga: nem o próprio comentário (sem identidade) nem o de outras pessoas', async () => {
      const res = await visitor()
      expect(((await deleteOwnComment(payload, free.id, res.id as number).catch((e) => e)) as { status: number }).status).toBe(404)
      expect(await rows({ id: { equals: res.id } })).toHaveLength(1)
    })

    it('REST e GraphQL seguem fechados para o comentário do visitante', async () => {
      const res = await visitor({ texto: 'Escrito sem conta' })
      const list = await rest('GET', ['ad-comments'])
      const one = await rest('GET', ['ad-comments', String(res.id)])
      const create = await rest('POST', ['ad-comments'], { body: { ad: adId, apelido: 'X', texto: 'y', semConta: true } })
      for (const r of [list, one, create]) {
        expect([401, 403, 404]).toContain(r.status)
        expect(r.text).not.toContain('Escrito sem conta')
      }
      const gql = await graphql('{ AdComments { docs { id texto } } }')
      expect(gql.text).not.toContain('Escrito sem conta')
    })

    it('a equipe oculta e apaga o comentário sem conta (registro sem conta de assinante)', async () => {
      const res = await visitor({ texto: 'Para moderar' })
      await payload.update({ collection: 'ad-comments', id: res.id as number, data: { status: 'oculto' }, overrideAccess: false, user: staffReq.user as never, req: staffReq })
      expect(await listComments(payload, adId, { verContatos: true, now: NOW })).toEqual([])
      expect((await audit('comentario-ocultado')).length).toBe(1)
      await payload.delete({ collection: 'ad-comments', id: res.id as number, overrideAccess: false, user: staffReq.user as never, req: staffReq })
      expect(await rows()).toHaveLength(0)
      expect((await audit('comentario-apagado')).length).toBe(1)
    })
  })

  describe('painel da equipe', () => {
    it('ocultar e reexibir gravam quem e quando, e entram no registro de ações', async () => {
      const { id } = await comment()
      await payload.update({ collection: 'ad-comments', id, data: { status: 'oculto' }, overrideAccess: false, user: staffReq.user as never, req: staffReq })
      const [hidden] = await rows({ id: { equals: id } })
      expect(hidden.status).toBe('oculto')
      expect(hidden.ocultadoEm).toBeTruthy()
      expect(hidden.ocultadoPor).toBe((staffReq.user as { id: number }).id)
      expect(await audit('comentario-ocultado')).toHaveLength(1)

      await payload.update({ collection: 'ad-comments', id, data: { status: 'publicado' }, overrideAccess: false, user: staffReq.user as never, req: staffReq })
      const [shown] = await rows({ id: { equals: id } })
      expect(shown.ocultadoEm ?? null).toBeNull()
      expect(shown.ocultadoPor ?? null).toBeNull()
      expect(await audit('comentario-reexibido')).toHaveLength(1)
    })

    it('apagar pela equipe entra no registro; apagar o próprio e cascatas não', async () => {
      const a = await comment({ texto: 'A' })
      const b = await comment({ texto: 'B' })
      await payload.delete({ collection: 'ad-comments', id: a.id, overrideAccess: false, user: staffReq.user as never, req: staffReq })
      const logged = await audit('comentario-apagado')
      expect(logged).toHaveLength(1)
      expect(String((logged[0] as { summary: string }).summary)).toContain(`#${a.id}`)
      await deleteOwnComment(payload, free.id, b.id)
      expect(await audit('comentario-apagado')).toHaveLength(1)
    })

    it('a equipe edita o texto; o resumo acompanha', async () => {
      const { id } = await comment({ texto: 'Texto antigo' })
      await payload.update({ collection: 'ad-comments', id, data: { texto: 'Texto novo' }, overrideAccess: true, context: { skipAudit: true } })
      const [row] = await rows({ id: { equals: id } })
      expect(row.texto).toBe('Texto novo')
      expect(String(row.resumo)).toContain('Texto novo')
    })
  })
})
