import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { describe, expect, it } from 'vitest'

import manifest from '@/app/manifest'
import { PWA_NUNCA_CACHEAR } from '@/lib/pwa/rotas'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const swSource = readFileSync(path.join(root, 'public/sw.js'), 'utf8')

// Carrega o sw.js num sandbox e expõe estrategia() e a lista de rotas
const sandbox: Record<string, unknown> = {
  self: { addEventListener() {}, location: { origin: 'https://site.test' } },
  URL,
}
vm.createContext(sandbox)
vm.runInContext(`${swSource}\n;globalThis.__e = estrategia; globalThis.__n = NUNCA_CACHEAR;`, sandbox)
const estrategia = sandbox.__e as (u: URL, r: unknown, o: string) => string
const nunca = sandbox.__n as string[]

const req = (over: Partial<{ method: string; mode: string; headers: Record<string, string> }> = {}) => ({
  method: 'GET',
  mode: 'no-cors',
  ...over,
  headers: { get: (k: string) => over.headers?.[k] ?? null },
})
const decidir = (p: string, r = req()) => estrategia(new URL(p, 'https://site.test'), r, 'https://site.test')

describe('service worker: o que nunca é guardado', () => {
  it('a lista do sw.js é a mesma de src/lib/pwa/rotas.ts', () => {
    expect([...nunca].sort()).toEqual([...PWA_NUNCA_CACHEAR].sort())
  })

  for (const rota of PWA_NUNCA_CACHEAR) {
    it(`${rota} passa direto, também em navegação`, () => {
      expect(decidir(`${rota}/x`, req({ mode: 'navigate' }))).toBe('passar')
      expect(decidir(rota, req({ mode: 'navigate' }))).toBe('passar')
    })
  }

  it('POST, RSC, Range e outra origem passam direto', () => {
    expect(decidir('/_next/static/a.js', req({ method: 'POST' }))).toBe('passar')
    expect(decidir('/contos?_rsc=abc', req({ mode: 'navigate' }))).toBe('passar')
    expect(decidir('/contos', req({ headers: { RSC: '1' } }))).toBe('passar')
    expect(decidir('/brand/logo-320.webp', req({ headers: { Range: 'bytes=0-1' } }))).toBe('passar')
    expect(estrategia(new URL('https://outro.test/_next/static/a.js'), req(), 'https://site.test')).toBe('passar')
  })

  it('HTML público: rede, com /offline só se a rede falhar', () => {
    expect(decidir('/contos', req({ mode: 'navigate' }))).toBe('rede-offline')
  })

  it('estáticos públicos são guardados', () => {
    expect(decidir('/_next/static/chunks/a.js')).toBe('cache-primeiro')
    expect(decidir('/brand/logo-320.webp')).toBe('swr')
    expect(decidir('/api/media/file/x.jpg')).toBe('passar')
    expect(decidir('/qualquer-outra-coisa.json')).toBe('passar')
  })
})

describe('manifest', () => {
  const m = manifest()
  it('é instalável e coerente com o site', () => {
    expect(m.lang).toBe('pt-BR')
    expect(m.scope).toBe('/')
    expect(m.display).toBe('standalone')
    expect(m.theme_color).toBe('#8B1538')
    expect(m.background_color).toBe('#0E0B0D')
    expect(JSON.stringify(m)).not.toContain('area-do-assinante')
  })
  it('os ícones existem em public/', () => {
    const tamanhos = new Set(m.icons?.map((i) => i.sizes))
    expect(tamanhos).toContain('192x192')
    expect(tamanhos).toContain('512x512')
    expect(m.icons?.some((i) => i.purpose === 'maskable')).toBe(true)
    for (const i of m.icons ?? []) expect(() => readFileSync(path.join(root, 'public', i.src))).not.toThrow()
  })
})

describe('next.config', () => {
  it('serve /sw.js sem cache e com escopo raiz', () => {
    const cfg = readFileSync(path.join(root, 'next.config.ts'), 'utf8')
    expect(cfg).toContain("source: '/sw.js'")
    expect(cfg).toContain('no-cache, no-store, must-revalidate')
    expect(cfg).toContain('Service-Worker-Allowed')
  })
})

describe('aviso de instalação', () => {
  it('aparece na home, mas não nas áreas restritas', async () => {
    const { PWA_SEM_AVISO } = await import('@/lib/pwa/rotas')
    expect(PWA_SEM_AVISO).not.toContain('/')
    expect(PWA_SEM_AVISO).toContain('/area-do-assinante')
    expect(PWA_SEM_AVISO).toContain('/entrar')
  })
})
