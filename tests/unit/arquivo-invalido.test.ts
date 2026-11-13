import { describe, expect, it } from 'vitest'

import { isMp4Error, Mp4Error } from '@/lib/classisex/mp4'
import { ArquivoInvalido, isArquivoInvalido } from '@/lib/midia-enviada/limpar'

describe('detecção de erros de arquivo sem depender de instanceof', () => {
  it('reconhece ArquivoInvalido e Mp4Error, inclusive de outra cópia do módulo', () => {
    expect(isArquivoInvalido(new ArquivoInvalido('O vídeo pode ter até 3 minutos.'))).toBe(true)
    const outraCopia = Object.assign(new Error('x'), { arquivoInvalido: true })
    expect(isArquivoInvalido(outraCopia)).toBe(true)
    expect(isArquivoInvalido(new Error('x'))).toBe(false)
    expect(isMp4Error(new Mp4Error())).toBe(true)
    expect(isMp4Error(Object.assign(new Error('x'), { name: 'Mp4Error' }))).toBe(true)
    expect(isMp4Error(new Error('x'))).toBe(false)
  })
})
