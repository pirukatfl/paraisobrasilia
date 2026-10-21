/**
 * Calls the real Payload REST and GraphQL route handlers in-process (the same functions the
 * Next route files export), with a JWT from payload.login. No network, test database only.
 */
import type { Payload } from 'payload'

type Slug = string[]

export async function tokenFor(payload: Payload, collection: 'users' | 'assinantes', email: string, password: string) {
  const res = await payload.login({ collection, data: { email, password } })
  return res.token as string
}

async function handlers() {
  const [{ default: config }, routes] = await Promise.all([import('../../src/payload.config'), import('@payloadcms/next/routes')])
  return { config, routes }
}

export async function rest(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  slug: Slug,
  opts: { token?: string; query?: string; body?: unknown; origin?: string } = {},
): Promise<{ status: number; json: unknown; text: string }> {
  const { config, routes } = await handlers()
  const fn = { GET: routes.REST_GET, POST: routes.REST_POST, PATCH: routes.REST_PATCH, DELETE: routes.REST_DELETE }[method](config)
  const url = `http://localhost:3000/api/${slug.join('/')}${opts.query ?? ''}`
  const req = new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `JWT ${opts.token}` } : {}),
      ...(opts.origin ? { origin: opts.origin } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  })
  const res = await fn(req, { params: Promise.resolve({ slug }) })
  const text = await res.text()
  let json: unknown = null
  try {
    json = JSON.parse(text)
  } catch {
    /* not JSON */
  }
  return { status: res.status, json, text }
}

export async function graphql(query: string, token?: string): Promise<{ status: number; text: string }> {
  const { config, routes } = await handlers()
  const req = new Request('http://localhost:3000/api/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `JWT ${token}` } : {}) },
    body: JSON.stringify({ query }),
  })
  const res = await routes.GRAPHQL_POST(config)(req)
  return { status: res.status, text: await res.text() }
}
