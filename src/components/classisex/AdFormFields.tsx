import type { ReactNode } from 'react'

import type { AdFormValues } from '@/lib/classisex/actions'
import type { Textos } from '@/lib/textos/areas'
import { TextoRico } from '@/components/TextoRico'

export const inputClass =
  'min-h-11 rounded-lg border border-line bg-surface px-4 text-body text-text focus:border-accent'

/** Visual marker of the few required fields (client 2026-10-23) */
export function Required({ texto }: { texto: ReactNode }) {
  return <span className="text-accent">{texto}</span>
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="type-label text-danger">
      {message}
    </p>
  )
}

/** One of the link inputs (all share `name="links"`; the server reads them with getAll). */
function LinkInput({ index, value, describedBy }: { index: number; value?: string; describedBy: (string | undefined)[] }) {
  return (
    <input
      id={`links-${index}`}
      name="links"
      type="url"
      inputMode="url"
      maxLength={300}
      autoComplete="off"
      placeholder="https://instagram.com/seuperfil"
      defaultValue={value ?? ''}
      aria-label={`Link ${index + 1}`}
      aria-describedby={describedBy.filter(Boolean).join(' ')}
      className={inputClass}
    />
  )
}

/**
 * The ad fields themselves (apelido, Eu sou, cidade, texto, contato, declaração), shared by the
 * subscriber form (AdForm) and the open form for people without an account (VisitorAdForm) so the two
 * never drift apart. Same ids, names and aria as before the extraction.
 */
export function AdFormFields({
  textos: t,
  categories,
  values,
  errors,
  legacy = false,
}: {
  /** Texts of the Meus anúncios area (the visitor form shares these fields) */
  textos: Textos<'meusAnuncios'>
  categories: { id: number; name: string }[]
  values: AdFormValues
  errors: Record<string, string>
  /** Old-site ad (2026-10-22): no 600-character cap, contact fields optional */
  legacy?: boolean
}) {
  const described = (key: string) => (errors[key] ? `erro-${key}` : undefined)
  return (
    <>
      <div className="flex flex-col gap-2">
        <label htmlFor="apelido" className="type-label text-text">
          <TextoRico valor={t.apelidoRotulo} linha /> <Required texto={<TextoRico valor={t.campoObrigatorio} linha />} />
        </label>
        <input
          id="apelido"
          name="apelido"
          type="text"
          maxLength={40}
          autoComplete="off"
          defaultValue={values.apelido}
          aria-describedby={['ajuda-apelido', described('apelido')].filter(Boolean).join(' ')}
          className={inputClass}
        />
        <p id="ajuda-apelido" className="type-label text-muted">
          <TextoRico valor={t.apelidoAjuda} linha />
        </p>
        <FieldError id="erro-apelido" message={errors.apelido} />
      </div>

      <fieldset className="flex flex-col gap-2" aria-describedby={described('euSou')}>
        <legend className="type-label text-text">
          <TextoRico valor={t.euSouRotulo} linha /> <Required texto={<TextoRico valor={t.campoObrigatorio} linha />} />
        </legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {categories.map((c) => (
            <label key={c.id} className="inline-flex min-h-11 items-center gap-2 text-body">
              <input
                type="radio"
                name="euSou"
                value={c.id}
                defaultChecked={values.euSou === String(c.id)}
                className="size-5 accent-accent"
              />
              {c.name}
            </label>
          ))}
        </div>
        <FieldError id="erro-euSou" message={errors.euSou} />
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="cidade" className="type-label text-text">
          <TextoRico valor={t.cidadeRotulo} linha />
        </label>
        <input
          id="cidade"
          name="cidade"
          type="text"
          maxLength={60}
          autoComplete="address-level2"
          defaultValue={values.cidade}
          aria-describedby={described('cidade')}
          className={inputClass}
        />
        <FieldError id="erro-cidade" message={errors.cidade} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="texto" className="type-label text-text">
          <TextoRico valor={t.textoRotulo} linha /> <Required texto={<TextoRico valor={t.campoObrigatorio} linha />} />
        </label>
        <textarea
          id="texto"
          name="texto"
          rows={6}
          maxLength={legacy ? 5000 : 600}
          defaultValue={values.texto}
          aria-describedby={['ajuda-texto', described('texto')].filter(Boolean).join(' ')}
          className="rounded-lg border border-line bg-surface px-4 py-3 text-body text-text focus:border-accent"
        />
        <TextoRico id="ajuda-texto" valor={legacy ? t.textoAjudaAntigo : t.textoAjuda} className="type-label text-muted" />
        <FieldError id="erro-texto" message={errors.texto} />
      </div>

      <fieldset className="flex flex-col gap-4" aria-describedby={described('contato')}>
        <legend className="type-label text-text"><TextoRico valor={t.contatoLegenda} linha /></legend>
        <FieldError id="erro-contato" message={errors.contato} />
        <div className="flex flex-col gap-2">
          <label htmlFor="whatsapp" className="type-label text-text">
            <TextoRico valor={t.whatsappRotulo} linha />
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="5561999998888"
            defaultValue={values.whatsapp}
            aria-describedby={described('whatsapp')}
            className={inputClass}
          />
          <FieldError id="erro-whatsapp" message={errors.whatsapp} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="telegram" className="type-label text-text">
            <TextoRico valor={t.telegramRotulo} linha />
          </label>
          <input
            id="telegram"
            name="telegram"
            type="text"
            autoComplete="off"
            placeholder="@seuusuario"
            defaultValue={values.telegram}
            aria-describedby={described('telegram')}
            className={inputClass}
          />
          <FieldError id="erro-telegram" message={errors.telegram} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="emailContato" className="type-label text-text">
            <TextoRico valor={t.emailContatoRotulo} linha />
          </label>
          <input
            id="emailContato"
            name="emailContato"
            type="email"
            maxLength={254}
            autoComplete="email"
            placeholder="nome@exemplo.com"
            defaultValue={values.emailContato}
            aria-describedby={described('emailContato')}
            className={inputClass}
          />
          <FieldError id="erro-emailContato" message={errors.emailContato} />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="links-0" className="type-label text-text">
            <TextoRico valor={t.linksRotulo} linha />
          </label>
          <p id="ajuda-links" className="type-label text-muted">
            <TextoRico valor={t.linksAjuda} linha />
          </p>
          <FieldError id="erro-links" message={errors.links} />
          {[0, 1, 2].map((i) => (
            <LinkInput key={i} index={i} value={values.links[i]} describedBy={['ajuda-links', described('links')]} />
          ))}
          <details open={Boolean(values.links[3] || values.links[4])} className="flex flex-col gap-2">
            <summary className="type-label cursor-pointer text-accent"><TextoRico valor={t.linksMais} linha /></summary>
            <div className="mt-2 flex flex-col gap-2">
              {[3, 4].map((i) => (
                <LinkInput key={i} index={i} value={values.links[i]} describedBy={['ajuda-links', described('links')]} />
              ))}
            </div>
          </details>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="observacao" className="type-label text-text">
            <TextoRico valor={t.observacaoRotulo} linha />
          </label>
          <input
            id="observacao"
            name="observacao"
            type="text"
            maxLength={120}
            autoComplete="off"
            defaultValue={values.observacao}
            aria-describedby={['ajuda-observacao', described('observacao')].filter(Boolean).join(' ')}
            className={inputClass}
          />
          <p id="ajuda-observacao" className="type-label text-muted">
            <TextoRico valor={t.observacaoAjuda} linha />
          </p>
          <FieldError id="erro-observacao" message={errors.observacao} />
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-3 text-body">
          <input
            type="checkbox"
            name="consent"
            value="sim"
            aria-describedby={described('consent')}
            className="mt-1 size-5 shrink-0 accent-accent"
          />
          <span>
            <TextoRico valor={t.declaracao} linha /> <Required texto={<TextoRico valor={t.campoObrigatorio} linha />} />
          </span>
        </label>
        <FieldError id="erro-consent" message={errors.consent} />
      </div>
    </>
  )
}
