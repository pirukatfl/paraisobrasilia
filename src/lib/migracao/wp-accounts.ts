/**
 * Account extraction from a WordPress dump (M-01, M-02). Pure: no database, no Payload, no Next.
 */
// T-06-04: reads only users + 3 usermeta keys; nothing here is ever printed
import { wpHashKind, type WpHashKind } from '../assinantes/wp-password'
import { addDaysToDate, spDate, spMidnight } from '../assinantes/periods'
import { APELIDO_MAX } from '../classisex/rules'
import type { Row, WpTables } from '../contos/wp-dump'
import { recadoApelidoError } from '../recados/rules'
import { serializedKeys } from './php-serialized'

export const MIGRACAO_TABLES = ['users', 'usermeta', 'comments', 'commentmeta', 'posts', 'postmeta'] as const

export const USERMETA_KEYS = (prefix: string) => [`${prefix}capabilities`, '_expire_user_date', '_expire_user_expired']

/** Row filter that keeps memory (and exposure) to what the migration needs. */
export function migracaoRowFilter(prefix: string, postId: number): (table: string, row: Row) => boolean {
  const usermetaKeys = new Set(USERMETA_KEYS(prefix))
  return (table, row) => {
    switch (table) {
      case 'usermeta':
        return usermetaKeys.has(String(row.meta_key))
      case 'comments':
        return Number(row.comment_post_ID) === postId
      case 'posts':
        return row.post_type === 'attachment' || row.post_type === 'wpdiscuz_form'
      case 'postmeta': {
        const key = String(row.meta_key ?? '')
        return key === '_wp_attached_file' || key.startsWith('wpdiscuz')
      }
      default:
        return true
    }
  }
}

export type AssinaturaAntiga = 'pagante' | 'revisar' | 'vencida' | 'sem-data'
export type MotivoIgnorada = 'administrador' | 'teste' | 'email-invalido' | 'email-duplicado' | 'excluida-pela-equipe'
export type AccountFlag =
  | 'expirado-com-data-futura'
  | 'nao-assinante-com-data-futura'
  | 'apelido-descartado'
  | 'outro-papel'

export type WpAccount = {
  wpUserId: number
  email: string
  name: string
  apelido: string | null
  hash: string | null
  hashKind: WpHashKind
  roles: string[]
  /** ISO instant of `_expire_user_date`, if any */
  expireAt: string | null
  expiredFlag: 'Y' | 'N' | null
  assinatura: AssinaturaAntiga
  /** ISO instant, only for 'pagante' */
  endsAt: string | null
  flags: AccountFlag[]
}

export type AccountDecision =
  | { kind: 'importar'; account: WpAccount }
  | { kind: 'ignorar'; wpUserId: number; motivo: MotivoIgnorada }

const TEST_DOMAINS = new Set(['example.com', 'example.org', 'example.net', 'test.com', 'teste.com', 'mailinator.com', 'yopmail.com'])
const TEST_TOKENS = new Set(['teste', 'test', 'dev'])
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const tokens = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter(Boolean)

export function isTestAccount(email: string, login: string): boolean {
  const at = email.lastIndexOf('@')
  const domain = at >= 0 ? email.slice(at + 1).trim().toLowerCase() : ''
  const local = at >= 0 ? email.slice(0, at) : email
  if (TEST_DOMAINS.has(domain)) return true
  return [...tokens(local), ...tokens(login)].some((t) => TEST_TOKENS.has(t))
}

/** Nickname for a migrated account: display_name (else nicename) if it carries no contact; otherwise null. */
export function apelidoFrom(displayName: string, nicename: string, email: string): string | null {
  const base = (displayName || '').replace(/\s+/g, ' ').trim() || (nicename || '').replace(/\s+/g, ' ').trim()
  if (!base || base.length > APELIDO_MAX) return null
  if (recadoApelidoError(base) !== null) return null
  const local = email.split('@')[0]?.toLowerCase() ?? ''
  if (local && base.toLowerCase() === local) return null
  return base
}

/** Smallest São Paulo midnight at or after the instant (rounds up in the member's favour). */
export function endsAtFromExpire(unixSeconds: number): Date {
  return spMidnight(addDaysToDate(spDate(new Date(unixSeconds * 1000 - 1)), 1))
}

export function extractAccounts(
  tables: WpTables,
  opts: { prefix: string; now: Date; excluirIds?: ReadonlySet<number> },
): AccountDecision[] {
  const capKey = `${opts.prefix}capabilities`
  const metaByUser = new Map<number, Map<string, string>>()
  for (const m of tables.usermeta ?? []) {
    const key = String(m.meta_key ?? '')
    if (key !== capKey && key !== '_expire_user_date' && key !== '_expire_user_expired') continue
    const id = Number(m.user_id)
    const map = metaByUser.get(id) ?? new Map<string, string>()
    map.set(key, String(m.meta_value ?? ''))
    metaByUser.set(id, map)
  }

  const users = [...(tables.users ?? [])].sort((a, b) => Number(a.ID) - Number(b.ID))
  const seenEmails = new Set<string>()
  const nowSec = opts.now.getTime() / 1000
  const out: AccountDecision[] = []

  for (const u of users) {
    const wpUserId = Number(u.ID)
    const meta = metaByUser.get(wpUserId)
    const roles = serializedKeys(meta?.get(capKey) ?? '')
    const email = String(u.user_email ?? '').trim().toLowerCase()
    const login = String(u.user_login ?? '')
    const ignore = (motivo: MotivoIgnorada) => out.push({ kind: 'ignorar', wpUserId, motivo })

    if (roles.includes('administrator')) {
      ignore('administrador')
      continue
    }
    if (opts.excluirIds?.has(wpUserId)) {
      ignore('excluida-pela-equipe')
      continue
    }
    if (isTestAccount(email, login)) {
      ignore('teste')
      continue
    }
    if (!EMAIL_RE.test(email)) {
      ignore('email-invalido')
      continue
    }
    if (seenEmails.has(email)) {
      ignore('email-duplicado')
      continue
    }
    seenEmails.add(email)

    const displayName = String(u.display_name ?? '').trim()
    const nicename = String(u.user_nicename ?? '').trim()
    const apelido = apelidoFrom(displayName, nicename, email)
    const rawExpire = meta?.get('_expire_user_date')
    const expireSec = rawExpire && /^\d{1,12}$/.test(rawExpire.trim()) && Number(rawExpire) > 0 ? Number(rawExpire) : null
    const rawFlag = meta?.get('_expire_user_expired')
    const expiredFlag = rawFlag === 'Y' || rawFlag === 'N' ? rawFlag : null
    const hashKind = wpHashKind(String(u.user_pass ?? ''))

    let assinatura: AssinaturaAntiga
    if (expireSec !== null && expireSec > nowSec) assinatura = 'pagante'
    else if (expireSec === null && roles.includes('subscriber')) assinatura = 'revisar'
    else if (expireSec !== null) assinatura = 'vencida'
    else assinatura = 'sem-data'

    const flags: AccountFlag[] = []
    if (assinatura === 'pagante' && expiredFlag === 'Y') flags.push('expirado-com-data-futura')
    if (assinatura === 'pagante' && roles.includes('no_assinante')) flags.push('nao-assinante-com-data-futura')
    if ((displayName || nicename) && apelido === null) flags.push('apelido-descartado')
    if (roles.some((r) => r !== 'subscriber' && r !== 'no_assinante')) flags.push('outro-papel')

    out.push({
      kind: 'importar',
      account: {
        wpUserId,
        email,
        name: displayName || nicename || 'Assinante',
        apelido,
        hash: hashKind === 'desconhecido' ? null : String(u.user_pass),
        hashKind,
        roles,
        expireAt: expireSec !== null ? new Date(expireSec * 1000).toISOString() : null,
        expiredFlag,
        assinatura,
        endsAt: assinatura === 'pagante' && expireSec !== null ? endsAtFromExpire(expireSec).toISOString() : null,
        flags,
      },
    })
  }
  return out
}
