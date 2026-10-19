import type { ServerProps } from 'payload'

import { getExpiringSoon } from '../../../lib/assinantes/service'
import { formatShortDate } from '../../../lib/format/date'
import { whatsappUrl } from '../../../lib/site/contact'

/**
 * "Vencem nos próximos 7 dias" at the top of the admin dashboard (PAINEL-06). Server component:
 * the list never reaches a non-staff browser (T-03-24) — and /admin itself is staff-only.
 */

/** Last valid day as dd/MM (accessUntil is the midnight after it). */
const lastDayShort = (accessUntil: string) =>
  formatShortDate(new Date(new Date(accessUntil).getTime() - 1).toISOString()).slice(0, 5)

const renewalMessage = (name: string, day: string) =>
  `Olá, ${name}! Sua assinatura do Paraíso vence em ${day}. Quer renovar? É só pagar pelo link do plano e mandar o comprovante aqui.`

const cell: React.CSSProperties = { padding: '8px 12px', borderTop: '1px solid var(--theme-elevation-150)', verticalAlign: 'middle' }
const action: React.CSSProperties = {
  display: 'inline-block',
  padding: '4px 12px',
  marginRight: 8,
  borderRadius: 'var(--style-radius-s, 3px)',
  border: '1px solid var(--theme-elevation-400)',
  color: 'var(--theme-text)',
  textDecoration: 'none',
  fontWeight: 600,
}

export async function Vencimentos({ payload, user }: Pick<ServerProps, 'payload' | 'user'>) {
  if (!user || (user as { collection?: string }).collection !== 'users') return null
  const rows = await getExpiringSoon(payload, new Date(), 7)
  const adminRoute = payload.config.routes.admin

  return (
    <section
      aria-labelledby="vencimentos-titulo"
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 'var(--style-radius-m, 4px)',
        padding: 'calc(var(--base) * 1)',
        marginBottom: 'calc(var(--base) * 1.5)',
        background: 'var(--theme-elevation-50)',
      }}
    >
      <h2 id="vencimentos-titulo" style={{ margin: 0, fontSize: '1.25rem' }}>
        Vencem nos próximos 7 dias
      </h2>
      {rows.length === 0 ? (
        <p style={{ margin: 'calc(var(--base) * 0.5) 0 0' }}>Nenhuma assinatura vence nos próximos 7 dias.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 'calc(var(--base) * 0.75)' }}>
          <thead>
            <tr>
              <th style={{ ...cell, borderTop: 'none', textAlign: 'left' }}>Assinante</th>
              <th style={{ ...cell, borderTop: 'none', textAlign: 'left' }}>Vencimento</th>
              <th style={{ ...cell, borderTop: 'none', textAlign: 'left' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const day = lastDayShort(r.accessUntil)
              return (
                <tr key={r.id}>
                  <td style={cell}>{r.name}</td>
                  <td style={cell}>
                    vence em {day} ({r.daysLeft === 1 ? '1 dia' : `${r.daysLeft} dias`})
                  </td>
                  <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                    <a href={`${adminRoute}/collections/assinantes/${r.id}`} style={action}>
                      Abrir
                    </a>
                    {r.whatsapp && (
                      <a
                        href={whatsappUrl(r.whatsapp, renewalMessage(r.name, day))}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={action}
                        aria-label={`WhatsApp para ${r.name}`}
                      >
                        WhatsApp
                      </a>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
      <p style={{ margin: 'calc(var(--base) * 0.75) 0 0' }}>
        <a href={`${adminRoute}/collections/assinantes?sort=accessUntil`}>Ver todos por vencimento</a>
      </p>
    </section>
  )
}
