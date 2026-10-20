import { NextResponse, type NextRequest } from 'next/server'

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

export function proxy(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return NextResponse.next()

  const originHeader = request.headers.get('origin')
  if (originHeader === null) return NextResponse.next()

  const origin = normalize(originHeader)
  const allowed = new Set<string>()
  const configured = normalize(process.env.NEXT_PUBLIC_SERVER_URL)
  if (configured) allowed.add(configured)
  // Same host the browser addressed (covers www/alternate hostnames served by the same app)
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (host && origin) {
    const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '')
    allowed.add(`${proto.split(',')[0]!.trim()}://${host}`)
  }

  if (origin && allowed.has(origin)) return NextResponse.next()
  return NextResponse.json({ errors: [{ message: 'Cross-site request rejected' }] }, { status: 403 })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
