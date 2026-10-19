import type { ServerProps } from 'payload'

import { getModerationCounts } from '../../../lib/classisex/service'

/**
 * "ClassiSex" queue at the top of the admin dashboard (PAINEL-07). Server component: counts only,
 * rendered for staff (collection `users`) — /admin itself is staff-only.
 */
export async function FilaClassisex({ payload, user }: Pick<ServerProps, 'payload' | 'user'>) {
  if (!user || (user as { collection?: string }).collection !== 'users') return null
  const { pendentes, denunciasAbertas, urgentes } = await getModerationCounts(payload)
  const adminRoute = payload.config.routes.admin
  const reportsLink = `${adminRoute}/collections/ad-reports?where[status][equals]=aberta`
  const queue = `${adminRoute}/collections/ads?where[status][equals]=pendente&sort=submittedAt`

  return (
    <section
      aria-labelledby="fila-classisex-titulo"
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 'var(--style-radius-m, 4px)',
        padding: 'calc(var(--base) * 1)',
        marginBottom: 'calc(var(--base) * 1.5)',
        background: 'var(--theme-elevation-50)',
      }}
    >
      <h2 id="fila-classisex-titulo" style={{ margin: 0, fontSize: '1.25rem' }}>
        ClassiSex
      </h2>
      <p style={{ margin: 'calc(var(--base) * 0.5) 0 0' }}>
        {pendentes === 0
          ? 'Nenhum anúncio para aprovar.'
          : pendentes === 1
            ? '1 anúncio para aprovar'
            : `${pendentes} anúncios para aprovar`}
      </p>
      <p style={{ margin: 'calc(var(--base) * 0.5) 0 0' }}>
        {denunciasAbertas === 0
          ? 'Nenhuma denúncia aberta.'
          : `${denunciasAbertas} ${denunciasAbertas === 1 ? 'denúncia aberta' : 'denúncias abertas'}${
              urgentes > 0 ? ` · ${urgentes} ${urgentes === 1 ? 'urgente' : 'urgentes'}` : ''
            }`}
      </p>
      <p style={{ margin: 'calc(var(--base) * 0.75) 0 0' }}>
        <a href={queue}>Ver fila</a> · <a href={reportsLink}>Ver denúncias</a> · <a href={`${adminRoute}/collections/ads`}>Todos os anúncios</a>
      </p>
    </section>
  )
}
