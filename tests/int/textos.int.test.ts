import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AREAS } from '../../src/lib/textos/areas'
import { mesclarTextos } from '../../src/lib/textos/mesclar'
import { getTestPayload, resetDatabase, seedAssinante, seedStaffUser } from '../helpers/seed'

describe('textos do site editáveis pelo painel (PAINEL-10)', () => {
  let payload: Payload
  let staff: Awaited<ReturnType<typeof seedStaffUser>>
  let assinante: Awaited<ReturnType<typeof seedAssinante>>

  const ler = async () => (await payload.findGlobal({ slug: 'textos-inicio', overrideAccess: false })) as unknown as Record<string, unknown>

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    staff = await seedStaffUser(payload, { email: 'textos@teste.local', password: 'senha-de-teste-123' })
    assinante = await seedAssinante(payload, {
      email: 'textos-assinante@teste.local',
      password: 'senha-de-teste-123',
      name: 'Assinante de Teste',
    })
  })

  afterAll(async () => {
    await payload.updateGlobal({ slug: 'textos-inicio', data: { tituloProximasFestas: '' }, overrideAccess: true })
  })

  it('anônimo lê textos-inicio e recebe os padrões', async () => {
    const doc = await ler()
    expect(mesclarTextos(AREAS.inicio, doc).tituloProximasFestas).toBe('Próximas festas')
  })

  it('assinante não consegue alterar os textos', async () => {
    await expect(
      payload.updateGlobal({
        slug: 'textos-inicio',
        overrideAccess: false,
        user: { ...assinante, collection: 'assinantes' } as never,
        data: { tituloProximasFestas: 'Invasão' },
      }),
    ).rejects.toThrow(/permiss|forbidden|not allowed/i)
  })

  it('anônimo não consegue alterar os textos', async () => {
    await expect(
      payload.updateGlobal({ slug: 'textos-inicio', overrideAccess: false, data: { tituloProximasFestas: 'Invasão' } }),
    ).rejects.toThrow(/permiss|forbidden|not allowed/i)
  })

  it('equipe salva um valor e mesclarTextos devolve o valor; vazio volta ao padrão', async () => {
    await payload.updateGlobal({
      slug: 'textos-inicio',
      overrideAccess: false,
      user: staff,
      data: { tituloProximasFestas: 'Festas que vêm aí' },
    })
    expect(mesclarTextos(AREAS.inicio, await ler()).tituloProximasFestas).toBe('Festas que vêm aí')

    await payload.updateGlobal({
      slug: 'textos-inicio',
      overrideAccess: false,
      user: staff,
      data: { tituloProximasFestas: '' },
    })
    expect(mesclarTextos(AREAS.inicio, await ler()).tituloProximasFestas).toBe('Próximas festas')

    await payload.updateGlobal({
      slug: 'textos-inicio',
      overrideAccess: false,
      user: staff,
      data: { tituloProximasFestas: '   ' },
    })
    expect(mesclarTextos(AREAS.inicio, await ler()).tituloProximasFestas).toBe('Próximas festas')
  })
})
