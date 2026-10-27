import { ExternalLink } from '@/components/ExternalLink'
import type { MemberAdDTO } from '@/lib/classisex/dto'
import { preencher } from '@/lib/textos/mesclar'
import { getTextos } from '@/lib/textos/queries'

/** Links typed by the advertiser: search engines must not follow them (user-generated content). */
const AD_LINK_REL = 'noopener noreferrer nofollow ugc'

/** Contact buttons of a full ad (members only, D-05). Only the filled contacts appear. */
export async function ContactLinks({ contato }: { contato: MemberAdDTO['contato'] }) {
  const t = await getTextos('classisex')
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {contato.whatsapp && (
          <ExternalLink href={contato.whatsapp.href} className="btn-primary">
            {t.contatoWhatsapp}
          </ExternalLink>
        )}
        {contato.telegram && (
          <ExternalLink href={contato.telegram.href} className="btn-secondary">
            {preencher(t.contatoTelegram, { contato: contato.telegram.label })}
          </ExternalLink>
        )}
        {contato.email && (
          <a href={contato.email.href} className="btn-secondary">
            {t.contatoEmail}: {contato.email.label}
          </a>
        )}
      </div>
      {contato.links.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="type-label text-muted">{t.contatoLinksTitulo}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {contato.links.map((link) => (
              <ExternalLink key={link.href} href={link.href} rel={AD_LINK_REL} className="btn-secondary">
                {link.label}
              </ExternalLink>
            ))}
          </div>
        </div>
      )}
      {contato.observacao && (
        <p className="type-label text-muted">
          {t.contatoObservacao}: {contato.observacao}
        </p>
      )}
    </div>
  )
}
