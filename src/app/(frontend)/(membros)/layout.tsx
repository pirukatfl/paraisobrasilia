import type { ReactNode } from 'react'

// Members area: always rendered per request (private, no-store).
export const dynamic = 'force-dynamic'

/**
 * Chrome only. The members navigation (and Sair) lives in the site header, see getMemberNavItems.
 * Authorization lives in each page (and each server action) via the DAL in
 * src/lib/assinantes/session.ts: Next layouts do not re-run on client navigation and do not
 * gate child segments or actions.
 */
export default function MembrosLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <div className="mt-8">{children}</div>
    </div>
  )
}
