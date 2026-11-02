// Gera os ícones do PWA a partir de brand/logo-original.webp. Uso: node scripts/pwa/gerar-icones.mjs
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const fonte = path.join(raiz, 'brand/logo-original.webp')
const fundo = '#0E0B0D'

async function icone(tamanho, ocupacao, arquivo) {
  const miolo = Math.round(tamanho * ocupacao)
  const logo = await sharp(fonte).resize(miolo, miolo, { fit: 'inside' }).png().toBuffer()
  await sharp({ create: { width: tamanho, height: tamanho, channels: 4, background: fundo } })
    .composite([{ input: logo, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(raiz, 'public/icons', arquivo))
}

await icone(192, 0.8, 'icon-192.png')
await icone(512, 0.8, 'icon-512.png')
// maskable: o logo fica dentro da zona segura (cerca de 60% do lado)
await icone(512, 0.6, 'icon-maskable-512.png')
