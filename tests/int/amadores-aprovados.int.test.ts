import type { Payload } from 'payload'
import sharp from 'sharp'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { UploadFile } from '@/lib/classisex/service'
import { criarEnvioMidia } from '@/lib/midia-enviada/envio'
import { arquivoPublicado, getAmadoraEnviada, getAmadorasEnviadas, getVideosAmadores } from '@/lib/midia-enviada/publico'

import { buildMp4 } from '../helpers/mp4-fixtures'
import { getTestPayload, resetDatabase } from '../helpers/seed'

const NOW = new Date('2026-11-10T15:00:00.000Z')
let seq = 0
const CONTATO = 'segredo.contato@exemplo.com'
const MENSAGEM = 'mensagem-reservada-da-equipe'

async function foto(): Promise<UploadFile> {
  const data = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 120, g: 60, b: 90 } } }).png().toBuffer()
  return { data, mimetype: 'image/png', name: 'foto.png', size: data.length }
}
function video(seconds = 42): UploadFile {
  const data = buildMp4({ durationSeconds: seconds })
  return { data, mimetype: 'video/mp4', name: 'video.mp4', size: data.length }
}

describe('fotos e vídeos aprovados no site', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })
  beforeEach(async () => {
    await resetDatabase(payload)
  })

  async function enviar(apelido = 'Casal BSB') {
    seq += 1
    const { id } = await criarEnvioMidia(payload, {
      apelido,
      contato: `${seq}.${CONTATO}`,
      mensagem: MENSAGEM,
      maior18: true,
      autorizacao: true,
      website: '',
      files: [await foto(), video()],
      ip: `198.51.100.${seq}`,
      now: NOW,
    })
    const { docs } = await payload.find({
      collection: 'envios-midia-arquivos',
      where: { envio: { equals: id! } },
      overrideAccess: true,
      depth: 0,
      limit: 10,
    })
    return {
      envio: id!,
      foto: docs.find((d) => d.kind === 'foto')!,
      video: docs.find((d) => d.kind === 'video')!,
    }
  }
  const status = (id: number, s: 'novo' | 'aprovado' | 'recusado') =>
    payload.update({ collection: 'envios-midia', id, data: { status: s }, overrideAccess: true })

  it('shows nothing while the submission is new or refused', async () => {
    const a = await enviar()
    expect(await getAmadorasEnviadas()).toEqual([])
    expect(await getVideosAmadores()).toEqual([])
    expect(await arquivoPublicado(payload, a.foto.id)).toBeNull()
    expect(await arquivoPublicado(payload, a.video.id)).toBeNull()
    await status(a.envio, 'recusado')
    expect(await getAmadorasEnviadas()).toEqual([])
    expect(await getVideosAmadores()).toEqual([])
    expect(await arquivoPublicado(payload, a.foto.id)).toBeNull()
  })

  it('publishes photos and videos of an approved submission, and takes them down again', async () => {
    const a = await enviar()
    await status(a.envio, 'aprovado')

    const amadoras = await getAmadorasEnviadas()
    expect(amadoras).toHaveLength(1)
    expect(amadoras[0]).toMatchObject({
      envioId: a.envio,
      apelido: 'Casal BSB',
      fotoCount: 1,
      capa: { thumbUrl: `/amadores/foto/${a.foto.id}/miniatura`, alt: 'Foto de Casal BSB' },
    })
    expect(amadoras[0].fotos[0]).toMatchObject({
      id: String(a.foto.id),
      kind: 'photo',
      video: null,
      image: { url: `/amadores/foto/${a.foto.id}/foto`, alt: 'Foto de Casal BSB' },
    })
    expect((await getAmadoraEnviada(a.envio))?.apelido).toBe('Casal BSB')
    const videos = await getVideosAmadores()
    expect(videos).toHaveLength(1)
    expect(videos[0]).toMatchObject({ id: a.video.id })
    expect(JSON.stringify(videos)).not.toContain('Casal BSB')
    expect(videos[0].duracao).toBeGreaterThan(0)

    expect((await arquivoPublicado(payload, a.foto.id))?.kind).toBe('foto')
    expect((await arquivoPublicado(payload, a.video.id))?.kind).toBe('video')

    await status(a.envio, 'novo')
    expect(await getAmadorasEnviadas()).toEqual([])
    expect(await getAmadoraEnviada(a.envio)).toBeNull()
    expect(await getVideosAmadores()).toEqual([])
    expect(await arquivoPublicado(payload, a.foto.id)).toBeNull()
    expect(await arquivoPublicado(payload, a.video.id)).toBeNull()
  })

  it('hides only the file marked "Não mostrar no site"', async () => {
    const a = await enviar()
    await status(a.envio, 'aprovado')
    await payload.update({ collection: 'envios-midia-arquivos', id: a.video.id, data: { oculto: true }, overrideAccess: true })
    expect(await getVideosAmadores()).toEqual([])
    expect(await arquivoPublicado(payload, a.video.id)).toBeNull()
    expect(await getAmadorasEnviadas()).toHaveLength(1)
    // hiding the only photo leaves no card (a submission without a published photo is not listed)
    await payload.update({ collection: 'envios-midia-arquivos', id: a.foto.id, data: { oculto: true }, overrideAccess: true })
    expect(await getAmadorasEnviadas()).toEqual([])
    expect(await getAmadoraEnviada(a.envio)).toBeNull()
    await payload.update({ collection: 'envios-midia-arquivos', id: a.foto.id, data: { oculto: false }, overrideAccess: true })
    expect(await arquivoPublicado(payload, a.foto.id)).not.toBeNull()
  })

  it('never carries the contact, the message or the staff note to the public lists', async () => {
    const a = await enviar()
    await payload.update({
      collection: 'envios-midia',
      id: a.envio,
      data: { status: 'aprovado', observacao: 'observacao-interna-da-equipe' },
      overrideAccess: true,
    })
    const publico = JSON.stringify([await getAmadorasEnviadas(), await getVideosAmadores()])
    for (const segredo of [CONTATO, 'segredo.contato', MENSAGEM, 'observacao-interna', 'filename', '.webp', '.mp4']) {
      expect(publico).not.toContain(segredo)
    }
  })

  it('removing a submission removes its files from the site', async () => {
    const a = await enviar()
    await status(a.envio, 'aprovado')
    await payload.delete({ collection: 'envios-midia', id: a.envio, overrideAccess: true })
    expect(await getAmadorasEnviadas()).toEqual([])
    expect(await getVideosAmadores()).toEqual([])
    expect(await arquivoPublicado(payload, a.foto.id)).toBeNull()
  })

  it('lists newest first and only the approved ones among several submissions', async () => {
    const antigo = await enviar('Primeiro')
    const recente = await enviar('Segundo')
    await enviar('Terceiro') // stays new
    await status(antigo.envio, 'aprovado')
    await status(recente.envio, 'aprovado')
    expect((await getAmadorasEnviadas()).map((f) => f.apelido)).toEqual(['Segundo', 'Primeiro'])
    expect((await getVideosAmadores()).map((v) => v.id)).toEqual([recente.video.id, antigo.video.id])
  })
})
