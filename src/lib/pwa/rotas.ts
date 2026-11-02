/**
 * Rotas que o service worker nunca guarda (área do assinante, admin, API, mídia privada).
 * Espelhado em public/sw.js (JS puro, sem build); tests/unit/pwa-sw.test.ts garante que a lista é a mesma.
 */
export const PWA_NUNCA_CACHEAR = [
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
] as const

/** Páginas em que o aviso de instalação não aparece. */
export const PWA_SEM_AVISO = ['/', ...PWA_NUNCA_CACHEAR.filter((r) => r !== '/api' && r !== '/_next/image')] as const
