'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { FormField } from '@/components/assinantes/FormField'
import { cadastrar, type CadastroState } from '@/lib/assinantes/actions'
import type { Textos } from '@/lib/textos/areas'

const checkbox = 'mt-1 size-5 shrink-0 accent-[var(--color-accent)]'

/**
 * /cadastro form (G-01). A plain form + server action: works without JavaScript (React returns the
 * action state on the full-page response). The honeypot `website` is hidden from people.
 */
export function SignupForm({ textos: t }: { textos: Textos<'conta'> }) {
  const [state, action, pending] = useActionState<CadastroState, FormData>(cadastrar, null)
  const errors = state?.errors ?? {}
  const values = state?.values
  return (
    <form action={action} className="mt-6 flex max-w-[440px] flex-col gap-4" noValidate={false}>
      {errors.form && (
        <p role="alert" className="rounded-lg border border-danger px-4 py-2 text-body text-text">
          {errors.form}
        </p>
      )}
      <FormField id="cad-email" name="email" type="email" label={t.campoEmail} autoComplete="email" defaultValue={values?.email} error={errors.email} />
      <FormField
        id="cad-senha"
        name="password"
        type="password"
        label={t.formSenha}
        autoComplete="new-password"
        minLength={8}
        hint={t.formSenhaDica}
        error={errors.senha}
      />
      <FormField
        id="cad-apelido"
        name="apelido"
        type="text"
        label={t.formApelido}
        autoComplete="nickname"
        maxLength={40}
        defaultValue={values?.apelido}
        hint={t.formApelidoDica}
        error={errors.apelido}
      />
      {/* Honeypot: people never see or fill it */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="cad-website">Não preencha este campo</label>
        <input id="cad-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3 text-body text-text">
          <input type="checkbox" name="maior18" value="sim" defaultChecked={values?.maior18} className={checkbox} aria-describedby={errors.maior18 ? 'cad-maior18-erro' : undefined} />
          <span>{t.formMaior18}</span>
        </label>
        {errors.maior18 && (
          <p id="cad-maior18-erro" role="alert" className="type-label text-danger">
            {errors.maior18}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3 text-body text-text">
          <input type="checkbox" name="termos" value="sim" defaultChecked={values?.termos} className={checkbox} aria-describedby={errors.termos ? 'cad-termos-erro' : undefined} />
          <span>
            {t.formTermosAntes}{' '}
            <Link href="/termos-de-uso" className="text-accent underline underline-offset-4">
              {t.formTermosLink}
            </Link>{' '}
            {t.formTermosMeio}{' '}
            <Link href="/politica-de-privacidade" className="text-accent underline underline-offset-4">
              {t.formPoliticaLink}
            </Link>
          </span>
        </label>
        {errors.termos && (
          <p id="cad-termos-erro" role="alert" className="type-label text-danger">
            {errors.termos}
          </p>
        )}
      </div>
      <button type="submit" className="btn-primary mt-2" disabled={pending}>
        {pending ? t.formEnviando : t.formBotao}
      </button>
    </form>
  )
}
