import { describe, expect, it } from 'vitest'

import { safeNext } from '../../src/lib/assinantes/redirect'

describe('safeNext (T-03-08)', () => {
  it('keeps members-area paths', () => {
    expect(safeNext('/area-do-assinante')).toBe('/area-do-assinante')
    expect(safeNext('/area-do-assinante/exclusivo')).toBe('/area-do-assinante/exclusivo')
  })

  it.each([
    '//evil.com',
    'https://evil.com',
    '/\\evil',
    '/admin',
    '',
    undefined,
    null,
    42,
    '/area-do-assinante-x',
    '/area-do-assinante//evil.com',
    '/area-do-assinante/https://evil.com',
    '/area-do-assinante/\\evil',
  ])('falls back for %s', (value) => {
    expect(safeNext(value)).toBe('/area-do-assinante')
  })
})
