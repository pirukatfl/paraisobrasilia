import { ExternalLink } from '@/components/ExternalLink'
import type { MemberAdDTO } from '@/lib/classisex/dto'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

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
            <TextoRico valor={t.contatoWhatsapp} linha />
          </ExternalLink>
        )}
        {contato.telegram && (
          <ExternalLink href={contato.telegram.href} className="btn-secondary">
            <TextoRico valor={t.contatoTelegram} vars={{ contato: contato.telegram.label }} linha />
          </ExternalLink>
        )}
        {contato.email && (
          <a href={contato.email.href} className="btn-secondary">
            <TextoRico valor={t.contatoEmail} linha />: {contato.email.label}
          </a>
        )}
      </div>
      {contato.links.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="type-label text-muted"><TextoRico valor={t.contatoLinksTitulo} linha /></p>
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
          <TextoRico valor={t.contatoObservacao} linha />: {contato.observacao}
        </p>
      )}
    </div>
  )
}
