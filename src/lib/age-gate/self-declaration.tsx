'use client'

import type { AgeVerifier } from './index'

function SelfDeclarationPrompt({ onVerified }: { onVerified: () => void }) {
  return null as unknown as React.ReactElement // UI built in the next task
}

export const selfDeclaration: AgeVerifier = {
  id: 'self-declaration',
  Prompt: SelfDeclarationPrompt,
}
