import type { Metadata } from 'next'

import { FormField } from '@/components/assinantes/FormField'
import { trocarSenha } from '@/lib/assinantes/actions'
import { requireAssinante } from '@/lib/assinantes/session'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('areaAssinante')
  return { title: textoPuro(t.senhaGoogleTitulo), robots: { index: false, follow: false } }
}

const ERRORS: Record<string, string> = {
  atual: 'Senha atual incorreta.',
  curta: 'A nova senha precisa ter pelo menos 8 caracteres.',
  diferente: 'As senhas não conferem.',
  inesperado: 'Não foi possível trocar a senha por um erro inesperado no servidor. Tente de novo; se continuar, avise a equipe.',
  bloqueado: 'Muitas tentativas. Aguarde 10 minutos ou fale com a equipe pelo WhatsApp.',
}

export default async function TrocarSenhaPage({ searchParams }: { searchParams: Promise<{ erro?: string | string[] }> }) {
  await requireAssinante('/area-do-assinante/senha')
  const [{ erro }, t] = await Promise.all([searchParams, getTextos('areaAssinante')])
  const message = typeof erro === 'string' ? ERRORS[erro] : undefined
  return (
    <section aria-labelledby="titulo-senha" className="max-w-[440px]">
      <p className="type-eyebrow text-muted"><TextoRico valor={t.etiqueta} linha /></p>
      <h1 id="titulo-senha" className="type-display mt-2">
        <TextoRico valor={t.senhaTitulo} linha />
      </h1>
      {message && (
        <p role="alert" className="mt-6 rounded-lg border border-danger px-4 py-2 text-body text-text">
          {message}
        </p>
      )}
      {/* Server action, no client JS; lengths are checked on the server */}
      <form action={trocarSenha} className="mt-6 flex flex-col gap-4">
        <FormField id="atual" name="atual" type="password" label={<TextoRico valor={t.senhaCampoAtual} linha />} autoComplete="current-password" />
        <FormField id="nova" name="nova" type="password" label={<TextoRico valor={t.senhaCampoNova} linha />} autoComplete="new-password" />
        <FormField
          id="confirmacao"
          name="confirmacao"
          type="password"
          label={<TextoRico valor={t.senhaCampoRepita} linha />}
          autoComplete="new-password"
        />
        <p className="type-label text-muted"><TextoRico valor={t.senhaDica} linha /></p>
        <button type="submit" className="btn-primary mt-2">
          <TextoRico valor={t.senhaBotao} linha />
        </button>
      </form>
    </section>
  )
}
