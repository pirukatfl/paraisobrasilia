import type { ServerProps } from 'payload'

import { listRevisarSiteAntigo } from '../../../lib/assinantes/site-antigo'
import { SEM_DATA_FILTER_QUERY } from '../../../lib/assinantes/site-antigo-label'

/**
 * "Assinantes antigos sem data de vencimento" on the admin dashboard (M-02). Server component:
 * the list never reaches a non-staff browser, and /admin itself is staff-only (T-06-15).
 */
const cell: React.CSSProperties = { padding: '8px 12px', borderTop: '1px solid var(--theme-elevation-150)', verticalAlign: 'middle' }

export async function RevisarSiteAntigo({ payload, user }: Pick<ServerProps, 'payload' | 'user'>) {
  if (!user || (user as { collection?: string }).collection !== 'users') return null
  const { total, rows } = await listRevisarSiteAntigo(payload, 50)
  const adminRoute = payload.config.routes.admin

  return (
    <section
      aria-labelledby="revisar-site-antigo-titulo"
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 'var(--style-radius-m, 4px)',
        padding: 'calc(var(--base) * 1)',
        marginBottom: 'calc(var(--base) * 1.5)',
        background: 'var(--theme-elevation-50)',
      }}
    >
      <h2 id="revisar-site-antigo-titulo" style={{ margin: 0, fontSize: '1.25rem' }}>
        Assinantes antigos sem data de vencimento
      </h2>
      {rows.length === 0 ? (
        <p style={{ margin: 'calc(var(--base) * 0.5) 0 0' }}>Nenhum assinante antigo sem data de vencimento para revisar.</p>
      ) : (
        <>
          <p style={{ margin: 'calc(var(--base) * 0.5) 0 0' }}>
            No site antigo eram assinantes, mas sem data de vencimento. Libere uma assinatura ou dispense o aviso.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 'calc(var(--base) * 0.75)' }}>
            <thead>
              <tr>
                <th style={{ ...cell, borderTop: 'none', textAlign: 'left' }}>Nome</th>
                <th style={{ ...cell, borderTop: 'none', textAlign: 'left' }}>E-mail</th>
                <th style={{ ...cell, borderTop: 'none', textAlign: 'left' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={cell}>{r.name}</td>
                  <td style={cell}>{r.email}</td>
                  <td style={cell}>
                    <a href={`${adminRoute}/collections/assinantes/${r.id}`} aria-label={`Abrir ${r.name}`}>
                      Abrir
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > rows.length && <p style={{ margin: 'calc(var(--base) * 0.5) 0 0' }}>e mais {total - rows.length}</p>}
          <p style={{ margin: 'calc(var(--base) * 0.75) 0 0' }}>
            <a href={`${adminRoute}/collections/assinantes${SEM_DATA_FILTER_QUERY}`}>Ver todos na lista</a>
          </p>
        </>
      )}
    </section>
  )
}
