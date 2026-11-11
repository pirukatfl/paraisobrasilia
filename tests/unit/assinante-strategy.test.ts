import { beforeEach, describe, expect, it, vi } from 'vitest'

const jwt = vi.fn()
vi.mock('payload', () => ({ JWTAuthentication: (args: unknown) => jwt(args) }))

import { assinanteCookieStrategy } from '../../src/lib/assinantes/cookie'

const run = (cookie: string) =>
  assinanteCookieStrategy.authenticate({
    req: {},
    headers: new Headers({ cookie }),
    payload: { config: { cookiePrefix: 'payload' } },
  } as never)

// The fake JWT strategy reads the token Payload would read: `payload-token`.
beforeEach(() => {
  jwt.mockReset()
  jwt.mockImplementation(async ({ headers }: { headers: Headers }) => {
    const token = /payload-token=([^;]+)/.exec(headers.get('cookie') ?? '')?.[1]
    if (token === 'staff') return { user: { collection: 'users', id: 1 } }
    if (token === 'sub') return { user: { collection: 'assinantes', id: 2 } }
    return { user: null }
  })
})

describe('staff and subscriber logged in together', () => {
  it('API calls use the staff session when both cookies exist', async () => {
    const r = await run('payload-token=staff; paraiso-assinante=sub')
    expect(r.user?.collection).toBe('users')
  })

  it('subscriber-only browser still authenticates as subscriber', async () => {
    const r = await run('paraiso-assinante=sub')
    expect(r.user?.collection).toBe('assinantes')
  })

  it('stale staff token does not block the subscriber session', async () => {
    const r = await run('payload-token=expirado; paraiso-assinante=sub')
    expect(r.user?.collection).toBe('assinantes')
  })

  it('staff-only browser is left to the stock JWT strategy', async () => {
    const r = await run('payload-token=staff')
    expect(r.user).toBeNull()
  })
})
