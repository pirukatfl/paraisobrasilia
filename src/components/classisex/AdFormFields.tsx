import type { AdFormValues } from '@/lib/classisex/actions'
import type { Textos } from '@/lib/textos/areas'

export const inputClass =
  'min-h-11 rounded-lg border border-line bg-surface px-4 text-body text-text focus:border-accent'

/** Visual marker of the few required fields (client 2026-10-23) */
export function Required({ texto }: { texto: string }) {
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
          {t.apelidoRotulo} <Required texto={t.campoObrigatorio} />
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
          {t.apelidoAjuda}
        </p>
        <FieldError id="erro-apelido" message={errors.apelido} />
      </div>

      <fieldset className="flex flex-col gap-2" aria-describedby={described('euSou')}>
        <legend className="type-label text-text">
          {t.euSouRotulo} <Required texto={t.campoObrigatorio} />
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
          {t.cidadeRotulo}
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
          {t.textoRotulo} <Required texto={t.campoObrigatorio} />
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
        <p id="ajuda-texto" className="type-label text-muted">
          {legacy ? t.textoAjudaAntigo : t.textoAjuda}
        </p>
        <FieldError id="erro-texto" message={errors.texto} />
      </div>

      <fieldset className="flex flex-col gap-4" aria-describedby={described('contato')}>
        <legend className="type-label text-text">{t.contatoLegenda}</legend>
        <FieldError id="erro-contato" message={errors.contato} />
        <div className="flex flex-col gap-2">
          <label htmlFor="whatsapp" className="type-label text-text">
            {t.whatsappRotulo}
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
            {t.telegramRotulo}
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
            {t.declaracao} <Required texto={t.campoObrigatorio} />
          </span>
        </label>
        <FieldError id="erro-consent" message={errors.consent} />
      </div>
    </>
  )
}
