/**
 * Short-lived proof that a browser just created a submission, so it can add the remaining files one by one
 * (a 250 MB video cannot travel together with ten photos). HMAC over `id.expiry` with the site secret; it
 * only lets the holder ADD files to that one submission, within the limits, until it expires.
 * No 'server-only' import: used by route handlers and int tests.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export const TOKEN_TTL_MS = 30 * 60 * 1000

function secret(): string {
  const value = process.env.PAYLOAD_SECRET
  if (!value) throw new Error('PAYLOAD_SECRET is not set')
  return value
}

const sign = (payload: string) => createHmac('sha256', secret()).update(`envio-midia:${payload}`).digest('hex')

export function criarToken(envioId: number, now: Date): string {
  const payload = `${envioId}.${now.getTime() + TOKEN_TTL_MS}`
  return `${payload}.${sign(payload)}`
}

/** The submission id when the token is genuine and not expired, else null. */
export function lerToken(token: string, now: Date): number | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [id, expiry, mac] = parts as [string, string, string]
  if (!/^\d{1,12}$/.test(id) || !/^\d{10,16}$/.test(expiry)) return null
  const expected = Buffer.from(sign(`${id}.${expiry}`))
  const given = Buffer.from(mac)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  if (Number(expiry) < now.getTime()) return null
  return Number(id)
}
