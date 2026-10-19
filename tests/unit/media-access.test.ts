import { describe, expect, it } from 'vitest'

import { canViewMedia, type Principal } from '../../src/lib/classisex/media-access'

const NOW = new Date('2026-10-19T18:00:00.000Z')
const FUTURE = '2026-11-18T03:00:00.000Z'
const PAST = '2026-10-01T03:00:00.000Z'
const staff: Principal = { collection: 'users', id: 1 }
const owner: Principal = { collection: 'assinantes', id: 10 }
const viewer: Principal = { collection: 'assinantes', id: 20 }
const foto = { owner: 10, kind: 'foto' as const }
const video = { owner: 10, kind: 'video' as const }
const approved = { status: 'aprovado' }
const pending = { status: 'pendente' }

const base = { principal: viewer, viewerActive: true, media: foto, ad: approved, authorAccessUntil: FUTURE, variante: 'foto' as const, now: NOW }

describe('canViewMedia (CLAS-06, T-04-02, T-04-05)', () => {
  it.each([
    ['active viewer, visible ad', {}, 'allow'],
    ['active viewer, miniatura', { variante: 'miniatura' }, 'allow'],
    ['active viewer, video', { media: video, variante: 'video' }, 'allow'],
    ['active viewer, pending ad', { ad: pending }, 'not-found'],
    ['active viewer, author expired', { authorAccessUntil: PAST }, 'not-found'],
    ['active viewer, author without access', { authorAccessUntil: null }, 'not-found'],
    ['active viewer, ad missing', { ad: null }, 'not-found'],
    ['expired viewer', { viewerActive: false }, 'unauthenticated'],
    ['anonymous', { principal: null }, 'unauthenticated'],
    ['anonymous, wrong variant', { principal: null, variante: 'video' }, 'not-found'],
    ['staff on a hidden ad', { principal: staff, viewerActive: false, ad: pending, authorAccessUntil: null }, 'allow'],
    ['owner on a pending ad', { principal: owner, viewerActive: false, ad: pending }, 'allow'],
    ['video variant on a photo', { variante: 'video' }, 'not-found'],
    ['foto variant on a video', { media: video, variante: 'foto' }, 'not-found'],
    ['miniatura on a video', { media: video, variante: 'miniatura' }, 'not-found'],
  ] as const)('%s', (_label, over, expected) => {
    expect(canViewMedia({ ...base, ...(over as object) } as never)).toBe(expected)
  })
})
