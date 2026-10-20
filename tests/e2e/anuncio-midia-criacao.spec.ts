import fs from 'fs'
import path from 'path'

import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'

// Client feedback 2026-10-20: photos and videos can be attached while CREATING the ad. The browser
// creates the ad, then posts each file to the owner route one by one (server checks unchanged).
test.describe.configure({ mode: 'serial' })

const CRIS = { email: 'cris@teste.local', name: 'Cris Cria', password: 'senha-criacao-12345', whatsapp: '5561999990000' }
const DECLARACAO =
  'Declaro que tenho 18 anos ou mais, que as informações são verdadeiras e que todas as pessoas das fotos e do vídeo são maiores de idade e autorizaram a publicação.'
const FIXTURES = path.resolve('tests/fixtures')
const NOVO = '/area-do-assinante/meus-anuncios/novo'
const photo = (n: string) => path.join(FIXTURES, n)

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  const id = (await api.createAssinante(CRIS)).id
  await api.liberar(id, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.dispose()
})

async function openForm(page: import('@playwright/test').Page) {
  await loginAsAssinante(page, CRIS.email, CRIS.password)
  await page.goto(NOVO)
  const main = page.locator('main')
  await expect(main.getByLabel('Escolher fotos (0 de 10)')).toBeVisible()
  return main
}

async function fillText(main: import('@playwright/test').Locator, apelido: string) {
  await main.getByLabel('Apelido').fill(apelido)
  await main.getByRole('group', { name: 'Eu sou' }).getByRole('radio', { name: 'Casal' }).check()
  await main.getByLabel('Texto do anúncio').fill('Casal simpático procura amizades em Brasília.')
  await main.getByLabel(DECLARACAO).check()
}

test('create an ad with 2 photos and 1 video in one flow, then see them on the edit page', async ({ browser, baseURL, request }) => {
  test.setTimeout(120_000)
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  const main = await openForm(page)
  await expect(main.getByLabel('Escolher fotos (0 de 10)')).toHaveAttribute('accept', 'image/*')
  await expect(main.getByLabel('Escolher vídeos (0 de 2)')).toHaveAttribute('accept', 'video/*')
  await expect(main.getByLabel('Escolher fotos (0 de 10)')).toHaveAttribute('multiple', '')

  await fillText(main, 'Casal Mídia')
  await main.getByLabel('Escolher fotos (0 de 10)').setInputFiles([photo('flyer-square.jpg'), photo('flyer-portrait.jpg')])
  await main.getByLabel('Escolher vídeos (0 de 2)').setInputFiles(photo('espaco.mp4'))
  await expect(main.getByRole('list', { name: 'Fotos escolhidas' }).locator('img')).toHaveCount(2)
  await expect(main.getByRole('list', { name: 'Vídeos escolhidos' }).locator('video')).toHaveCount(1)
  await expect(main.getByLabel('Escolher fotos (2 de 10)')).toBeVisible()

  await main.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await page.waitForURL(/\/meus-anuncios\/\d+\/editar\?midia=lote/, { timeout: 60_000 })
  const adId = Number(/meus-anuncios\/(\d+)\/editar/.exec(page.url())![1])
  await expect(main.getByRole('alert')).toContainText('Anúncio criado e enviado para análise da equipe. 3 arquivos enviados.')
  const section = main.getByRole('region', { name: 'Fotos e vídeos' })
  await expect(section.getByRole('list', { name: 'Fotos do anúncio' }).locator('img')).toHaveCount(2)
  await expect(section).toContainText(/Vídeo 1 · \d+:\d\d/)

  const api = await staffApi(request)
  expect((await api.getAd(adId)).status).toBe('pendente')
  const media = await api.findAdMedia(adId)
  expect(media.filter((m) => m.kind === 'foto')).toHaveLength(2)
  expect(media.filter((m) => m.kind === 'video')).toHaveLength(1)
  await api.dispose()
  await context.close()
})

test('the client refuses an 11th photo, a 3rd video, and a wrong type', async ({ browser, baseURL }) => {
  test.setTimeout(120_000)
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  const main = await openForm(page)

  const eleven = Array.from({ length: 11 }, () => photo('flyer-square.jpg'))
  await main.getByLabel('Escolher fotos (0 de 10)').setInputFiles(eleven)
  await expect(main.getByRole('list', { name: 'Fotos escolhidas' }).locator('img')).toHaveCount(10)
  await expect(main.getByRole('alert')).toContainText('Você pode escolher até 10 fotos.')
  await expect(main.getByLabel('Escolher fotos (10 de 10)')).toBeVisible()

  await main.getByLabel('Escolher vídeos (0 de 2)').setInputFiles([photo('espaco.mp4'), photo('espaco.mp4'), photo('espaco.mp4')])
  await expect(main.getByRole('list', { name: 'Vídeos escolhidos' }).locator('video')).toHaveCount(2)
  await expect(main.getByRole('alert')).toContainText('Você pode escolher até 2 vídeos.')

  // A video whose length the browser cannot read is left to the server (covered in anuncio-midia.spec.ts)
  await main.getByRole('button', { name: 'Tirar vídeo 2' }).click()
  await expect(main.getByLabel('Escolher vídeos (1 de 2)')).toBeVisible()
  await main.getByRole('button', { name: 'Tirar foto 10' }).click()
  await main.getByLabel('Escolher fotos (9 de 10)').setInputFiles({ name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('oi') })
  await expect(main.getByRole('alert')).toContainText('não é uma foto JPG, PNG ou WebP')
  await context.close()
})

test('the server keeps refusing an 11th photo and a 3rd video, and the ad stays with a clear message', async ({ browser, baseURL, request }) => {
  test.setTimeout(180_000)
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  const main = await openForm(page)
  await fillText(main, 'Casal Limites')
  // Bypass the client limits to prove the server refuses: add files straight to the route after creating the ad
  await main.getByLabel('Escolher fotos (0 de 10)').setInputFiles(Array.from({ length: 10 }, () => photo('flyer-square.jpg')))
  await main.getByLabel('Escolher vídeos (0 de 2)').setInputFiles([photo('espaco.mp4'), photo('espaco.mp4')])
  await main.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await page.waitForURL(/\/meus-anuncios\/\d+\/editar\?midia=lote/, { timeout: 120_000 })
  const adId = Number(/meus-anuncios\/(\d+)\/editar/.exec(page.url())![1])
  await expect(main.getByRole('alert')).toContainText('12 arquivos enviados.')

  const post = (tipo: string, file: string, type: string) =>
    page.evaluate(
      async ([u, t, b64, ty]) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
        const body = new FormData()
        body.append('tipo', t)
        body.append('arquivo', new File([bytes], 'extra', { type: ty }))
        return (await fetch(u, { method: 'POST', body, credentials: 'include' })).url
      },
      [`/area-do-assinante/meus-anuncios/${adId}/midia`, tipo, fs.readFileSync(photo(file)).toString('base64'), type],
    )
  expect(await post('foto', 'flyer-square.jpg', 'image/jpeg')).toContain('codigo=limite-fotos')
  expect(await post('video', 'espaco.mp4', 'video/mp4')).toContain('codigo=limite-video')

  // A rejected file keeps the ad and explains why (notice built from fixed codes only)
  await page.goto(`/area-do-assinante/meus-anuncios/${adId}/editar?midia=lote&ok=2&falhas=1&codigo=longo`)
  await expect(main.getByRole('alert')).toContainText('1 arquivo não foi aceito')
  await expect(main.getByRole('alert')).toContainText('O vídeo pode ter até 60 segundos.')
  await expect(main.getByRole('region', { name: 'Fotos e vídeos' })).toBeVisible()

  const api2 = await staffApi(request)
  const media = await api2.findAdMedia(adId)
  expect(media.filter((m) => m.kind === 'foto')).toHaveLength(10)
  expect(media.filter((m) => m.kind === 'video')).toHaveLength(2)
  await api2.dispose()
  await context.close()
})
