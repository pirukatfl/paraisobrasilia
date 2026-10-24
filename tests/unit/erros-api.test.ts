import { describe, expect, it } from 'vitest'

import { traduzirErroDaApi } from '../../src/lib/errors/after-error'
import { MENSAGEM_DUPLICADO, MENSAGEM_INESPERADA } from '../../src/lib/errors'

const run = (error: unknown, result: unknown) =>
  traduzirErroDaApi({ error, result, req: {} } as never) as { response: { message: string; errors: Record<string, unknown>[] } }

describe('traduzirErroDaApi', () => {
  it('troca "Something went wrong." pela mensagem do erro original', () => {
    const original = Object.assign(new Error('duplicate key value violates unique constraint "x"'), { code: '23505' })
    const { response } = run(original, { errors: [{ message: 'Something went wrong.' }] })
    expect(response.message).toBe(MENSAGEM_DUPLICADO)
    expect(response.errors).toEqual([{ message: MENSAGEM_DUPLICADO }])
  })

  it('erro desconhecido vira mensagem inesperada sem expor detalhes', () => {
    const { response } = run(new Error('select * from "ads" boom'), { errors: [{ message: 'Something went wrong.' }] })
    expect(response.message).toBe(MENSAGEM_INESPERADA)
    expect(JSON.stringify(response)).not.toMatch(/select|ads/)
  })

  it('mantém data/field/path e traduz as mensagens públicas', () => {
    const { response } = run(new Error('x'), {
      errors: [
        {
          name: 'ValidationError',
          message: 'The following field is invalid: Título',
          data: { collection: 'parties', errors: [{ message: 'This field is required.', path: 'title' }] },
        },
      ],
    })
    expect(response.message).toBe('Confira os campos: Título.')
    const e = response.errors[0] as { name: string; data: { collection: string; errors: { message: string; path: string }[] } }
    expect(e.name).toBe('ValidationError')
    expect(e.data.collection).toBe('parties')
    expect(e.data.errors[0]).toEqual({ message: 'Este campo é obrigatório.', path: 'title' })
  })

  it('sem errors no resultado usa a mensagem do erro', () => {
    const { response } = run(Object.assign(new Error('x'), { code: 'ECONNREFUSED' }), {})
    expect(response.message).toContain('banco de dados')
  })
})
