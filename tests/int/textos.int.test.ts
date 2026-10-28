import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AREAS } from '../../src/lib/textos/areas'
import { mesclarTextos } from '../../src/lib/textos/mesclar'
import { ricoParaTexto, type TextoRico, textoParaRico } from '../../src/lib/textos/rico'
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
    // Back to what a never-edited global holds (the original text as editor state), not NULL: the admin shows NULL as an empty editor
    await payload.updateGlobal({
      slug: 'textos-espaco',
      data: { intro: JSON.parse(JSON.stringify(textoParaRico(AREAS.espaco.campos.intro.padrao))) },
      overrideAccess: true,
    })
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

  describe('textos formatados (editor)', () => {
    const lerEspaco = async () =>
      (await payload.findGlobal({ slug: 'textos-espaco', overrideAccess: false })) as unknown as Record<string, unknown>

    // Payload's generated type for richText has an index signature the plain editor-state type lacks: hand it parsed JSON
    const paraPayload = (rico: TextoRico) => JSON.parse(JSON.stringify(rico))
    // The only numeric `format` of the one-word state is the text node's: 1 = bold
    const comNegrito = () => JSON.parse(JSON.stringify(textoParaRico('Conheça o espaço')).replace('"format":0', '"format":1'))

    it('anônimo lê o padrão do campo formatado já como editor, igual ao original', async () => {
      const doc = await lerEspaco()
      expect(ricoParaTexto(mesclarTextos(AREAS.espaco, doc).intro)).toBe(AREAS.espaco.campos.intro.padrao)
    })

    it('equipe salva texto com negrito e o site recebe o JSON salvo', async () => {
      await payload.updateGlobal({ slug: 'textos-espaco', overrideAccess: false, user: staff, data: { intro: comNegrito() } })
      const salvo = mesclarTextos(AREAS.espaco, await lerEspaco()).intro
      expect(ricoParaTexto(salvo)).toBe('Conheça o espaço')
      expect(JSON.stringify(salvo)).toContain('"format":1')
    })

    it('editor esvaziado volta ao texto original', async () => {
      const vazio = paraPayload(textoParaRico(''))
      vazio.root.children.push({ type: 'paragraph', version: 1, children: [] })
      await payload.updateGlobal({ slug: 'textos-espaco', overrideAccess: false, user: staff, data: { intro: vazio } })
      expect(ricoParaTexto(mesclarTextos(AREAS.espaco, await lerEspaco()).intro)).toBe(AREAS.espaco.campos.intro.padrao)

      await payload.updateGlobal({ slug: 'textos-espaco', overrideAccess: false, user: staff, data: { intro: null } })
      expect(ricoParaTexto(mesclarTextos(AREAS.espaco, await lerEspaco()).intro)).toBe(AREAS.espaco.campos.intro.padrao)
    })

    it('anônimo e assinante não alteram campo formatado', async () => {
      await expect(
        payload.updateGlobal({ slug: 'textos-espaco', overrideAccess: false, data: { intro: comNegrito() } }),
      ).rejects.toThrow(/permiss|forbidden|not allowed/i)
      await expect(
        payload.updateGlobal({
          slug: 'textos-espaco',
          overrideAccess: false,
          user: { ...assinante, collection: 'assinantes' } as never,
          data: { intro: comNegrito() },
        }),
      ).rejects.toThrow(/permiss|forbidden|not allowed/i)
    })
  })
})
