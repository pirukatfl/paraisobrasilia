/* Service worker do Paraíso Brasília.
 * Regra de ouro: NUNCA guarda HTML, RSC, API, admin, área do assinante nem mídia privada.
 * Só guarda arquivos estáticos públicos com hash (/_next/static) e a marca. Offline: página /offline.
 * Kill switch: publicar um sw.js que chame self.registration.unregister() e apague os caches. */
const VERSAO = 'pb-v1'
const CACHE_ESTATICO = 'pb-static-' + VERSAO
const CACHE_MARCA = 'pb-brand-' + VERSAO
const PRECACHE = ['/offline', '/icons/icon-192.png', '/brand/logo-320.webp']
const MAX_ESTATICO = 150

const NUNCA_CACHEAR = [
  '/api',
  '/admin',
  '/area-do-assinante',
  '/entrar',
  '/cadastro',
  '/nova-senha',
  '/esqueci-senha',
  '/classisex/previa',
  '/enviar-fotos-e-videos',
  '/_next/image',
]

const sobCaminho = (pathname, base) => pathname === base || pathname.startsWith(base + '/')

/** Decide o que fazer com uma requisição: 'passar' | 'rede-offline' | 'cache-primeiro' | 'swr'. */
function estrategia(url, req, origem) {
  if (req.method !== 'GET') return 'passar'
  if (url.origin !== origem) return 'passar'
  const p = url.pathname
  if (NUNCA_CACHEAR.some((b) => sobCaminho(p, b))) return 'passar'
  if (url.searchParams.has('_rsc') || req.headers.get('RSC') || req.headers.get('Range')) return 'passar'
  if (req.mode === 'navigate') return 'rede-offline'
  if (p.startsWith('/_next/static/')) return 'cache-primeiro'
  if (p.startsWith('/brand/') || p.startsWith('/icons/') || p === '/og-default.jpg') return 'swr'
  return 'passar'
}

/** Defesa extra: só guarda resposta pública e sem cookie. */
function guardavel(res) {
  if (!res || !res.ok || res.type !== 'basic') return false
  const cc = (res.headers.get('Cache-Control') || '').toLowerCase()
  if (cc.includes('private') || cc.includes('no-store')) return false
  if (res.headers.has('Set-Cookie')) return false
  return !/cookie/i.test(res.headers.get('Vary') || '')
}

async function limitar(cache, max) {
  const chaves = await cache.keys()
  for (let i = 0; i < chaves.length - max; i++) await cache.delete(chaves[i])
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_MARCA)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => !n.endsWith(VERSAO)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  // Ao sair da conta o site pede limpeza total (redundância: nada privado é guardado)
  if (event.data && event.data.tipo === 'limpar') {
    event.waitUntil(caches.keys().then((nomes) => Promise.all(nomes.map((n) => caches.delete(n)))))
  }
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)
  const modo = estrategia(url, req, self.location.origin)
  if (modo === 'passar') return

  if (modo === 'rede-offline') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/offline').then((r) => r || Response.error())),
    )
    return
  }

  const nomeCache = modo === 'cache-primeiro' ? CACHE_ESTATICO : CACHE_MARCA
  event.respondWith(
    caches.open(nomeCache).then(async (cache) => {
      const guardada = await cache.match(req)
      const buscar = () =>
        fetch(req).then((res) => {
          if (guardavel(res)) {
            cache.put(req, res.clone()).then(() => (modo === 'cache-primeiro' ? limitar(cache, MAX_ESTATICO) : undefined))
          }
          return res
        })
      if (modo === 'cache-primeiro') return guardada || buscar()
      const rede = buscar().catch(() => guardada || Response.error())
      return guardada || rede
    }),
  )
})
