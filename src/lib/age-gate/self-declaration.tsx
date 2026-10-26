'use client'

import type { AgeGateTextos, AgeVerifier } from './index'

/** Click-through 18+ confirmation (no sign-up, no form). Copy from UI-SPEC S1. */
function SelfDeclarationPrompt({ onVerified, textos }: { onVerified: () => void; textos: AgeGateTextos }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="age-gate-titulo"
      aria-describedby="age-gate-texto"
      className="w-full max-w-[440px] card-glow rounded-xl border border-gold/20 bg-surface px-6 py-8 text-center lg:px-12 lg:py-16"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, no optimizer needed */}
      <img
        src="/brand/logo-320.webp"
        alt="Paraíso Brasília"
        width={160}
        height={135}
        // Lazy: returning visitors have the gate hidden (display:none), so the logo is never fetched
        loading="lazy"
        className="mx-auto h-auto w-40 mix-blend-lighten"
      />
      <h2 id="age-gate-titulo" className="type-heading mt-6">
        {textos.titulo}
      </h2>
      <p id="age-gate-texto" className="mt-4 text-body text-muted">
        {textos.texto}
      </p>
      <button type="button" data-age-primary onClick={onVerified} className="btn-primary mt-8 w-full">
        {textos.botaoEntrar}
      </button>
      <button
        type="button"
        onClick={() => window.location.assign('https://www.google.com')}
        className="type-label mt-4 inline-flex min-h-11 min-w-11 items-center justify-center px-6 text-muted underline-offset-4 hover:underline"
      >
        {textos.botaoSair}
      </button>
    </div>
  )
}

export const selfDeclaration: AgeVerifier = {
  id: 'self-declaration',
  Prompt: SelfDeclarationPrompt,
}
