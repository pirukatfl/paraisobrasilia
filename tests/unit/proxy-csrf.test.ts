import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { proxy } from '../../src/proxy'

const post = (url: string, headers: Record<string, string>) => proxy(new NextRequest(url, { method: 'POST', headers }))

describe('proxy CSRF guard', () => {
  it('lets the staff panel upload when the browser says same-origin, whatever the host seen by the app', () => {
    const res = post('http://app:3000/api/media', {
      origin: 'https://painel.exemplo.com.br',
      host: 'app:3000',
      'sec-fetch-site': 'same-origin',
    })
    expect(res.status).toBe(200)
  })

  it('accepts a multi-hop x-forwarded-host list', () => {
    const res = post('http://app:3000/api/media', {
      origin: 'https://site.exemplo.com.br',
      'x-forwarded-host': 'site.exemplo.com.br, interno',
      'x-forwarded-proto': 'https',
    })
    expect(res.status).toBe(200)
  })

  it('still rejects a foreign origin', () => {
    const res = post('https://site.exemplo.com.br/api/media', {
      origin: 'https://evil.example',
      host: 'site.exemplo.com.br',
      'sec-fetch-site': 'cross-site',
    })
    expect(res.status).toBe(403)
  })
})
