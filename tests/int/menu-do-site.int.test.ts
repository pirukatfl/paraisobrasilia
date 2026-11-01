import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { toMenuConfig } from '../../src/lib/site/menu'
import { getTestPayload, resetDatabase, seedStaffUser } from '../helpers/seed'

describe('menu-do-site global (Menu do site)', () => {
  let payload: Payload
  let staff: Awaited<ReturnType<typeof seedStaffUser>>

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    staff = await seedStaffUser(payload, { email: 'menu@teste.local', password: 'senha-de-teste-123' })
  })

  afterAll(async () => {
    await resetDatabase(payload)
  })

  const asStaff = (data: Record<string, unknown>) =>
    payload.updateGlobal({ slug: 'menu-do-site', overrideAccess: false, user: staff, data: data as never })

  it('anonymous visitors can read it (nothing secret in it) and the original link applies while never saved', async () => {
    const doc = await payload.findGlobal({ slug: 'menu-do-site', overrideAccess: false })
    const cfg = toMenuConfig(doc)
    expect(cfg.ocultos).toEqual([])
    expect(cfg.linkExterno?.url).toBe('https://www.redtube.com.br/')
  })

  it('anonymous visitors and subscribers cannot change it', async () => {
    await expect(
      payload.updateGlobal({ slug: 'menu-do-site', overrideAccess: false, data: { itensOcultos: ['espaco'] } as never }),
    ).rejects.toThrow(/permiss|forbidden|not allowed/i)
  })

  it('staff hide items and turn the external link off', async () => {
    const saved = await asStaff({ itensOcultos: ['espaco', 'galeria-amadoras'], linkExterno: { ativo: false } })
    expect(saved.itensOcultos).toEqual(['espaco', 'galeria-amadoras'])
    const cfg = toMenuConfig(await payload.findGlobal({ slug: 'menu-do-site', overrideAccess: false }))
    expect(cfg.ocultos).toEqual(['espaco', 'galeria-amadoras'])
    expect(cfg.linkExterno).toBeNull()
  })

  it('rejects unknown items and addresses that are not http(s)', async () => {
    await expect(asStaff({ itensOcultos: ['inexistente'] })).rejects.toThrow()
    await expect(asStaff({ linkExterno: { url: 'javascript:alert(1)' } })).rejects.toThrow()
    await expect(asStaff({ linkExterno: { url: 'redtube.com.br' } })).rejects.toThrow()
    const ok = await asStaff({ itensOcultos: [], linkExterno: { ativo: true, rotulo: 'Outro site', url: 'https://exemplo.com.br/' } })
    expect(ok.linkExterno?.url).toBe('https://exemplo.com.br/')
  })
})
