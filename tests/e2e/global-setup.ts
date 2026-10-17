import { brasiliaAt } from '../helpers/dates'
import { getTestPayload, resetDatabase, seedParty, seedStaffUser } from '../helpers/seed'

export const STAFF_EMAIL = 'equipe@teste.local'

export default async function globalSetup(): Promise<void> {
  // Remote staging is read-only: never seed it.
  if (process.env.E2E_BASE_URL) return

  const payload = await getTestPayload()
  await resetDatabase(payload)
  await seedStaffUser(payload, {
    email: STAFF_EMAIL,
    password: process.env.E2E_STAFF_PASSWORD ?? 'senha-de-teste-123',
  })

  try {
    await seedParty(payload, {
      title: 'Festa de Teste',
      flyerFormat: 'portrait',
      startsAt: brasiliaAt(3, 23),
    })
  } catch (err) {
    console.warn(`[global-setup] party seed skipped: ${(err as Error).message}`)
  }
}
