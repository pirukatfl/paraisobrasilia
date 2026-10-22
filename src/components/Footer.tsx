import Link from 'next/link'

import { ExternalLink } from '@/components/ExternalLink'
import { WhatsAppIcon } from '@/components/icons'
import { hasPublishedModels } from '@/lib/gallery/queries'
import { pathForKey } from '@/lib/pages/keys'
import { type ContactDTO, instagramUrl, telUrl, whatsappUrl } from '@/lib/site/contact'
import { getContact } from '@/lib/site/queries'

const linkClass = 'type-label inline-flex min-h-11 items-center text-muted hover:text-text'

async function modelsVisible(): Promise<boolean> {
  try {
    return await hasPublishedModels()
  } catch {
    return false
  }
}

async function loadContact(): Promise<ContactDTO | null> {
  try {
    return await getContact()
  } catch {
    // No database (e.g. build-time prerender of the 404 page): footer without contacts
    return null
  }
}

type FooterLink = { href: string; label: string }

function Group({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
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
  const [contact, hasModels] = await Promise.all([loadContact(), modelsVisible()])
  const instagram = instagramUrl(contact?.instagram)
  const navigate: FooterLink[] = [
    { href: '/', label: 'Festas' },
    { href: pathForKey('quem-somos'), label: 'Quem somos' },
    { href: pathForKey('normas'), label: 'Normas' },
    { href: pathForKey('regras'), label: 'Regras' },
    { href: pathForKey('dicas'), label: 'Dicas' },
    { href: '/espaco', label: 'Espaço' },
    ...(hasModels ? [{ href: '/modelos', label: 'Modelos' }] : []),
    { href: '/classisex', label: 'ClassiSex' },
    { href: '/contos', label: 'Contos' },
    { href: '/dicas-hot', label: 'Dicas Hot' },
    { href: '/contato', label: 'Contato' },
    { href: '/assine-ja', label: 'Assine Já' },
    { href: '/area-do-assinante', label: 'Área do assinante' },
  ]
  const legal: FooterLink[] = [
    { href: pathForKey('termos'), label: 'Termos de Uso' },
    { href: pathForKey('privacidade'), label: 'Política de Privacidade' },
  ]

  return (
    <footer className="mt-16 border-t border-line bg-bg">
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-8 px-4 pt-8 lg:grid-cols-3 lg:px-8">
        {contact && (
          <Group id="rodape-contato" title="Contato">
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
                  Chamar no WhatsApp
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
                    Instagram @{contact.instagram}
                  </ExternalLink>
                </li>
              )}
            </ul>
          </Group>
        )}
        <nav aria-label="Rodapé" className="contents">
          <Group id="rodape-navegue" title="Navegue">
            <LinkList links={navigate} />
          </Group>
          <Group id="rodape-legal" title="Legal">
            <LinkList links={legal} />
          </Group>
        </nav>
      </div>
      <p className="type-label mx-auto max-w-[1200px] px-4 py-8 text-muted lg:px-8">
        © {year} Paraíso Brasília · Proibido para menores de 18 anos
      </p>
    </footer>
  )
}
