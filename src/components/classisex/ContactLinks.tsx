import { ExternalLink } from '@/components/ExternalLink'
import type { MemberAdDTO } from '@/lib/classisex/dto'
import { preencher } from '@/lib/textos/mesclar'
import { getTextos } from '@/lib/textos/queries'

/** Contact buttons of a full ad (members only, D-05). Only the filled contacts appear. */
export async function ContactLinks({ contato }: { contato: MemberAdDTO['contato'] }) {
  const t = await getTextos('classisex')
  return (
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
    </div>
  )
}
