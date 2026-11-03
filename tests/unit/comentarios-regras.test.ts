import { describe, expect, it } from 'vitest'

import { toComentarioDTOs, marcarMeus, quandoLabel } from '../../src/lib/classisex/comentarios/dto'
import {
  COMENTARIO_MAX,
  COMENTARIO_MESSAGES,
  DIA_MS,
  HORA_MS,
  QUEM_COMENTA,
  VISITANTE_LIMITE_DIA,
  VISITANTE_LIMITE_HORA,
  comentarioApelidoError,
  comentarioResumo,
  comentarioTextoError,
  normaliseComentario,
} from '../../src/lib/classisex/comentarios/rules'
import { REDACTED_LABEL } from '../../src/lib/classisex/redact'

const NOW = new Date('2026-11-03T18:00:00.000Z') // 15:00 em Brasília

describe('regras dos comentários', () => {
  it('por padrão qualquer pessoa comenta, com ou sem conta', () => {
    expect(QUEM_COMENTA).toBe('todos')
  })

  it('limites por IP do visitante: 10 por hora e 30 por dia', () => {
    expect(VISITANTE_LIMITE_HORA).toBe(10)
    expect(VISITANTE_LIMITE_DIA).toBe(30)
    expect(HORA_MS).toBe(3_600_000)
    expect(DIA_MS).toBe(24 * HORA_MS)
  })

  it('o nome do visitante segue a regra do apelido: sem contato, sem vazio', () => {
    expect(comentarioApelidoError('Zé do Plano')).toBeNull()
    expect(comentarioApelidoError('')).not.toBeNull()
    expect(comentarioApelidoError('me chama 61 99988-7766')).not.toBeNull()
  })

  it('normaliza: aparas, quebras de linha do Windows e 3 ou mais quebras seguidas', () => {
    expect(normaliseComentario('  oi\r\n\r\n\r\n\r\ntudo bem?  ')).toBe('oi\n\ntudo bem?')
    expect(normaliseComentario('a\rb')).toBe('a\nb')
    expect(normaliseComentario('   ')).toBe('')
  })

  it('valida o texto: vazio e longo demais', () => {
    expect(comentarioTextoError('')).toBe(COMENTARIO_MESSAGES.vazio)
    expect(comentarioTextoError('x'.repeat(COMENTARIO_MAX))).toBeNull()
    expect(comentarioTextoError('x'.repeat(COMENTARIO_MAX + 1))).toBe(COMENTARIO_MESSAGES.longo)
  })

  it('valida o apelido como nos recados: sem contato', () => {
    expect(comentarioApelidoError('')).toBe('Escolha um apelido.')
    expect(comentarioApelidoError('Casal Lua')).toBeNull()
    expect(comentarioApelidoError('casal@gmail.com')).not.toBeNull()
    expect(comentarioApelidoError('61 99988-7766')).not.toBeNull()
    expect(comentarioApelidoError('x'.repeat(41))).not.toBeNull()
  })

  it('resumo do painel: apelido e início do texto', () => {
    expect(comentarioResumo('Lua', 'Oi\n\ntudo bem')).toBe('Lua — Oi tudo bem')
    expect(comentarioResumo('Lua', 'a'.repeat(80))).toBe(`Lua — ${'a'.repeat(60)}…`)
  })
})

describe('rótulo de data dos comentários (horário de Brasília)', () => {
  it('hoje, ontem e data completa', () => {
    expect(quandoLabel('2026-11-03T17:32:00.000Z', NOW)).toBe('Hoje, 14:32')
    expect(quandoLabel('2026-11-02T23:05:00.000Z', NOW)).toBe('Ontem, 20:05')
    expect(quandoLabel('2026-10-25T12:00:00.000Z', NOW)).toBe('25/10/2026')
  })
})

describe('DTO dos comentários', () => {
  const docs = [
    { id: 3, apelido: 'Lia', texto: 'Resposta com zap 61 99988-7766', createdAt: '2026-11-03T17:10:00.000Z', parent: 1, doAnunciante: true },
    { id: 1, apelido: 'Rui', texto: 'Me chama em rui@exemplo.com ou @rui_bsb', createdAt: '2026-11-03T17:00:00.000Z', parent: null },
    { id: 4, apelido: 'Oculta', texto: 'Órfã', createdAt: '2026-11-03T17:20:00.000Z', parent: 99 },
    { id: 2, apelido: 'Teo', texto: 'Outro\n\ncomentário', createdAt: '2026-11-03T17:05:00.000Z' },
  ]

  it('monta o fio em ordem cronológica, respostas sob a raiz, e descarta resposta sem raiz', () => {
    const out = toComentarioDTOs(docs, { verContatos: true, now: NOW })
    expect(out.map((c) => c.id)).toEqual([1, 2])
    expect(out[0].respostas.map((r) => r.id)).toEqual([3])
    expect(out[0].respostas[0].doAnunciante).toBe(true)
    expect(JSON.stringify(out)).not.toContain('Órfã')
  })

  it('não-assinante: contatos do texto saem no servidor, nada de autor no DTO', () => {
    const out = toComentarioDTOs(docs, { verContatos: false, now: NOW })
    const json = JSON.stringify(out)
    expect(json).not.toContain('rui@exemplo.com')
    expect(json).not.toContain('@rui_bsb')
    expect(json).not.toContain('99988')
    expect(json).toContain(REDACTED_LABEL)
    expect(Object.keys(out[0]).sort()).toEqual(['apelido', 'doAnunciante', 'id', 'meu', 'quando', 'respostas', 'semConta', 'texto'])
    expect(json).not.toMatch(/author|email/i)
  })

  it('assinante ativo vê o texto como foi escrito', () => {
    const out = toComentarioDTOs(docs, { verContatos: true, now: NOW })
    expect(out[0].texto).toBe('Me chama em rui@exemplo.com ou @rui_bsb')
    expect(out[0].respostas[0].texto).toContain('61 99988-7766')
  })

  it('o apelido também passa pela redação para quem não é assinante', () => {
    const out = toComentarioDTOs([{ id: 1, apelido: 'casal@gmail.com', texto: 'oi', createdAt: '2026-11-03T17:00:00.000Z' }], {
      verContatos: false,
      now: NOW,
    })
    expect(out[0].apelido).toBe(REDACTED_LABEL)
  })

  it('visitante: marca semConta e nunca leva o selo do anunciante', () => {
    const out = toComentarioDTOs(
      [
        { id: 1, apelido: 'Qualquer', texto: 'oi', createdAt: '2026-11-03T17:00:00.000Z', semConta: true, doAnunciante: true },
        { id: 2, apelido: 'Dona', texto: 'oi', createdAt: '2026-11-03T17:01:00.000Z', doAnunciante: true },
      ],
      { verContatos: false, now: NOW },
    )
    expect(out[0]).toMatchObject({ semConta: true, doAnunciante: false })
    expect(out[1]).toMatchObject({ semConta: false, doAnunciante: true })
  })

  it('marca os comentários do próprio leitor sem mexer na cópia compartilhada', () => {
    const shared = toComentarioDTOs(docs, { verContatos: false, now: NOW })
    const mine = marcarMeus(shared, new Set([3, 2]))
    expect(mine[0].meu).toBe(false)
    expect(mine[1].meu).toBe(true)
    expect(mine[0].respostas[0].meu).toBe(true)
    expect(shared[1].meu).toBe(false)
    expect(shared[0].respostas[0].meu).toBe(false)
  })
})
