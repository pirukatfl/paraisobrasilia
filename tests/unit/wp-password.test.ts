import { describe, expect, it } from 'vitest'

import { verifyWpPassword, wpHashKind, WP_PASSWORD_MAX } from '@/lib/assinantes/wp-password'

// Vectors generated with PHP 8 password_hash + WordPress's own class-phpass.php
// (synthetic passwords, 06-RESEARCH §1).
const SENHA1 = 'senha-sintetica-1'
const WP1 = '$wp$2y$10$9Q4zpTS2fiTKXOlU7LXUSeIvoh2bfYHnt8hHjrVynU50s9CXKFica'
const PHPASS1 = '$P$BMqVaElQIGOM7G/gvip1NrrFWhngog.'
const LONGA = 'Ação ç 😀 longa ' + 'x'.repeat(80)
const WP2 = '$wp$2y$10$kFK8hxQIhZzEba6HXi2jeul9n9ot04di7ZMD/Xw9OyjXzA5vanuF2'
const PHPASS2 = '$P$Bj7XTxrpJpFseMjpZLXtVjcy25.QRz0'
const WP3 = '$wp$2y$10$ZCyjg8Ai1fHJVHo4vpmju.MqB6nw24/NjZ9IiOXRF6VjB6zBH8Y..'
const PHPASS3 = '$P$BVN0C2LM5LrTtvTcnn9JecXDy8nUzK0'
const PHPASS4 = '$P$9IQRaTwmfeRo7ud9Fh4E2PdI0S3r.L0'

describe('verifyWpPassword', () => {
  it('accepts the right password for $wp$2y$ hashes', async () => {
    expect(await verifyWpPassword(SENHA1, WP1)).toBe(true)
    expect(await verifyWpPassword(LONGA, WP2)).toBe(true)
    expect(await verifyWpPassword('curta7', WP3)).toBe(true)
  })

  it('accepts the right password for phpass hashes', async () => {
    expect(await verifyWpPassword(SENHA1, PHPASS1)).toBe(true)
    expect(await verifyWpPassword(LONGA, PHPASS2)).toBe(true)
    expect(await verifyWpPassword('curta7', PHPASS3)).toBe(true)
    expect(await verifyWpPassword('test12345', PHPASS4)).toBe(true)
  })

  it('rejects wrong passwords', async () => {
    for (const h of [WP1, PHPASS1]) {
      expect(await verifyWpPassword('senha-sintetica-1!', h)).toBe(false)
      expect(await verifyWpPassword('Senha-sintetica-1', h)).toBe(false)
    }
  })

  it('accepts what WordPress stored after trim(), nothing else', async () => {
    for (const h of [WP1, PHPASS1]) {
      expect(await verifyWpPassword(' senha-sintetica-1 ', h)).toBe(true)
      expect(await verifyWpPassword('senha-sintetica-1 x', h)).toBe(false)
    }
  })

  it('handles the $2b$ rewrite of a wp hash', async () => {
    expect(await verifyWpPassword(SENHA1, WP1.replace('$wp$2y$', '$wp$2b$'))).toBe(true)
  })

  it('rejects unknown and malformed hashes without throwing', async () => {
    const bad = [
      '',
      '$H$9IQRaTwmfeRo7ud9Fh4E2PdI0S3r.L0',
      WP1.slice(3),
      'd41d8cd98f00b204e9800998ecf8427e',
      PHPASS1.slice(0, -1),
      '$P$0' + PHPASS1.slice(4), // log2 < 7
      '$P$.' + PHPASS1.slice(4), // log2 = 0
      '$P$z' + PHPASS1.slice(4), // log2 > 30
      '$wp$2y$10$short',
    ]
    for (const h of bad) {
      expect(await verifyWpPassword(SENHA1, h)).toBe(false)
    }
    expect(await verifyWpPassword(SENHA1, null as unknown as string)).toBe(false)
  })

  it('rejects passwords over 4096 UTF-8 bytes', async () => {
    expect(WP_PASSWORD_MAX).toBe(4096)
    expect(await verifyWpPassword('x'.repeat(4097), WP1)).toBe(false)
    expect(await verifyWpPassword('😀'.repeat(1025), PHPASS1)).toBe(false)
  })
})

describe('wpHashKind', () => {
  it('classifies hashes', () => {
    expect(wpHashKind(WP1)).toBe('wp-bcrypt')
    expect(wpHashKind(PHPASS1)).toBe('phpass')
    expect(wpHashKind('')).toBe('desconhecido')
    expect(wpHashKind(null)).toBe('desconhecido')
    expect(wpHashKind(undefined)).toBe('desconhecido')
    expect(wpHashKind('d41d8cd98f00b204e9800998ecf8427e')).toBe('desconhecido')
    expect(wpHashKind('$H$9IQRaTwmfeRo7ud9Fh4E2PdI0S3r.L0')).toBe('desconhecido')
  })
})
