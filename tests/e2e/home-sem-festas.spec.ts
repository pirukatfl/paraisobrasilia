import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'

// D-10: the home presents the house well without upcoming parties.
test.describe.configure({ mode: 'serial' })

let unpublished: number[] = []

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  unpublished = await api.setAllPartiesStatus('draft')
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.setAllPartiesStatus('published', unpublished)
  await api.deleteAll('space-items')
})

test('without parties the home shows the house: space, about and directions', async ({ page, request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('space-items')
  for (const order of [1, 2, 3, 4]) await api.createSpacePhoto({ order, alt: `Ambiente ${order}` })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Paraíso Brasília', level: 1 })).toBeVisible()
  const parties = page.getByRole('region', { name: 'Próximas festas' })
  await expect(parties).toContainText('Nenhuma festa agendada no momento')

  const space = page.getByRole('region', { name: 'Conheça o espaço' })
  await expect(space.getByRole('img')).toHaveCount(4)
  await expect(space.getByRole('link', { name: 'Ver galeria completa' })).toHaveAttribute('href', '/espaco')

  const about = page.getByRole('region', { name: 'Quem somos' })
  await expect(about).toContainText('casa de festas liberais para casais e solteiros')
  await expect(about.getByRole('link', { name: 'Conheça a casa' })).toHaveAttribute('href', '/quem-somos')

  const directions = page.getByRole('region', { name: 'Como chegar' })
  await expect(directions).toContainText('Rua 15, Travessa 01, Chácara 02')
  await expect(directions.getByRole('link', { name: 'Como chegar', exact: true })).toHaveAttribute('href', '/contato')
  await expect(directions.getByRole('link', { name: /Chamar no WhatsApp/ })).toHaveAttribute(
    'href',
    'https://wa.me/5561999889772',
  )

  await expect(page.locator('main iframe, main video')).toHaveCount(0)
})

test('without space photos the space section is hidden, the others stay', async ({ page, request }) => {
  const api = await staffApi(request)
  await api.deleteAll('space-items')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Paraíso Brasília', level: 1 })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Conheça o espaço' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Quem somos' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Como chegar' })).toBeVisible()
})
