import type { PayloadRequest } from 'payload'

import { withRequestState } from './context'

export type AuditAction =
  | 'conta-criada'
  | 'conta-editada'
  | 'conta-excluida'
  | 'acesso-liberado'
  | 'acesso-renovado'
  | 'acesso-encerrado'
  | 'periodo-corrigido'
  | 'senha-definida-pela-equipe'
  | 'link-de-senha-gerado'
  | 'senha-trocada-pelo-assinante'
  // ClassiSex moderation (Phase 4)
  | 'anuncio-aprovado'
  | 'anuncio-recusado'
  | 'anuncio-despublicado'
  | 'denuncia-resolvida'
  // Recados moderation (Phase 5)
  | 'recado-aprovado'
  | 'recado-recusado'
  | 'recado-despublicado'
  // Message safety (Phase 5)
  | 'denuncia-mensagem-resolvida'
  | 'mensagens-suspensas'

export const AUDIT_ACTIONS: { label: string; value: AuditAction }[] = [
  { label: 'Conta criada', value: 'conta-criada' },
  { label: 'Conta editada', value: 'conta-editada' },
  { label: 'Conta excluída', value: 'conta-excluida' },
  { label: 'Acesso liberado', value: 'acesso-liberado' },
  { label: 'Acesso renovado', value: 'acesso-renovado' },
  { label: 'Acesso encerrado', value: 'acesso-encerrado' },
  { label: 'Período corrigido', value: 'periodo-corrigido' },
  { label: 'Senha definida pela equipe', value: 'senha-definida-pela-equipe' },
  { label: 'Link de nova senha gerado', value: 'link-de-senha-gerado' },
  { label: 'Senha trocada pelo assinante', value: 'senha-trocada-pelo-assinante' },
  { label: 'Anúncio aprovado', value: 'anuncio-aprovado' },
  { label: 'Anúncio recusado', value: 'anuncio-recusado' },
  { label: 'Anúncio despublicado', value: 'anuncio-despublicado' },
  { label: 'Denúncia resolvida', value: 'denuncia-resolvida' },
  { label: 'Recado aprovado', value: 'recado-aprovado' },
  { label: 'Recado recusado', value: 'recado-recusado' },
  { label: 'Recado despublicado', value: 'recado-despublicado' },
  { label: 'Denúncia de mensagem resolvida', value: 'denuncia-mensagem-resolvida' },
  { label: 'Mensagens suspensas', value: 'mensagens-suspensas' },
]

/** Never copied into the log (T-03-10). */
export const SECRET_FIELDS = [
  'password',
  'hash',
  'salt',
  'sessions',
  'resetPasswordToken',
  'resetPasswordExpiration',
  'loginAttempts',
  'lockUntil',
  'updatedAt',
  'createdAt',
]
const SKIPPED_FIELDS = [...SECRET_FIELDS, 'id', 'collection', '_strategy', '_verificationToken', 'periodos', 'historico']
/** Changes reported without their content (free text may hold personal data). */
const REDACTED_FIELDS = ['staffNotes']

export type AuditDiff = Record<string, { de: unknown; para: unknown } | 'alterada'>

const normalise = (value: unknown) => (value === undefined || value === '' ? null : value)
const same = (a: unknown, b: unknown) => JSON.stringify(normalise(a)) === JSON.stringify(normalise(b))

/** Changed fields as { de, para }; secrets, joins and bookkeeping fields skipped. */
export function diffForAudit(before: Record<string, unknown> | null, after: Record<string, unknown>): AuditDiff {
  const out: AuditDiff = {}
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after)])
  for (const key of keys) {
    if (SKIPPED_FIELDS.includes(key)) continue
    const de = before ? before[key] : null
    const para = after[key]
    if (same(de, para)) continue
    out[key] = REDACTED_FIELDS.includes(key) ? 'alterada' : { de: normalise(de), para: normalise(para) }
  }
  return out
}

export type AuditActor = { actorType: 'equipe' | 'assinante' | 'sistema'; actor?: number; actorLabel: string }

/** Who did it, always taken from the server-side principal (T-03-09). */
export function auditActorOf(req: Pick<PayloadRequest, 'user'>): AuditActor {
  const user = req.user as { collection?: string; id?: number; email?: string; name?: string } | null | undefined
  if (user?.collection === 'users') {
    return { actorType: 'equipe', actor: user.id, actorLabel: user.email ?? `Equipe #${user.id}` }
  }
  if (user?.collection === 'assinantes') {
    return { actorType: 'assinante', actorLabel: assinanteLabel(user) }
  }
  return { actorType: 'sistema', actorLabel: 'Sistema' }
}

export function assinanteLabel(doc: { name?: string | null; email?: string | null }): string {
  return `${doc.name ?? ''} <${doc.email ?? ''}>`.trim()
}

export type AuditEntry = {
  action: AuditAction
  assinante?: { id: number | string; name?: string | null; email?: string | null } | null
  /** Snapshot label when the account no longer exists */
  assinanteLabel?: string
  summary: string
  details?: Record<string, unknown>
}

/** Writes one row in the same request/transaction as the change it records. */
export async function writeAudit(req: PayloadRequest, entry: AuditEntry): Promise<void> {
  const actor = auditActorOf(req)
  await withRequestState(req, () =>
    req.payload.create({
      collection: 'audit-log',
      data: {
        action: entry.action,
        ...actor,
        assinante: entry.assinante ? Number(entry.assinante.id) : null,
        assinanteLabel: entry.assinanteLabel ?? (entry.assinante ? assinanteLabel(entry.assinante) : ''),
        summary: entry.summary,
        details: entry.details ?? {},
      },
      overrideAccess: true,
      context: { skipAudit: true },
      req,
    }),
  )
}
