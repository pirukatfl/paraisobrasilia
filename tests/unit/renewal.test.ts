import { describe, expect, it } from 'vitest'

import { RENEWAL_WARNING_DAYS, renewalNotice } from '../../src/lib/assinantes/renewal'
import { validUntilLabel } from '../../src/lib/assinantes/periods'
import type { AccessStatus } from '../../src/lib/assinantes/status'

const ativa = (daysLeft: number): AccessStatus => {
  const until = new Date('2026-11-10T03:00:00.000Z')
  return { state: 'ativa', validUntil: until, validUntilLabel: validUntilLabel(until), daysLeft, lastEndedAt: null }
}
const none = { validUntil: null, validUntilLabel: null, daysLeft: null }

describe('renewalNotice', () => {
  it('warns 7 days or fewer before the end', () => {
    expect(RENEWAL_WARNING_DAYS).toBe(7)
    expect(renewalNotice(ativa(7))).toEqual({ kind: 'expiring', daysLeft: 7, validUntilLabel: '9 de novembro de 2026' })
    expect(renewalNotice(ativa(1))).toMatchObject({ kind: 'expiring', daysLeft: 1 })
  })

  it('stays quiet with more than 7 days left', () => {
    expect(renewalNotice(ativa(8))).toBeNull()
    expect(renewalNotice(ativa(10))).toBeNull()
  })

  it('tells former subscribers their subscription ended', () => {
    const ended = new Date('2026-10-14T03:00:00.000Z')
    expect(renewalNotice({ state: 'vencida', ...none, lastEndedAt: ended })).toEqual({
      kind: 'expired',
      endedLabel: validUntilLabel(ended),
    })
  })

  it('shows nothing for never-subscribed or staff-ended accounts', () => {
    expect(renewalNotice({ state: 'sem-assinatura', ...none, lastEndedAt: null })).toBeNull()
    expect(renewalNotice({ state: 'encerrada', ...none, lastEndedAt: new Date() })).toBeNull()
  })
})
