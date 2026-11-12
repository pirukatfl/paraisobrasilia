import 'server-only'

import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

import { privateMediaDir } from '../classisex/storage'

const run = promisify(execFile)

const pastaCapas = () => path.join(privateMediaDir(), 'capas-video')
const arquivoCapa = (id: number) => path.join(pastaCapas(), `${id}.jpg`)
const emAndamento = new Map<number, Promise<string | null>>()

async function gerar(id: number, origem: string): Promise<string | null> {
  const destino = arquivoCapa(id)
  const tmp = `${destino}.${process.pid}.tmp.jpg`
  try {
    await fs.promises.mkdir(pastaCapas(), { recursive: true })
    // One frame at 1 s (the very first frame is often black), 640 px wide; shorter clips fall back to the first frame
    for (const ss of ['1', '0']) {
      await run(
        'ffmpeg',
        ['-v', 'error', '-y', '-ss', ss, '-i', origem, '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', '-f', 'image2', tmp],
        { timeout: 20_000 },
      ).catch(() => null)
      const ok = await fs.promises.stat(tmp).then((s) => s.size > 0, () => false)
      if (ok) {
        await fs.promises.rename(tmp, destino)
        return destino
      }
    }
    return null
  } catch (err) {
    console.error(`[amadores] capa do vídeo ${id} falhou: ${(err as Error).message}`)
    return null
  } finally {
    await fs.promises.rm(tmp, { force: true })
  }
}

/** Path of the JPEG frame of an approved video (made once with ffmpeg, then kept on the private volume), or null. */
export async function capaDoVideo(id: number, filename: string): Promise<string | null> {
  const existente = arquivoCapa(id)
  if (await fs.promises.stat(existente).then((s) => s.size > 0, () => false)) return existente
  let pendente = emAndamento.get(id)
  if (!pendente) {
    pendente = gerar(id, path.join(privateMediaDir(), path.basename(filename))).finally(() => emAndamento.delete(id))
    emAndamento.set(id, pendente)
  }
  return pendente
}
