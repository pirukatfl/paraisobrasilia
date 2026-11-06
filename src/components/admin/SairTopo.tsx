'use client'

import { Link, useConfig } from '@payloadcms/ui'
import { formatAdminURL } from 'payload/shared'

/**
 * Sair na barra do topo do painel (fora do celular o menu lateral já fica aberto; no celular ele fica
 * escondido atrás do botão do menu, então o Sair também vive aqui). A visibilidade é controlada em custom.scss.
 */
export function SairTopo() {
  const { config } = useConfig()
  const href = formatAdminURL({ adminRoute: config.routes.admin, path: config.admin.routes.logout })
  return (
    <Link href={href} prefetch={false} className="paraiso-sair-topo" aria-label="Sair">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9" />
      </svg>
      Sair
    </Link>
  )
}
