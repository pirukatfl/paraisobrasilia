import path from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { assertOutsidePublicMedia, privateMediaDir, privateStorageConfigured } from '../../src/lib/classisex/storage'

describe('private ClassiSex storage (T-04-03, T-04-16)', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('accepts a private dir beside the public media dir', () => {
    expect(() => assertOutsidePublicMedia('/app/media', '/app/private-media')).not.toThrow()
  })

  it.each([
    ['/app/media', '/app/media/private'],
    ['/app/media', '/app/media'],
    ['/app/private-media/x', '/app/private-media'],
    ['/app/media', path.join(process.cwd(), 'public', 'privado')],
  ])('refuses media=%s private=%s', (media, priv) => {
    expect(() => assertOutsidePublicMedia(media, priv)).toThrow(/PRIVATE_MEDIA_DIR/)
  })

  it('resolves PRIVATE_MEDIA_DIR, defaulting to ./private-media', () => {
    vi.stubEnv('PRIVATE_MEDIA_DIR', '')
    expect(privateMediaDir()).toBe(path.resolve(process.cwd(), 'private-media'))
    vi.stubEnv('PRIVATE_MEDIA_DIR', '/srv/privado')
    expect(privateMediaDir()).toBe('/srv/privado')
  })

  it('is unconfigured only in production without PRIVATE_MEDIA_DIR', () => {
    vi.stubEnv('PRIVATE_MEDIA_DIR', '')
    vi.stubEnv('NODE_ENV', 'test')
    expect(privateStorageConfigured()).toBe(true)
    vi.stubEnv('NODE_ENV', 'production')
    expect(privateStorageConfigured()).toBe(false)
    vi.stubEnv('PRIVATE_MEDIA_DIR', '/app/private-media')
    expect(privateStorageConfigured()).toBe(true)
  })
})
