import fs from 'fs'
import path from 'path'

import { brasiliaAt } from '../helpers/dates'
import { getTestPayload, resetDatabase, seedContact, seedPages, seedParty, seedStaffUser } from '../helpers/seed'

export const STAFF_EMAIL = 'equipe@teste.local'

export default async function globalSetup(): Promise<void> {
  // Remote staging is read-only: never seed it.
  if (process.env.E2E_BASE_URL) return

  const payload = await getTestPayload()
  await resetDatabase(payload)
  // The reset runs outside the Next server, so its cache hooks cannot expire anything: drop the
  // dev server's persisted data and image caches, or a previous run's gallery would be served.
  for (const dir of ['.next/dev/cache/fetch-cache', '.next/dev/cache/images']) {
    fs.rmSync(path.resolve(dir), { recursive: true, force: true })
  }
  // ClassiSex private files left by a previous run (the reset above deleted their documents)
  fs.rmSync(path.resolve('private-media'), { recursive: true, force: true })
  await seedContact(payload)
  await seedPages(payload)
  // Same state as a fresh deploy: the four plans from the migration seed (D-03)
  const { seedPlansIfEmpty } = await import('../../src/migrations/seed/plans-content')
  await seedPlansIfEmpty(payload)
  // ClassiSex Eu sou options (Casal, Solteiro, Solteira), as the classisex_ads migration seeds them
  const { seedAdCategoriesIfEmpty } = await import('../../src/migrations/seed/ad-categories-content')
  await seedAdCategoriesIfEmpty(payload)
  await seedStaffUser(payload, {
    email: STAFF_EMAIL,
    password: process.env.E2E_STAFF_PASSWORD ?? 'senha-de-teste-123',
  })

  try {
    await seedParty(payload, {
      title: 'Festa de Teste',
      flyerFormat: 'portrait',
      startsAt: brasiliaAt(3, 23),
      summary: 'Uma noite de teste para casais e solteiros.',
      prices: [
        { label: 'Casal', value: 'R$ 150' },
        { label: 'Mulher sozinha', value: 'R$ 50' },
        { label: 'Homem sozinho', value: 'R$ 250' },
      ],
      dressCode: 'Preto e vermelho',
      attractions: [{ kind: 'dj', name: 'DJ Teste' }],
      details: 'Abertura da casa às 23h. Traje elegante.',
    })
    // Flyers in other social formats: shown whole at their own proportions (no 4:5 crop)
    await seedParty(payload, { title: 'Festa Paisagem', flyerFormat: 'landscape', startsAt: brasiliaAt(5, 23) })
    await seedParty(payload, { title: 'Festa Stories', flyerFormat: 'stories', startsAt: brasiliaAt(6, 23) })
    // Ended yesterday morning: reachable by direct link, absent from the home page
    await seedParty(payload, {
      title: 'Festa Passada',
      flyerFormat: 'square',
      startsAt: brasiliaAt(-2, 23),
      endsAt: brasiliaAt(-1, 9),
    })
  } catch (err) {
    console.warn(`[global-setup] party seed skipped: ${(err as Error).message}`)
  }
}
