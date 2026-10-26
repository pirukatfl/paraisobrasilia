import { areaAssinante } from './areaAssinante'
import { assine } from './assine'
import { classisex } from './classisex'
import { conta } from './conta'
import { contato } from './contato'
import { contos } from './contos'
import { dicasHot } from './dicasHot'
import { enviarConto } from './enviarConto'
import { espaco } from './espaco'
import { festas } from './festas'
import { geral } from './geral'
import { inicio } from './inicio'
import { institucional } from './institucional'
import { mensagens } from './mensagens'
import { meusAnuncios } from './meusAnuncios'
import { modelos } from './modelos'
import type { TextosDaArea } from '../tipos'

/** Every editable-text area (06.2). Each area lives in its own file. */
export const AREAS = {
  geral,
  inicio,
  festas,
  espaco,
  modelos,
  institucional,
  contato,
  assine,
  conta,
  areaAssinante,
  classisex,
  meusAnuncios,
  enviarConto,
  contos,
  dicasHot,
  mensagens,
} as const

export type AreaKey = keyof typeof AREAS
export type Textos<K extends AreaKey> = TextosDaArea<(typeof AREAS)[K]>
