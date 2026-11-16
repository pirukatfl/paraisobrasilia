import { DefaultTemplate } from '@payloadcms/next/templates'
import type { AdminViewServerProps } from 'payload'

import { NovoAssinanteForm, type PlanOption } from './NovoAssinanteForm'

/**
 * /admin/novo-assinante — staff creates the account, picks the plan and gets the password link in
 * one step. Server component: plans are read here; the staff-only endpoint does the work.
 */
export async function NovoAssinanteView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, visibleEntities, permissions } = initPageResult
  const { payload, user } = req
  const staff = Boolean(user && (user as { collection?: string }).collection === 'users')

  let plans: PlanOption[] = []
  if (staff) {
    const { docs } = await payload.find({
      collection: 'plans',
      where: { active: { equals: true } },
      sort: ['order', 'durationDays'],
      depth: 0,
      limit: 20,
      overrideAccess: true,
    })
    plans = docs.map((p) => ({
      id: p.id,
      name: p.name,
      durationDays: p.durationDays,
      amount: typeof p.promoPrice === 'number' && p.promoPrice > 0 ? p.promoPrice : p.price,
    }))
  }

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 'calc(var(--base) * 1) 0' }}>
        {staff ? <NovoAssinanteForm plans={plans} adminRoute={payload.config.routes.admin} /> : <p role="alert">Sem permissão.</p>}
      </div>
    </DefaultTemplate>
  )
}
