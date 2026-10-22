/** Shared by the list-view approve controls (row button and bulk bar). Browser side, no server imports. */

export type ApproveReply = { status: string; statusLabel: string }
export type BulkReply = { aprovados: number[]; falhas: { id: number; resumo: string | null; motivo: string }[] }

/** Same rows the server accepts without a special rule: waiting for approval, or a team draft of the old site. */
export function podeAprovarNaLista(row: { status?: string; origemLegado?: string | null }): boolean {
  return row.status === 'pendente' || (row.status === 'rascunho' && row.origemLegado === 'equipe')
}

/** POST JSON with the staff session cookie; failures become Errors with the server's message (Portuguese). */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => ({}))) as T & { message?: string; errors?: { message?: string; data?: { errors?: { message?: string }[] } }[] }
  if (!res.ok) {
    const nested = json.errors?.[0]?.data?.errors?.map((e) => e.message).filter(Boolean).join(' ')
    throw new Error(json.message ?? (nested || json.errors?.[0]?.message) ?? 'Não foi possível concluir.')
  }
  return json
}
