import { describe, expect, it } from 'vitest'

import { canViewMedia, type Principal } from '../../src/lib/classisex/media-access'

const staff: Principal = { collection: 'users', id: 1 }
const owner: Principal = { collection: 'assinantes', id: 10 }
const viewer: Principal = { collection: 'assinantes', id: 20 }
const foto = { owner: 10, kind: 'foto' as const }
const video = { owner: 10, kind: 'video' as const }
const approved = { status: 'aprovado' }
const pending = { status: 'pendente' }

const base = { principal: viewer, viewerActive: true, media: foto, ad: approved, authorTier: 'assinante' as const, isCover: false, variante: 'foto' as const }

describe('canViewMedia (CLAS-06, T-04-02, T-04-05)', () => {
  it.each([
    ['active viewer, paying author', {}, 'allow'],
    ['active viewer, miniatura', { variante: 'miniatura' }, 'allow'],
    ['active viewer, video of a paying author', { media: video, variante: 'video' }, 'allow'],
    ['active viewer, pending ad', { ad: pending }, 'not-found'],
    ['active viewer, ad missing', { ad: null }, 'not-found'],
    ['free author: cover foto', { authorTier: 'gratis', isCover: true }, 'allow'],
    ['free author: cover miniatura', { authorTier: 'gratis', isCover: true, variante: 'miniatura' }, 'allow'],
    ['free author: second photo', { authorTier: 'gratis', isCover: false }, 'not-found'],
    ['free author: second photo miniatura', { authorTier: 'gratis', isCover: false, variante: 'miniatura' }, 'not-found'],
    ['free author: video', { authorTier: 'gratis', media: video, variante: 'video' }, 'not-found'],
    ['free author: video flagged as cover is still hidden', { authorTier: 'gratis', isCover: true, media: video, variante: 'video' }, 'not-found'],
    ['free author, pending ad', { authorTier: 'gratis', isCover: true, ad: pending }, 'not-found'],
    ['free viewer never opens other files', { viewerActive: false }, 'unauthenticated'],
    ['free viewer, cover of a free author', { viewerActive: false, authorTier: 'gratis', isCover: true }, 'unauthenticated'],
    ['anonymous', { principal: null }, 'unauthenticated'],
    ['anonymous, wrong variant', { principal: null, variante: 'video' }, 'not-found'],
    ['staff on a hidden ad', { principal: staff, viewerActive: false, ad: pending, authorTier: 'gratis' }, 'allow'],
    ['staff on a stored extra photo', { principal: staff, viewerActive: false, authorTier: 'gratis', isCover: false }, 'allow'],
    ['owner on a pending ad', { principal: owner, viewerActive: false, ad: pending }, 'allow'],
    ['owner on a stored extra video while free', { principal: owner, viewerActive: false, authorTier: 'gratis', media: video, variante: 'video' }, 'allow'],
    ['video variant on a photo', { variante: 'video' }, 'not-found'],
    ['foto variant on a video', { media: video, variante: 'foto' }, 'not-found'],
    ['miniatura on a video', { media: video, variante: 'miniatura' }, 'not-found'],
  ] as const)('%s', (_label, over, expected) => {
    expect(canViewMedia({ ...base, ...(over as object) } as never)).toBe(expected)
  })
})
