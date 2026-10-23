import type { AdFormValues } from '@/lib/classisex/actions'

export const DECLARACAO =
  'Declaro que tenho 18 anos ou mais, que as informações são verdadeiras e que todas as pessoas das fotos e do vídeo são maiores de idade e autorizaram a publicação.'

export const inputClass =
  'min-h-11 rounded-lg border border-line bg-surface px-4 text-body text-text focus:border-accent'

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
  categories,
  values,
  errors,
  legacy = false,
}: {
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
          Apelido
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
          Aparece para todo mundo. Até 40 caracteres, sem telefone, e-mail, @ ou link.
        </p>
        <FieldError id="erro-apelido" message={errors.apelido} />
      </div>

      <fieldset className="flex flex-col gap-2" aria-describedby={described('euSou')}>
        <legend className="type-label text-text">Eu sou</legend>
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
          Cidade (opcional, só assinantes veem)
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
          Texto do anúncio
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
          {legacy
            ? 'Anúncio do site antigo: sem limite de 600 caracteres. Se quiser, coloque o contato nos campos abaixo: só assinantes veem.'
            : 'Até 600 caracteres. Coloque o contato nos campos abaixo: só assinantes veem.'}
        </p>
        <FieldError id="erro-texto" message={errors.texto} />
      </div>

      <fieldset className="flex flex-col gap-4" aria-describedby={described('contato')}>
        <legend className="type-label text-text">Contato (WhatsApp ou Telegram{legacy ? ', opcional' : ', pelo menos um'}; só assinantes veem)</legend>
        <FieldError id="erro-contato" message={errors.contato} />
        <div className="flex flex-col gap-2">
          <label htmlFor="whatsapp" className="type-label text-text">
            WhatsApp
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
            Telegram
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
          {DECLARACAO}
        </label>
        <FieldError id="erro-consent" message={errors.consent} />
      </div>
    </>
  )
}
