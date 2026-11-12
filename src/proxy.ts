import { NextResponse, type NextRequest } from 'next/server'

import { tokenLegadoDeAssinante } from '@/lib/assinantes/legacy-token'

// CSRF guard (replaces Payload's `csrf` allowlist, which dropped the session cookie on every
// request lacking Origin and Sec-Fetch-Site — older Safari/WebViews/proxies — logging users out).
// Auth cookies are SameSite=Lax; on top of that, a state-changing request that declares a foreign
// Origin is rejected here (API, admin, server actions, upload route handlers). Requests without
// an Origin header (non-browser clients, old browsers on same-site navigations) pass.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const normalize = (value: string | null | undefined): string | null => {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

// Subscriber JWT left in the staff cookie by older logins: drop it so /admin shows the login screen
const STAFF_COOKIE = 'payload-token'

export function proxy(request: NextRequest) {
  if (tokenLegadoDeAssinante(request.headers.get('cookie'))) {
    // Strip it from this very request too (no redirect, so a browser that refuses the deletion cannot loop)
    const headers = new Headers(request.headers)
    const rest = (headers.get('cookie') ?? '').split(';').map((p) => p.trim()).filter((p) => p && !p.startsWith(`${STAFF_COOKIE}=`))
    if (rest.length > 0) headers.set('cookie', rest.join('; '))
    else headers.delete('cookie')
    const res = NextResponse.next({ request: { headers } })
    res.cookies.delete(STAFF_COOKIE)
    return res
  }
  if (SAFE_METHODS.has(request.method)) return NextResponse.next()

  const originHeader = request.headers.get('origin')
  if (originHeader === null) return NextResponse.next()

  // The browser itself vouches that the request comes from this same site (header cannot be set by page scripts).
  // Staff reaching the admin through an alternate host/port/proxy would otherwise be refused with a 403 that
  // the panel shows as "sem permissão" while uploading media.
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite === 'same-origin') return NextResponse.next()

  const origin = normalize(originHeader)
  const allowed = new Set<string>()
  const configured = normalize(process.env.NEXT_PUBLIC_SERVER_URL)
  if (configured) allowed.add(configured)
  // Same host the browser addressed (covers www/alternate hostnames served by the same app)
  const proto = (request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '')).split(',')[0]!.trim()
  for (const hostHeader of [request.headers.get('x-forwarded-host'), request.headers.get('host')]) {
    // x-forwarded-host may list several hosts (one per proxy hop)
    for (const host of (hostHeader ?? '').split(',')) {
      if (host.trim()) allowed.add(`${proto}://${host.trim()}`)
    }
  }

  if (origin && allowed.has(origin)) return NextResponse.next()
  return NextResponse.json({ errors: [{ message: 'Cross-site request rejected' }] }, { status: 403 })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|icons/).*)'],
}
