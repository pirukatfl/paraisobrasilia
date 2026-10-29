import Link from 'next/link'

import { ExternalLink } from '@/components/ExternalLink'
import { WhatsAppIcon } from '@/components/icons'
import { pathForKey } from '@/lib/pages/keys'
import { type ContactDTO, instagramUrl, telUrl, whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

const linkClass = 'type-label inline-flex min-h-11 items-center text-muted hover:text-text'

async function loadContact(): Promise<ContactDTO | null> {
  try {
    return await getContact()
  } catch {
    // No database (e.g. build-time prerender of the 404 page): footer without contacts
    return null
  }
}

type FooterLink = { href: string; label: React.ReactNode }

function Group({ id, title, children }: { id: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="type-eyebrow text-text">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  )
}

function LinkList({ links }: { links: FooterLink[] }) {
  return (
    <ul>
      {links.map((l) => (
        <li key={l.href}>
          <Link href={l.href} className={linkClass}>
            {l.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Site footer (UI-SPEC Global — Footer): Contato · Navegue · Legal + the 18+ line. */
export async function Footer() {
  const year = new Date().getFullYear()
  const contact = await loadContact()
  const t = await getTextos('geral')
  const instagram = instagramUrl(contact?.instagram)
  const navigate: FooterLink[] = [
    { href: '/', label: <TextoRico valor={t.menuFestas} linha /> },
    { href: pathForKey('quem-somos'), label: <TextoRico valor={t.menuQuemSomos} linha /> },
    { href: pathForKey('normas'), label: <TextoRico valor={t.menuNormas} linha /> },
    { href: pathForKey('regras'), label: <TextoRico valor={t.menuRegras} linha /> },
    { href: pathForKey('dicas'), label: <TextoRico valor={t.menuDicas} linha /> },
    { href: '/espaco', label: <TextoRico valor={t.menuEspaco} linha /> },
    { href: '/modelos', label: <TextoRico valor={t.menuModelos} linha /> },
    { href: '/classisex', label: <TextoRico valor={t.menuClassisex} linha /> },
    { href: '/contos', label: <TextoRico valor={t.menuContos} linha /> },
    { href: '/dicas-hot', label: <TextoRico valor={t.menuDicasHot} linha /> },
    { href: '/contato', label: <TextoRico valor={t.menuContato} linha /> },
    { href: '/assine-ja', label: <TextoRico valor={t.menuAssineJa} linha /> },
    { href: '/area-do-assinante', label: <TextoRico valor={t.menuAreaAssinante} linha /> },
  ]
  const legal: FooterLink[] = [
    { href: pathForKey('termos'), label: <TextoRico valor={t.rodapeTermos} linha /> },
    { href: pathForKey('privacidade'), label: <TextoRico valor={t.rodapePrivacidade} linha /> },
  ]

  return (
    <footer className="mt-16 border-t border-line bg-bg">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-4 pt-8 lg:grid-cols-3 lg:px-8">
        {contact && (
          <Group id="rodape-contato" title={<TextoRico valor={t.rodapeContatoTitulo} linha />}>
            <address className="type-label not-italic text-muted">
              <span className="block">{contact.addressLine}</span>
              <span className="block">{contact.addressDetail}</span>
            </address>
            <ul className="mt-2">
              <li>
                <ExternalLink
                  href={whatsappUrl(contact.whatsapp)}
                  className="type-label inline-flex min-h-11 items-center gap-2 text-accent underline-offset-4 hover:underline"
                >
                  <WhatsAppIcon />
                  <TextoRico valor={t.rodapeWhatsapp} linha />
                </ExternalLink>
              </li>
              {contact.phone && (
                <li>
                  <a href={telUrl(contact.whatsapp)} className={linkClass}>
                    <span className="sr-only">Telefone: </span>
                    {contact.phone}
                  </a>
                </li>
              )}
              {contact.email && (
                <li>
                  <a href={`mailto:${contact.email}`} className={linkClass}>
                    <span className="sr-only">E-mail: </span>
                    {contact.email}
                  </a>
                </li>
              )}
              {instagram && (
                <li>
                  <ExternalLink href={instagram} className={linkClass}>
                    <TextoRico valor={t.rodapeInstagram} vars={{ usuario: contact.instagram ?? '' }} linha />
                  </ExternalLink>
                </li>
              )}
            </ul>
          </Group>
        )}
        <nav aria-label="Rodapé" className="contents">
          <Group id="rodape-navegue" title={<TextoRico valor={t.rodapeNavegueTitulo} linha />}>
            <LinkList links={navigate} />
          </Group>
          <Group id="rodape-legal" title={<TextoRico valor={t.rodapeLegalTitulo} linha />}>
            <LinkList links={legal} />
          </Group>
        </nav>
      </div>
      <p className="type-label mx-auto max-w-[1200px] px-4 py-8 text-muted lg:px-8">
        <TextoRico valor={t.rodapeCopyright} vars={{ ano: year }} linha />
      </p>
    </footer>
  )
}
