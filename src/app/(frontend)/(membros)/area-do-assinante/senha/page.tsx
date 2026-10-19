import type { Metadata } from 'next'

import { FormField } from '@/components/assinantes/FormField'
import { trocarSenha } from '@/lib/assinantes/actions'
import { requireAssinante } from '@/lib/assinantes/session'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Trocar senha',
  robots: { index: false, follow: false },
}

const ERRORS: Record<string, string> = {
  atual: 'Senha atual incorreta.',
  curta: 'A nova senha precisa ter pelo menos 8 caracteres.',
  diferente: 'As senhas não conferem.',
  bloqueado: 'Muitas tentativas. Aguarde 10 minutos ou fale com a equipe pelo WhatsApp.',
}

export default async function TrocarSenhaPage({ searchParams }: { searchParams: Promise<{ erro?: string | string[] }> }) {
  await requireAssinante('/area-do-assinante/senha')
  const { erro } = await searchParams
  const message = typeof erro === 'string' ? ERRORS[erro] : undefined
  return (
    <section aria-labelledby="titulo-senha" className="max-w-[440px]">
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-senha" className="type-display mt-2">
        Trocar senha
      </h1>
      {message && (
        <p role="alert" className="mt-6 rounded-lg border border-danger px-4 py-2 text-body text-text">
          {message}
        </p>
      )}
      {/* Server action, no client JS; lengths are checked on the server */}
      <form action={trocarSenha} className="mt-6 flex flex-col gap-4">
        <FormField id="atual" name="atual" type="password" label="Senha atual" autoComplete="current-password" />
        <FormField id="nova" name="nova" type="password" label="Nova senha" autoComplete="new-password" />
        <FormField
          id="confirmacao"
          name="confirmacao"
          type="password"
          label="Repita a nova senha"
          autoComplete="new-password"
        />
        <p className="type-label text-muted">Use pelo menos 8 caracteres.</p>
        <button type="submit" className="btn-primary mt-2">
          Salvar nova senha
        </button>
      </form>
    </section>
  )
}
