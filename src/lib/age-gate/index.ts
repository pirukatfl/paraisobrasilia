import type React from 'react'

import type { TextoRico } from '@/lib/textos/rico'

import { selfDeclaration } from './self-declaration'

/**
 * Swappable age verification (INST-04, ECA Digital). A stronger provider can replace
 * self-declaration by registering it here and setting NEXT_PUBLIC_AGE_GATE_PROVIDER.
 * Pages never know which provider is active; the gate never redirects or hides HTML.
 */
export type AgeGateTextos = {
  titulo: string
  texto: TextoRico
  botaoEntrar: string
  botaoSair: string
}

export interface AgeVerifier {
  id: string
  Prompt: React.ComponentType<{ onVerified: () => void; textos: AgeGateTextos }>
}

const registry: Record<string, AgeVerifier> = {
  [selfDeclaration.id]: selfDeclaration,
}

export function getActiveVerifier(
  providerId: string = process.env.NEXT_PUBLIC_AGE_GATE_PROVIDER ?? 'self-declaration',
): AgeVerifier {
  const verifier = registry[providerId]
  if (!verifier) {
    throw new Error(`Unknown age gate provider "${providerId}" (NEXT_PUBLIC_AGE_GATE_PROVIDER)`)
  }
  return verifier
}
