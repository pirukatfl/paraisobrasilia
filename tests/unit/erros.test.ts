import { describe, expect, it } from 'vitest'

import {
  MENSAGEM_ARQUIVO_GRANDE,
  MENSAGEM_BANCO,
  MENSAGEM_DUPLICADO,
  MENSAGEM_INESPERADA,
  MENSAGEM_REDE,
  mensagemAmigavel,
  mensagemDaResposta,
  mensagemDeExcecao,
  mensagemDeFalhaDeRede,
  traduzirMensagem,
} from '../../src/lib/errors'

describe('traduzirMensagem', () => {
  it('traduz as frases em inglês do Payload', () => {
    expect(traduzirMensagem('Something went wrong.')).toBe(MENSAGEM_INESPERADA)
    expect(traduzirMensagem('An unknown error occurred.')).toBe(MENSAGEM_INESPERADA)
    expect(traduzirMensagem('An error has occurred.')).toBe(MENSAGEM_INESPERADA)
    expect(traduzirMensagem('You are not allowed to perform this action.')).toBe('Você não tem permissão para fazer isso.')
    expect(traduzirMensagem('Unauthorized')).toBe('Sua sessão expirou. Entre de novo.')
    expect(traduzirMensagem('Value must be unique')).toContain('já está em uso')
    expect(traduzirMensagem('File size limit has been reached')).toBe(MENSAGEM_ARQUIVO_GRANDE)
    expect(traduzirMensagem('Failed to fetch')).toBe(MENSAGEM_REDE)
  })

  it('lista os campos inválidos', () => {
    expect(traduzirMensagem('The following field is invalid: Título')).toBe('Confira os campos: Título.')
    expect(traduzirMensagem('The following fields are invalid: Título, Data')).toBe('Confira os campos: Título, Data.')
  })

  it('deixa texto em português intacto', () => {
    expect(traduzirMensagem('Já existe um anúncio com esse título.')).toBe('Já existe um anúncio com esse título.')
  })
})

describe('mensagemAmigavel', () => {
  it('usa a mensagem de erros públicos', () => {
    const err = Object.assign(new Error('Anúncio não encontrado.'), { name: 'ServiceError', status: 404 })
    expect(mensagemAmigavel(err)).toBe('Anúncio não encontrado.')
  })

  it('traduz erro público em inglês', () => {
    const err = Object.assign(new Error('The requested resource was not found.'), { status: 404 })
    expect(mensagemAmigavel(err)).toBe('Não encontramos este item. Ele pode ter sido apagado.')
  })

  it('entende códigos do Postgres, também em cause', () => {
    expect(mensagemAmigavel(Object.assign(new Error('x'), { code: '23505' }))).toBe(MENSAGEM_DUPLICADO)
    expect(mensagemAmigavel(new Error('falhou', { cause: { code: '23503' } }))).toContain('ligado a outros registros')
    expect(mensagemAmigavel(Object.assign(new Error('x'), { code: '23502' }))).toContain('obrigatório')
    expect(mensagemAmigavel(Object.assign(new Error('x'), { code: '22001' }))).toContain('tamanho')
    expect(mensagemAmigavel(Object.assign(new Error('x'), { code: 'ECONNREFUSED' }))).toBe(MENSAGEM_BANCO)
  })

  it('limite de arquivo', () => {
    expect(mensagemAmigavel(new Error('File size limit has been reached'))).toBe(MENSAGEM_ARQUIVO_GRANDE)
  })

  it('nunca vaza SQL, tabela ou stack', () => {
    const sql = new Error('insert into "ads" ("id") values ($1) violates foreign key constraint "ads_fk"')
    const resultado = mensagemAmigavel(sql)
    expect(resultado).toBe(MENSAGEM_INESPERADA)
    const publicoComSql = Object.assign(new Error('relation "ads" does not exist'), { status: 400 })
    expect(mensagemAmigavel(publicoComSql)).toBe(MENSAGEM_INESPERADA)
    expect(mensagemAmigavel(new Error('boom at foo (/app/src/x.ts:1:1)'))).toBe(MENSAGEM_INESPERADA)
    expect(mensagemAmigavel('texto')).toBe(MENSAGEM_INESPERADA)
    expect(mensagemAmigavel(null)).toBe(MENSAGEM_INESPERADA)
  })

  it('aceita prefixo de contexto', () => {
    expect(mensagemAmigavel(new Error('x'), 'Não foi possível salvar')).toMatch(/^Não foi possível salvar: não foi possível/)
  })
})

describe('mensagemDaResposta', () => {
  it('prefere json.message', () => {
    expect(mensagemDaResposta(409, { message: 'Já existe uma assinatura ativa.' })).toBe('Já existe uma assinatura ativa.')
  })

  it('lê errors[0].message do Payload e traduz', () => {
    expect(mensagemDaResposta(403, { errors: [{ message: 'You are not allowed to perform this action.' }] })).toBe(
      'Você não tem permissão para fazer isso.',
    )
  })

  it('junta mensagens dos campos em data.errors', () => {
    const json = {
      errors: [
        {
          message: 'The following field is invalid: Título',
          data: { errors: [{ message: 'Informe o título.' }, { message: 'Informe a data.' }] },
        },
      ],
    }
    expect(mensagemDaResposta(400, json)).toBe('Informe o título. Informe a data.')
  })

  it('cai no texto por status quando não há corpo', () => {
    expect(mensagemDaResposta(401, null)).toBe('Sua sessão expirou. Entre de novo.')
    expect(mensagemDaResposta(403, {})).toBe('Você não tem permissão para fazer isso.')
    expect(mensagemDaResposta(404, undefined)).toBe('Não encontramos este item. Ele pode ter sido apagado.')
    expect(mensagemDaResposta(413, null)).toBe(MENSAGEM_ARQUIVO_GRANDE)
    expect(mensagemDaResposta(429, null)).toContain('Muitas tentativas')
    expect(mensagemDaResposta(502, null)).toContain('indisponível')
    expect(mensagemDaResposta(500, null)).toBe(MENSAGEM_INESPERADA)
  })

  it('"Something went wrong" em 500 vira a mensagem inesperada em português', () => {
    expect(mensagemDaResposta(500, { errors: [{ message: 'Something went wrong.' }] })).toBe(MENSAGEM_INESPERADA)
  })

  it('"Something went wrong" em 403 usa o texto de permissão', () => {
    expect(mensagemDaResposta(403, { message: 'Something went wrong.' })).toBe('Você não tem permissão para fazer isso.')
  })
})

describe('falhas de rede', () => {
  it('mensagemDeFalhaDeRede', () => {
    expect(mensagemDeFalhaDeRede(new TypeError('Failed to fetch'))).toBe(MENSAGEM_REDE)
    expect(mensagemDeFalhaDeRede()).toBe(MENSAGEM_REDE)
  })

  it('mensagemDeExcecao', () => {
    expect(mensagemDeExcecao(new TypeError('Failed to fetch'))).toBe(MENSAGEM_REDE)
    expect(mensagemDeExcecao(new Error('Informe o motivo da recusa.'))).toBe('Informe o motivo da recusa.')
    expect(mensagemDeExcecao(new Error('Unexpected token < in JSON'))).toBe(MENSAGEM_INESPERADA)
    expect(mensagemDeExcecao('x')).toBe(MENSAGEM_INESPERADA)
  })
})
