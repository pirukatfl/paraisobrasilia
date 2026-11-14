import { describe, expect, it } from 'vitest'

import { estaOculto, filtrarItens, LINK_EXTERNO_PADRAO, MENU_ITENS, MENU_VAZIO, toMenuConfig, urlExternaSegura } from '../../src/lib/site/menu'
import { getMemberNavItems, getNavItems } from '../../src/lib/site/nav'
import { AREAS } from '../../src/lib/textos/areas'
import { padroesDaArea } from '../../src/lib/textos/mesclar'
import { textoPuro } from '../../src/lib/textos/rico'

const t = padroesDaArea(AREAS.geral) as Parameters<typeof getNavItems>[0]
const keys = (items: { key: string; children?: { key: string }[] }[]) =>
  items.flatMap((i) => [i.key, ...(i.children ?? []).map((c) => c.key)])

describe('Menu do site: itens escondidos e link externo', () => {
  it('lists every key of the public and members menus as a panel option', () => {
    const options = new Set<string>(MENU_ITENS.map((i) => i.value))
    for (const k of [...keys(getNavItems(t)), ...keys(getMemberNavItems(t, toMenuConfig(null)))]) {
      expect(options.has(k), k).toBe(true)
    }
  })

  it('hides an item by its key, and a hidden parent takes its children along', () => {
    const semEspaco = keys(getNavItems(t, { ...MENU_VAZIO, ocultos: ['espaco', 'contos'] }))
    expect(semEspaco).not.toContain('espaco')
    expect(semEspaco).not.toContain('contos')
    const semQuem = keys(getNavItems(t, { ...MENU_VAZIO, ocultos: ['quem-somos'] }))
    expect(semQuem).not.toContain('quem-somos')
    expect(semQuem).not.toContain('normas')
    const semFilho = keys(getNavItems(t, { ...MENU_VAZIO, ocultos: ['regras'] }))
    expect(semFilho).toContain('quem-somos')
    expect(semFilho).toContain('normas')
    expect(semFilho).not.toContain('regras')
    const semGaleria = keys(getNavItems(t, { ...MENU_VAZIO, ocultos: ['galeria'] }))
    expect(semGaleria).not.toContain('galeria')
    expect(semGaleria).not.toContain('galeria-amadoras')
  })

  it('Vídeos has no link of its own: Amadores for everyone, Pornô grátis (external) first for subscribers', () => {
    const cfg = toMenuConfig(null)
    const publico = getNavItems(t, cfg).find((i) => i.key === 'videos')!
    expect(publico.semLink).toBe(true)
    expect(textoPuro(publico.label)).toBe('Vídeos')
    expect(publico.children?.map((c) => c.key)).toEqual(['galeria-videos-amadores'])
    expect(publico.children?.[0].href).toBe('/videos-amadores')
    expect(textoPuro(publico.children![0].label)).toBe('Amadores')
    expect(getNavItems(t, cfg).find((i) => i.key === 'galeria')?.children?.map((c) => c.key)).toEqual(['galeria-profissionais', 'galeria-amadoras'])
    const logado = getMemberNavItems(t, cfg).find((i) => i.key === 'videos')!
    expect(logado.children?.map((c) => c.key)).toEqual(['link-externo', 'galeria-videos-amadores'])
    expect(logado.children?.[0]).toMatchObject({ href: LINK_EXTERNO_PADRAO.url, external: true })
    expect(textoPuro(logado.children![0].label)).toBe('Pornô grátis')
  })

  it('hiding Pornô grátis or Amadores leaves the other; hiding Vídeos (or both) removes the group', () => {
    const cfg = toMenuConfig(null)
    const so = (ocultos: string[]) => getMemberNavItems(t, { ...cfg, ocultos }).find((i) => i.key === 'videos')?.children?.map((c) => c.key)
    expect(so(['link-externo'])).toEqual(['galeria-videos-amadores'])
    expect(so(['galeria-videos-amadores'])).toEqual(['link-externo'])
    expect(so(['videos'])).toBeUndefined()
    expect(so(['link-externo', 'galeria-videos-amadores'])).toBeUndefined()
  })

  it('applies to the members menu and the footer rule too', () => {
    const logado = keys(getMemberNavItems(t, { ...MENU_VAZIO, ocultos: ['dicas-hot', 'trocar-senha'] }))
    expect(logado).not.toContain('dicas-hot')
    expect(logado).not.toContain('trocar-senha')
    expect(logado).toContain('classisex')
    expect(estaOculto('normas', ['quem-somos'])).toBe(true)
    expect(estaOculto('contato', ['quem-somos'])).toBe(false)
  })

  it('Promoção is not a menu item (it is a home section); staff can still hide the section by its key', () => {
    expect(keys(getNavItems(t))).not.toContain('promocao')
    expect(keys(getMemberNavItems(t))).not.toContain('promocao')
    expect(getNavItems(t).some((i) => 'acao' in i)).toBe(false)
    expect(toMenuConfig({ itensOcultos: ['promocao'] }).ocultos).toEqual(['promocao'])
    expect(estaOculto('promocao', ['promocao'])).toBe(true)
  })

  it('nothing hidden by default; unknown keys are ignored', () => {
    expect(toMenuConfig(null).ocultos).toEqual([])
    expect(toMenuConfig({ itensOcultos: ['espaco', 'x', 3] }).ocultos).toEqual(['espaco'])
    const todos = keys(getNavItems(t))
    expect(filtrarItens(getNavItems(t), []).length).toBe(getNavItems(t).length)
    expect(todos).toContain('area-do-assinante')
  })

  it('the external link exists only in the logged-in menu, last, and never in the public one', () => {
    const cfg = toMenuConfig(null)
    expect(cfg.linkExterno).toEqual({ rotulo: LINK_EXTERNO_PADRAO.rotulo, url: LINK_EXTERNO_PADRAO.url })
    const publico = getNavItems(t, cfg)
    expect(JSON.stringify(publico)).not.toContain('redtube')
    expect(keys(publico)).not.toContain('link-externo')
    const logado = getMemberNavItems(t, cfg)
    const last = logado[logado.length - 1]
    expect(last).toMatchObject({ key: 'videos', semLink: true })
    expect(last.children?.[0]).toMatchObject({ key: 'link-externo', href: 'https://www.redtube.com.br/', external: true })
    expect(textoPuro(last.children![0].label)).toBe('Pornô grátis')
  })

  it('the external link can be turned off, hidden by key, or replaced', () => {
    expect(toMenuConfig({ linkExterno: { ativo: false } }).linkExterno).toBeNull()
    const oculto = getMemberNavItems(t, toMenuConfig({ itensOcultos: ['link-externo'] }))
    expect(oculto.some((i) => i.external)).toBe(false)
    const outro = toMenuConfig({ linkExterno: { ativo: true, rotulo: ' Outro ', url: 'https://exemplo.com.br/x' } })
    expect(outro.linkExterno).toEqual({ rotulo: 'Outro', url: 'https://exemplo.com.br/x' })
  })

  it('only http(s) addresses become a link', () => {
    expect(urlExternaSegura('https://www.redtube.com.br/')).toBe('https://www.redtube.com.br/')
    expect(urlExternaSegura('http://exemplo.com')).toBe('http://exemplo.com/')
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'ftp://x.com', 'redtube.com.br', '', '   ', null, 5]) {
      expect(urlExternaSegura(bad), String(bad)).toBeNull()
    }
    // a bad stored address never renders; the original one is not swapped in silently when staff typed junk
    expect(toMenuConfig({ linkExterno: { ativo: true, rotulo: 'X', url: 'javascript:alert(1)' } }).linkExterno).toBeNull()
  })
})
