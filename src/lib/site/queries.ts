import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { Contact } from '../../payload-types'
import { cached } from '../cache/cached'
import type { ContactDTO } from './contact'

const text = (value: string | null | undefined) => (value ?? '').trim()
const num = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export function toContactDTO(doc: Partial<Contact> | null | undefined): ContactDTO {
  return {
    addressLine: text(doc?.addressLine),
    addressDetail: text(doc?.addressDetail),
    postalCode: text(doc?.postalCode),
    lat: num(doc?.lat),
    lng: num(doc?.lng),
    whatsapp: text(doc?.whatsapp).replace(/\D/g, ''),
    phone: text(doc?.phone),
    email: text(doc?.email),
    instagram: text(doc?.instagram).replace(/^@/, '') || null,
    hours: text(doc?.hours) || null,
  }
}

async function fetchContact(): Promise<ContactDTO> {
  const payload = await getPayload({ config })
  const doc = await payload.findGlobal({ slug: 'contact', depth: 0 })
  return toContactDTO(doc)
}

/** Contact global as a DTO, cached with tag 'contact' (expired by the global's afterChange hook). */
export const getContact = cached(fetchContact, ['site:contact'], () => ['contact'])
