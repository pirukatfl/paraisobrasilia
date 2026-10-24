import type { AfterErrorHook } from 'payload'

import { mensagemAmigavel, traduzirMensagem } from './index'

type ErroDaResposta = { message?: string; data?: { errors?: { message?: string }[] } & Record<string, unknown>; [k: string]: unknown }

/**
 * Global `hooks.afterError` (payload.config.ts): every error answered by Payload's REST API
 * carries `message` and `errors[].message` in Portuguese. Payload swaps non-public 500s for
 * "Something went wrong." before this runs, so those are rebuilt from the original error
 * (mensagemAmigavel never exposes SQL, stacks or table names). `errors[].data`, `field` and `path`
 * stay as they are: the admin form uses them to highlight the invalid field.
 */
export const traduzirErroDaApi: AfterErrorHook = ({ error, result }) => {
  const original = (result?.errors ?? []) as ErroDaResposta[]
  const escondido = original.length === 0 || original.every((e) => typeof e.message !== 'string' || /^something went wrong\.?$/i.test(e.message))

  const errors: ErroDaResposta[] = escondido
    ? [{ message: mensagemAmigavel(error) }]
    : original.map((e) => ({
        ...e,
        message: typeof e.message === 'string' ? traduzirMensagem(e.message) : mensagemAmigavel(error),
        ...(e.data?.errors
          ? {
              data: {
                ...e.data,
                errors: e.data.errors.map((d) => (typeof d.message === 'string' ? { ...d, message: traduzirMensagem(d.message) } : d)),
              },
            }
          : {}),
      }))

  return { response: { ...result, errors, message: errors[0].message } }
}
