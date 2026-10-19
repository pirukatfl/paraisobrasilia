import type { APIRequestContext } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { STAFF_EMAIL, STAFF_PASSWORD } from './staff'

const FIXTURES = path.resolve('tests/fixtures')

/**
 * Staff REST client for e2e data setup. Writes go through the running Next server, so Payload
 * hooks expire the Next cache tags exactly as when staff use the panel (seeding with the Local API
 * from the test process could not reach the server's cache).
 */
export async function staffApi(request: APIRequestContext) {
  const login = await request.post('/api/users/login', { data: { email: STAFF_EMAIL, password: STAFF_PASSWORD } })
  if (!login.ok()) throw new Error(`staff login failed: ${login.status()}`)
  const { token } = (await login.json()) as { token: string }
  const headers = { Authorization: `JWT ${token}` }

  const check = async (res: Awaited<ReturnType<APIRequestContext['post']>>, what: string) => {
    if (!res.ok()) throw new Error(`${what} failed: ${res.status()} ${await res.text()}`)
    return (await res.json()) as { doc: { id: number; url?: string; filename?: string } }
  }

  const upload = async (collection: 'media' | 'videos', fixture: string, data: Record<string, unknown>) => {
    const file = path.join(FIXTURES, fixture)
    const res = await request.post(`/api/${collection}`, {
      headers,
      multipart: {
        _payload: JSON.stringify(data),
        file: {
          name: fixture,
          mimeType: fixture.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg',
          buffer: fs.readFileSync(file),
        },
      },
    })
    return (await check(res, `upload ${collection}`)).doc
  }

  return {
    headers,
    async createSpacePhoto(opts: { alt?: string; order?: number; caption?: string; fixture?: string } = {}) {
      const media = await upload('media', opts.fixture ?? 'flyer-square.jpg', { alt: opts.alt ?? 'Pista de dança do Paraíso' })
      const res = await request.post('/api/space-items', {
        headers,
        data: { kind: 'photo', image: media.id, order: opts.order ?? 0, caption: opts.caption, _status: 'published' },
      })
      return (await check(res, 'create space item')).doc
    },
    async createSpaceVideo(opts: { title?: string; order?: number } = {}) {
      const poster = await upload('media', 'flyer-portrait.jpg', { alt: 'Capa do vídeo do espaço' })
      const video = await upload('videos', 'espaco.mp4', {
        title: opts.title ?? 'Pista de dança numa noite de festa',
        poster: poster.id,
      })
      const res = await request.post('/api/space-items', {
        headers,
        data: { kind: 'video', video: video.id, order: opts.order ?? 0, _status: 'published' },
      })
      return { item: (await check(res, 'create space video')).doc, video }
    },
    async createModel(opts: { name: string; photos: number; order?: number; published?: boolean }) {
      const photos = []
      for (let i = 0; i < opts.photos; i++) {
        const media = await upload('media', i % 2 ? 'flyer-square.jpg' : 'flyer-portrait.jpg', {
          alt: `${opts.name} — foto ${i + 1}`,
        })
        photos.push({ image: media.id })
      }
      const res = await request.post('/api/models', {
        headers,
        data: { name: opts.name, photos, order: opts.order ?? 0, _status: opts.published === false ? 'draft' : 'published' },
      })
      return (await check(res, 'create model')).doc
    },
    /** Publishes or unpublishes every party (restores the global-setup state afterwards). */
    async setAllPartiesStatus(status: 'draft' | 'published', onlyIds?: number[]) {
      const res = await request.get('/api/parties?limit=200&depth=0&draft=true', { headers })
      const { docs } = (await res.json()) as { docs: { id: number; _status: string }[] }
      const changed: number[] = []
      for (const doc of docs) {
        if (onlyIds && !onlyIds.includes(doc.id)) continue
        if (doc._status === status) continue
        const upd = await request.patch(`/api/parties/${doc.id}`, { headers, data: { _status: status } })
        if (!upd.ok()) throw new Error(`party ${doc.id} → ${status} failed: ${upd.status()}`)
        changed.push(doc.id)
      }
      return changed
    },
    /** Subscriber account created by staff (D-01); `whatsapp` optional. */
    async createAssinante(data: { email: string; password: string; name: string; whatsapp?: string }) {
      const res = await request.post('/api/assinantes', { headers, data })
      return (await check(res, 'create assinante')).doc as { id: number; url?: string; filename?: string }
    },
    async createPlan(data: { name: string; durationDays: number; price: number; promoPrice?: number; paymentUrl?: string; active?: boolean; order?: number }) {
      const res = await request.post('/api/plans', { headers, data })
      return (await check(res, 'create plan')).doc
    },
    async updatePlan(id: number, data: Record<string, unknown>) {
      const res = await request.patch(`/api/plans/${id}`, { headers, data })
      return (await check(res, 'update plan')).doc
    },
    async findPlans() {
      const res = await request.get('/api/plans?limit=50&depth=0&sort=order', { headers })
      if (!res.ok()) throw new Error(`find plans failed: ${res.status()}`)
      return ((await res.json()) as { docs: { id: number; name: string; price: number; promoPrice?: number | null; paymentUrl?: string | null; active: boolean }[] }).docs
    },
    /** Subscription period (staff REST). endsAt empty = computed from the plan. */
    async createSubscription(data: {
      assinante: number
      plan?: number
      startsAt: string
      endsAt?: string
      status?: 'ativa' | 'encerrada'
      payment?: { method: string; amount?: number; note?: string }
    }) {
      const res = await request.post('/api/subscriptions', {
        headers,
        data: { status: 'ativa', payment: { method: 'pix', amount: 30 }, ...data },
      })
      return (await check(res, 'create subscription')).doc as unknown as { id: number; startsAt: string; endsAt: string }
    },
    async endSubscription(id: number) {
      const res = await request.patch(`/api/subscriptions/${id}`, { headers, data: { status: 'encerrada' } })
      return (await check(res, 'end subscription')).doc
    },
    /** Staff action "Liberar acesso" / "Renovar" (server computes the dates). */
    async liberar(
      id: number,
      body: { planId?: number | null; durationDays?: number; amount?: number; method?: string; note?: string } = {},
    ) {
      const res = await request.post(`/api/assinantes/${id}/liberar`, { headers, data: { method: 'pix', ...body } })
      if (!res.ok()) throw new Error(`liberar failed: ${res.status()} ${await res.text()}`)
      return (await res.json()) as { subscriptionId: number; startsAt: string; endsAt: string; validUntilLabel: string }
    },
    /** Staff REST GET (JSON). */
    async get(path: string) {
      const res = await request.get(path, { headers })
      if (!res.ok()) throw new Error(`GET ${path} failed: ${res.status()}`)
      return (await res.json()) as { docs: unknown[] } & Record<string, unknown>
    },
    /** Staff action "Gerar link de nova senha" (48 h, single use). */
    async linkSenha(id: number) {
      const res = await request.post(`/api/assinantes/${id}/link-senha`, { headers, data: {} })
      if (!res.ok()) throw new Error(`link-senha failed: ${res.status()} ${await res.text()}`)
      return (await res.json()) as { url: string; expiresAt: string; whatsappUrl: string | null }
    },
    /** Staff sets a temporary password (field Senha on the subscriber page). */
    async setPassword(id: number, password: string) {
      const res = await request.patch(`/api/assinantes/${id}`, { headers, data: { password } })
      return (await check(res, 'set password')).doc
    },
    async encerrar(id: number, reason: string) {
      const res = await request.post(`/api/assinantes/${id}/encerrar`, { headers, data: { reason } })
      if (!res.ok()) throw new Error(`encerrar failed: ${res.status()} ${await res.text()}`)
      return (await res.json()) as { ended: number }
    },
    async deleteAll(collection: string) {
      const res = await request.delete(`/api/${collection}?where[id][exists]=true&limit=500`, { headers })
      if (!res.ok()) throw new Error(`delete ${collection} failed: ${res.status()}`)
    },
    async dispose() {
      await request.post('/api/users/logout', { headers }).catch(() => undefined)
    },
  }
}
