import type { MetadataRoute } from 'next'

// PWA: instalável a partir de qualquer página pública. Sem atalhos para a área do assinante.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Paraíso Brasília',
    short_name: 'Paraíso',
    description: 'Casa de festas Paraíso Brasília: próximas festas, o espaço e como chegar.',
    lang: 'pt-BR',
    dir: 'ltr',
    start_url: '/?origem=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0E0B0D',
    theme_color: '#8B1538',
    categories: ['entertainment', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
