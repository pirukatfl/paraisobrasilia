import type { ServerProps } from 'payload'

import { getModerationCounts } from '../../../lib/classisex/service'
import { getMessageReportCounts } from '../../../lib/mensagens/service'

/**
 * "ClassiSex" queue at the top of the admin dashboard (PAINEL-07). Server component: counts only,
 * rendered for staff (collection `users`) — /admin itself is staff-only.
 */
export async function FilaClassisex({ payload, user }: Pick<ServerProps, 'payload' | 'user'>) {
  if (!user || (user as { collection?: string }).collection !== 'users') return null
  const { pendentes, denunciasAbertas, urgentes } = await getModerationCounts(payload)
  const msgReports = await getMessageReportCounts(payload)
  const msgQueue = `${payload.config.routes.admin}/collections/message-reports?where[status][equals]=aberta`
  const adminRoute = payload.config.routes.admin
  const reportsLink = `${adminRoute}/collections/ad-reports?where[status][equals]=aberta`
  const equipe = (
    await payload.count({
      collection: 'ads',
      where: { and: [{ origemLegado: { equals: 'equipe' } }, { status: { equals: 'rascunho' } }] },
      overrideAccess: true,
    })
  ).totalDocs
  const equipeLink = `${adminRoute}/collections/ads?where[origemLegado][equals]=equipe&where[status][equals]=rascunho`
  const semConta = (
    await payload.count({
      collection: 'ads',
      where: { and: [{ enviadoSemConta: { equals: true } }, { status: { equals: 'pendente' } }] },
      overrideAccess: true,
    })
  ).totalDocs
  const semContaLink = `${adminRoute}/collections/ads?where[enviadoSemConta][equals]=true&where[status][equals]=pendente`
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
      <p style={{ margin: 'calc(var(--base) * 0.5) 0 0' }}>
        {msgReports.abertas === 0 ? (
          'Nenhuma denúncia de recado.'
        ) : (
          <a href={msgQueue}>
            {`Recados: ${msgReports.abertas} ${msgReports.abertas === 1 ? 'denúncia aberta' : 'denúncias abertas'}${
              msgReports.urgentes > 0
                ? ` · ${msgReports.urgentes} ${msgReports.urgentes === 1 ? 'urgente' : 'urgentes'}`
                : ''
            }`}
          </a>
        )}
      </p>
      <p style={{ margin: 'calc(var(--base) * 0.75) 0 0' }}>
        {semConta === 0 ? null : (
          <>
            <a href={semContaLink}>{`${semConta} sem conta em análise`}</a>
            {' · '}
          </>
        )}
        {equipe === 0 ? null : (
          <>
            <a href={equipeLink}>{`${equipe} ${equipe === 1 ? 'anúncio antigo da equipe' : 'anúncios antigos da equipe'} para revisar`}</a>
            {' · '}
          </>
        )}
        <a href={queue}>Ver fila</a> · <a href={reportsLink}>Ver denúncias</a> · <a href={`${adminRoute}/collections/ads`}>Todos os anúncios</a>
      </p>
    </section>
  )
}
