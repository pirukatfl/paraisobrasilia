import { reenviarConfirmacao } from '@/lib/assinantes/actions'

import { FormField } from './FormField'

/** "Reenviar link" form (posts the e-mail only; the answer is always the same screen). */
export function ResendForm({ id = 'reenviar' }: { id?: string }) {
  return (
    <form action={reenviarConfirmacao} className="mt-4 flex max-w-[440px] flex-col gap-3" aria-label="Reenviar link de confirmação">
      <FormField id={`${id}-email`} name="email" type="email" label="E-mail da conta" autoComplete="email" />
      <button type="submit" className="btn-secondary self-start">
        Reenviar link
      </button>
    </form>
  )
}
