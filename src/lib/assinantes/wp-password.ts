// Verifier for WordPress password hashes (M-03): lets old members enter with the old password.
//
// Ported from WordPress core (tags 6.8 and 6.9):
//  - wp-includes/pluggable.php  wp_hash_password / wp_check_password  ($wp$2y$...)
//      hash  = '$wp' . password_hash( base64_encode( hash_hmac( 'sha384', trim($pw), 'wp-sha384', true ) ), PASSWORD_BCRYPT )
//      check = password_verify( base64_encode( hash_hmac( 'sha384', $pw, 'wp-sha384', true ) ), substr( $hash, 3 ) )
//  - wp-includes/class-phpass.php  PasswordHash(8, true)->CheckPassword / crypt_private / encode64  ($P$...)
//
// Pure module: only node:crypto and bcryptjs (no Payload, no Next).
// T-06-01: never logs the password or the hash.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

import bcrypt from 'bcryptjs'

/** Same limit as wp_check_password (bytes, UTF-8). */
export const WP_PASSWORD_MAX = 4096

export type WpHashKind = 'wp-bcrypt' | 'phpass' | 'desconhecido'

const WP_BCRYPT_RE = /^\$wp\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/
const PHPASS_RE = /^\$P\$[./A-Za-z0-9]{31}$/
const ITOA64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

export function wpHashKind(hash: string | null | undefined): WpHashKind {
  if (typeof hash !== 'string') return 'desconhecido'
  if (WP_BCRYPT_RE.test(hash)) return 'wp-bcrypt'
  if (PHPASS_RE.test(hash)) return 'phpass'
  return 'desconhecido'
}

function encode64(input: Buffer, count: number): string {
  let output = ''
  let i = 0
  do {
    let value = input[i++]
    output += ITOA64[value & 0x3f]
    if (i < count) value |= input[i] << 8
    output += ITOA64[(value >> 6) & 0x3f]
    if (i++ >= count) break
    if (i < count) value |= input[i] << 16
    output += ITOA64[(value >> 12) & 0x3f]
    if (i++ >= count) break
    output += ITOA64[(value >> 18) & 0x3f]
  } while (i < count)
  return output
}

function phpassMatches(password: string, hash: string): boolean {
  const log2 = ITOA64.indexOf(hash[3])
  if (log2 < 7 || log2 > 30) return false
  const salt = hash.slice(4, 12)
  if (salt.length !== 8) return false
  const pw = Buffer.from(password, 'utf8')
  let h = createHash('md5')
    .update(Buffer.concat([Buffer.from(salt, 'latin1'), pw]))
    .digest()
  let count = 2 ** log2
  do {
    h = createHash('md5').update(Buffer.concat([h, pw])).digest()
  } while (--count)
  const computed = Buffer.from(hash.slice(0, 12) + encode64(h, 16), 'latin1')
  const expected = Buffer.from(hash, 'latin1')
  return computed.length === expected.length && timingSafeEqual(computed, expected)
}

async function wpBcryptMatches(password: string, hash: string): Promise<boolean> {
  const pre = createHmac('sha384', 'wp-sha384').update(password, 'utf8').digest('base64')
  const inner = hash.slice(3)
  try {
    return await bcrypt.compare(pre, inner)
  } catch {
    try {
      return await bcrypt.compare(pre, inner.replace(/^\$2y\$/, '$2b$'))
    } catch {
      return false
    }
  }
}

export async function verifyWpPassword(password: string, hash: string): Promise<boolean> {
  try {
    if (typeof password !== 'string' || typeof hash !== 'string') return false
    if (Buffer.byteLength(password, 'utf8') > WP_PASSWORD_MAX) return false
    const kind = wpHashKind(hash)
    if (kind === 'desconhecido') return false
    // WordPress hashed trim(password) but checks the untrimmed input: try both.
    const candidates = password.trim() !== password ? [password, password.trim()] : [password]
    for (const candidate of candidates) {
      const ok =
        kind === 'wp-bcrypt'
          ? await wpBcryptMatches(candidate, hash)
          : phpassMatches(candidate, hash)
      if (ok) return true
    }
    return false
  } catch {
    return false
  }
}
