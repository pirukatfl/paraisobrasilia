import { brasiliaAt } from '../helpers/dates'
import { getTestPayload, resetDatabase, seedContact, seedPages, seedParty, seedStaffUser } from '../helpers/seed'

export const STAFF_EMAIL = 'equipe@teste.local'

export default async function globalSetup(): Promise<void> {
  // Remote staging is read-only: never seed it.
  if (process.env.E2E_BASE_URL) return

  const payload = await getTestPayload()
  await resetDatabase(payload)
  await seedContact(payload)
  await seedPages(payload)
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
