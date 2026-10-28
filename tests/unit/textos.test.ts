import { describe, expect, it } from 'vitest'

import { criarGlobalDeTextos } from '../../src/globals/Textos'
import { AREAS } from '../../src/lib/textos/areas'
import { geral } from '../../src/lib/textos/areas/geral'
import { mensagens } from '../../src/lib/textos/areas/mensagens'
import { mesclarTextos, padroesDaArea, preencher } from '../../src/lib/textos/mesclar'
import { textoParaRico } from '../../src/lib/textos/rico'
import { ajudaDoCampo, AVISO_SO_TEXTO, type CampoTexto } from '../../src/lib/textos/tipos'

const area = {
  slug: 'textos-teste',
  rotulo: 'Teste',
  descricao: 'Teste.',
  campos: {
    titulo: { rotulo: 'Título', padrao: 'Original' },
    chamada: { rotulo: 'Chamada', padrao: 'Texto {nome}', ajuda: 'Use {nome}.' },
  },
}

const salvoNegrito = {
  root: {
    type: 'root',
    version: 1,
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'Novo', format: 1 }] }],
  },
}

describe('mesclarTextos (PAINEL-10)', () => {
  it('falls back to the original for empty, blank, null and missing values', () => {
    expect(mesclarTextos(area, { titulo: '', chamada: '   ' })).toEqual(padroesDaArea(area))
    expect(mesclarTextos(area, { titulo: null, chamada: 42 })).toEqual(padroesDaArea(area))
    expect(mesclarTextos(area, null)).toEqual(padroesDaArea(area))
    expect(mesclarTextos(area, undefined)).toEqual(padroesDaArea(area))
  })

  it('uses the saved value and ignores extra keys', () => {
    const out = mesclarTextos(area, { titulo: salvoNegrito, id: 1, globalType: 'x', outro: 'y' })
    expect(out).toEqual({ titulo: salvoNegrito, chamada: textoParaRico('Texto {nome}') })
  })
})

describe('mesclarTextos with block fields', () => {
  const comEditor = {
    ...area,
    campos: {
      ...area.campos,
      paragrafo: { rotulo: 'Parágrafo', padrao: 'Linha um\nLinha dois\n\nOutro {nome}', bloco: true as const, ajuda: 'Use {nome}.' },
    },
  }
  const salvo = {
    root: {
      type: 'root',
      version: 1,
      children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', version: 1, text: 'Novo', format: 1 }] }],
    },
  }
  const vazio = {
    root: { type: 'root', version: 1, children: [{ type: 'paragraph', version: 1, children: [] }] },
  }

  it('turns the original of every field into editor state', () => {
    const out = padroesDaArea(comEditor)
    expect(out.paragrafo).toEqual(textoParaRico('Linha um\nLinha dois\n\nOutro {nome}'))
    expect(out.titulo).toEqual(textoParaRico('Original'))
  })

  it('uses saved editor state, falls back to the original for an emptied editor', () => {
    expect(mesclarTextos(comEditor, { paragrafo: salvo }).paragrafo).toBe(salvo)
    for (const esvaziado of [vazio, null, undefined, '', '   ', 42, {}, { root: null }]) {
      expect(mesclarTextos(comEditor, { paragrafo: esvaziado }).paragrafo).toEqual(padroesDaArea(comEditor).paragrafo)
    }
  })

  it('converts a plain string still stored in any field (before the migration ran)', () => {
    expect(mesclarTextos(comEditor, { paragrafo: 'Texto antigo\n\nSegundo' }).paragrafo).toEqual(
      textoParaRico('Texto antigo\n\nSegundo'),
    )
    expect(mesclarTextos(comEditor, { titulo: 'Título antigo' }).titulo).toEqual(textoParaRico('Título antigo'))
  })
})

describe('preencher', () => {
  it('replaces variables and keeps unknown ones', () => {
    expect(preencher('Olá {nome}, {n} fotos {x}', { nome: 'Ana', n: 3 })).toBe('Olá Ana, 3 fotos {x}')
  })

  it('drops nothing when the editor removed the variable', () => {
    expect(preencher('Sem variável', { nome: 'Ana' })).toBe('Sem variável')
  })
})

describe('registry sanity (all areas)', () => {
  const areas = Object.values(AREAS)

  it('warns in the admin help of every plain-text-only field, and only of those', () => {
    for (const a of areas) {
      for (const [nome, campo] of Object.entries(a.campos as Record<string, CampoTexto>)) {
        const ajuda = ajudaDoCampo(campo) ?? ''
        expect(ajuda.includes(AVISO_SO_TEXTO), `${a.slug}.${nome}`).toBe(campo.soTexto === true)
      }
    }
  })

  it('marks every Google/meta/WhatsApp-message text as plain-text-only', () => {
    for (const a of areas) {
      for (const [nome, campo] of Object.entries(a.campos as Record<string, CampoTexto>)) {
        // Fields that also render on the page (title/intro of a page) keep their formatting there
        if ((/google/i.test(nome) && !/^botao/.test(nome)) || /^descricaoReserva$|Mensagem$/.test(nome)) expect(campo.soTexto, `${a.slug}.${nome}`).toBe(true)
      }
    }
  })

  it('has unique slugs starting with textos-', () => {
    const slugs = areas.map((a) => a.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^textos-[a-z]+(-[a-z]+)*$/)
  })

  it.each(areas.map((a) => [a.slug, a] as const))('%s has valid fields', (_slug, a) => {
    expect(a.rotulo.trim()).not.toBe('')
    const reserved = new Set(['id', 'globalType', 'createdAt', 'updatedAt', '_status'])
    for (const [nome, campo] of Object.entries(a.campos as Record<string, CampoTexto>)) {
      expect(nome, nome).toMatch(/^[a-z][a-zA-Z0-9]{0,39}$/)
      expect(reserved.has(nome), nome).toBe(false)
      expect(campo.rotulo.trim(), nome).not.toBe('')
      expect(campo.padrao.trim(), nome).not.toBe('')
      for (const [, variavel] of campo.padrao.matchAll(/\{([a-zA-Z0-9_]+)\}/g)) {
        expect(campo.ajuda ?? '', `${nome} -> {${variavel}}`).toContain(`{${variavel}}`)
      }
      // Postgres identifiers: <global slug>_<field>, snake_case, at most 63 characters
      const coluna = `${a.slug.replace(/-/g, '_')}_${nome.replace(/([A-Z])/g, '_$1').toLowerCase()}`
      expect(coluna.length, coluna).toBeLessThanOrEqual(63)
    }
  })
})

describe('criarGlobalDeTextos', () => {
  it('builds optional editors prefilled with the original text, grouped in collapsibles', () => {
    const global = criarGlobalDeTextos(geral)
    expect(global.slug).toBe('textos-geral')
    expect(global.admin?.group).toBe('Textos do site')
    const flat = global.fields.flatMap((f) => ('fields' in f && f.type === 'collapsible' ? f.fields : [f]))
    expect(flat).toHaveLength(Object.keys(geral.campos).length)
    const editores = new Set<unknown>()
    for (const f of flat) {
      if (f.type !== 'richText') throw new Error('every field must be an editor')
      const campo = (geral.campos as Record<string, CampoTexto>)[f.name]
      expect(f.defaultValue).toEqual(textoParaRico(campo.padrao))
      editores.add(f.editor)
      expect('required' in f && f.required).toBeFalsy()
      const descricao = (f.admin as { description?: string } | undefined)?.description ?? ''
      expect(descricao.includes(AVISO_SO_TEXTO), f.name).toBe(campo.soTexto === true)
    }
    // Block editor and line editor
    expect(editores.size).toBe(2)
    expect(global.fields.every((f) => f.type === 'collapsible')).toBe(true)
    expect(global.admin?.hidden).toBe(false)
  })

  it('hides the Recados area from the admin menu (2026-10-26)', () => {
    expect(criarGlobalDeTextos(mensagens).admin?.hidden).toBe(true)
  })
})
