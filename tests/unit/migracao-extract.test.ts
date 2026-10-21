import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

import { chunkedStream } from '../helpers/wp-dump-fixture'
import {
  CLASSISEX_POST,
  FIXTURE_NOW,
  gzipMigracaoFixtureToTemp,
  migracaoFixturePath,
  MIGRACAO_PREFIX,
  readMigracaoFixture,
} from '../helpers/wp-migracao-fixture'
import { readWpTables } from '@/lib/contos/wp-dump'
import { serializedFieldLabels, serializedIntegers, serializedKeys } from '@/lib/migracao/php-serialized'
import {
  apelidoFrom,
  endsAtFromExpire,
  extractAccounts,
  isTestAccount,
  MIGRACAO_TABLES,
  migracaoRowFilter,
  type AccountDecision,
} from '@/lib/migracao/wp-accounts'

const opts = { prefix: MIGRACAO_PREFIX, now: FIXTURE_NOW }
const byId = (ds: AccountDecision[], id: number) => ds.find((d) => (d.kind === 'importar' ? d.account.wpUserId : d.wpUserId) === id)!
const acc = (ds: AccountDecision[], id: number) => {
  const d = byId(ds, id)
  if (d.kind !== 'importar') throw new Error(`conta ${id} deveria ser importada`)
  return d.account
}

describe('php-serialized', () => {
  it('reads top-level keys', () => {
    expect(serializedKeys('a:1:{s:10:"subscriber";b:1;}')).toEqual(['subscriber'])
    expect(serializedKeys('a:2:{s:10:"subscriber";b:1;s:6:"editor";b:1;}')).toEqual(['subscriber', 'editor'])
    expect(serializedKeys('a:1:{s:10:"subscri')).toEqual([])
    expect(serializedKeys('lixo')).toEqual([])
    expect(serializedKeys('')).toEqual([])
  })

  it('reads integers and numeric strings, de-duplicated', () => {
    expect(serializedIntegers('a:1:{s:6:"images";a:2:{i:0;s:3:"501";i:1;i:502;}}')).toEqual([501, 502])
    expect(serializedIntegers('a:3:{i:0;i:7;i:1;s:1:"7";i:2;s:1:"x";}')).toEqual([7])
    expect(serializedIntegers('a:1:{i:0;s:9:"501"')).toEqual([])
  })

  it('reads wpDiscuz field labels', () => {
    const v = 'a:1:{s:26:"custom_field_61a0e5b2c9f01";a:1:{s:4:"name";s:6:"Eu Sou";}}'
    expect(serializedFieldLabels(v)).toEqual({ custom_field_61a0e5b2c9f01: 'Eu Sou' })
    expect(serializedFieldLabels('nada')).toEqual({})
  })
})

describe('account helpers', () => {
  it('endsAtFromExpire rounds up to the next São Paulo midnight', () => {
    expect(endsAtFromExpire(Date.parse('2026-11-15T15:00:00Z') / 1000).toISOString()).toBe('2026-11-16T03:00:00.000Z')
    expect(endsAtFromExpire(Date.parse('2027-03-01T03:00:00Z') / 1000).toISOString()).toBe('2027-03-01T03:00:00.000Z')
    expect(endsAtFromExpire(Date.parse('2026-02-28T20:00:00Z') / 1000).toISOString()).toBe('2026-03-01T03:00:00.000Z')
  })

  it('isTestAccount', () => {
    expect(isTestAccount('maria@example.org', 'maria')).toBe(true)
    expect(isTestAccount('casal.dev@x.com', 'casal')).toBe(true)
    expect(isTestAccount('devora@x.com', 'devora')).toBe(false)
    expect(isTestAccount('ana@yopmail.com', 'ana')).toBe(true)
  })

  it('apelidoFrom', () => {
    expect(apelidoFrom('  Casal   Alegre ', 'casal', 'x@y.com')).toBe('Casal Alegre')
    expect(apelidoFrom('', 'casal-nice', 'x@y.com')).toBe('casal-nice')
    expect(apelidoFrom('joao', 'joao', 'JOAO@y.com')).toBeNull()
    expect(apelidoFrom('Ana 61 99999-8888', 'ana', 'x@y.com')).toBeNull()
    expect(apelidoFrom('a'.repeat(41), 'a', 'x@y.com')).toBeNull()
    expect(apelidoFrom('a'.repeat(40), 'a', 'x@y.com')).toBe('a'.repeat(40))
  })
})

describe('extractAccounts on the synthetic fixture', () => {
  it('reads only the three usermeta keys and no noise', async () => {
    const t = await readMigracaoFixture()
    const keys = new Set(t.usermeta!.map((r) => r.meta_key))
    expect([...keys].sort()).toEqual(['_expire_user_date', '_expire_user_expired', 'wp26_capabilities'])
    expect(t.usermeta!.some((r) => r.meta_key === 'billing_phone')).toBe(false)
    expect(t.comments!.every((c) => c.comment_post_ID === CLASSISEX_POST)).toBe(true)
    expect(t.posts!.every((p) => p.post_type === 'attachment' || p.post_type === 'wpdiscuz_form')).toBe(true)
  })

  it('classifies every account', async () => {
    const ds = extractAccounts(await readMigracaoFixture(), opts)
    expect(ds).toHaveLength(13)
    expect(ds.map((d) => (d.kind === 'importar' ? d.account.wpUserId : d.wpUserId))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
    const motivo = (id: number) => {
      const d = byId(ds, id)
      return d.kind === 'ignorar' ? d.motivo : null
    }
    expect(motivo(1)).toBe('administrador')
    expect(motivo(8)).toBe('teste')
    expect(motivo(9)).toBe('email-invalido')
    expect(motivo(10)).toBe('email-duplicado')
    expect(ds.filter((d) => d.kind === 'importar').map((d) => (d as { account: { wpUserId: number } }).account.wpUserId)).toEqual([2, 3, 4, 5, 6, 7, 11, 12, 13])

    const a2 = acc(ds, 2)
    expect(a2.email).toBe('membro2.sentinela@paraiso-sintetico.test')
    expect(a2.hashKind).toBe('wp-bcrypt')
    expect(a2.assinatura).toBe('pagante')
    expect(a2.endsAt).toBe('2026-11-16T03:00:00.000Z')
    expect(a2.flags).toEqual([])

    const a3 = acc(ds, 3)
    expect(a3.hashKind).toBe('phpass')
    expect(a3.endsAt).toBe('2027-03-01T03:00:00.000Z')
    expect(a3.flags).toContain('expirado-com-data-futura')

    expect(acc(ds, 4).assinatura).toBe('revisar')
    for (const id of [5, 6]) {
      expect(acc(ds, id).assinatura).toBe('vencida')
      expect(acc(ds, id).endsAt).toBeNull()
    }
    expect(acc(ds, 7).assinatura).toBe('sem-data')
    const a11 = acc(ds, 11)
    expect(a11.hashKind).toBe('desconhecido')
    expect(a11.hash).toBeNull()
    expect(a11.assinatura).toBe('pagante')
    const a12 = acc(ds, 12)
    expect(a12.flags).toEqual(['nao-assinante-com-data-futura', 'apelido-descartado'])
    expect(a12.apelido).toBeNull()
    const a13 = acc(ds, 13)
    expect(a13.assinatura).toBe('revisar')
    expect(a13.flags).toContain('outro-papel')
    expect(a13.apelido).toBe('Membro Treze Sentinela')
  })

  it('honours the team exclusion list', async () => {
    const ds = extractAccounts(await readMigracaoFixture(), { ...opts, excluirIds: new Set([7]) })
    expect(byId(ds, 7)).toEqual({ kind: 'ignorar', wpUserId: 7, motivo: 'excluida-pela-equipe' })
  })

  it('reads the same from gzip and from 7-byte chunks', async () => {
    const plain = await readMigracaoFixture()
    const gz = await readMigracaoFixture(await gzipMigracaoFixtureToTemp())
    const chunked = await readWpTables(chunkedStream(fs.readFileSync(migracaoFixturePath(), 'utf8'), 7), {
      prefix: MIGRACAO_PREFIX,
      tables: [...MIGRACAO_TABLES],
      rowFilter: migracaoRowFilter(MIGRACAO_PREFIX, CLASSISEX_POST),
    })
    expect(gz).toEqual(plain)
    expect(chunked).toEqual(plain)
  })
})
