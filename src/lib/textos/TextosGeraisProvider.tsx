'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { Textos } from './areas'
import { geral } from './areas/geral'
import { padroesDaArea } from './mesclar'

const PADROES = padroesDaArea(geral) as Textos<'geral'>
const TextosGeraisContext = createContext<Textos<'geral'> | null>(null)

/** Shares the "geral" area with shared client components (menu, gallery, error page). Other areas are not sent to the browser. */
export function TextosGeraisProvider({ textos, children }: { textos: Textos<'geral'>; children: ReactNode }) {
  return <TextosGeraisContext.Provider value={textos}>{children}</TextosGeraisContext.Provider>
}

/** Outside the provider (tests, error boundaries above the layout) the original texts are used. */
export function useTextosGerais(): Textos<'geral'> {
  return useContext(TextosGeraisContext) ?? PADROES
}
