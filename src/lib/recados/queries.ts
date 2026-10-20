import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { OwnRecadoDTO } from './dto'
import { findVisibleRecados, type RecadosPage } from './board'
import { listOwnRecados } from './service'

// Subscriber-specific reads: never cached; callers run the DAL guard first (T-05-02).

export async function listBoard(page: number, viewerId: number): Promise<RecadosPage> {
  const payload = await getPayload({ config })
  return findVisibleRecados(payload, { page }, new Date(), viewerId)
}

export async function getOwnRecados(assinanteId: number): Promise<OwnRecadoDTO[]> {
  const payload = await getPayload({ config })
  return listOwnRecados(payload, assinanteId, new Date())
}
