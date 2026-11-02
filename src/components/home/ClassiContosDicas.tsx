import Link from 'next/link'

import { TextoRico } from '@/components/TextoRico'
import type { ContoCardDTO } from '@/lib/contos/dto'
import type { DicaCardDTO } from '@/lib/dicas/dto'
import { estaOculto } from '@/lib/site/menu'
import { getTextos } from '@/lib/textos/queries'

type Item = { href: string; title: string; dateLabel?: string }

function Quadro({
  id,
  i,
  titulo,
  children,
  href,
  botao,
}: {
  id: string
  /** Position in the row: staggers the scroll reveal */
  i: number
  titulo: React.ReactNode
  children: React.ReactNode
  href: string
  botao: React.ReactNode
}) {
  return (
    <section aria-labelledby={id} className="reveal stagger flex flex-col rounded-xl border border-line bg-surface p-4 lg:p-6" style={{ '--i': i } as React.CSSProperties}>
      <h2 id={id} className="type-heading">
        {titulo}
      </h2>
      <div className="mt-4 flex-1">{children}</div>
      <Link href={href} className="btn-secondary press mt-6 self-start">
        {botao}
      </Link>
    </section>
  )
}

function Lista({ itens }: { itens: Item[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {itens.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="type-label font-semibold transition-colors duration-[var(--duration-fast)] hover:text-accent">
            {item.title}
          </Link>
          {item.dateLabel && <span className="type-label ml-2 text-muted">{item.dateLabel}</span>}
        </li>
      ))}
    </ul>
  )
}

/**
 * Home row of three frames: ClassiSex (most important, first), Contos and Dicas Hot. Stacked on the phone,
 * side by side from the desktop up. A frame disappears when staff hid its menu item or, for the two
 * lists, when nothing is published.
 */
export async function ClassiContosDicas({
  contos,
  dicas,
  ocultos,
}: {
  contos: ContoCardDTO[]
  dicas: DicaCardDTO[]
  ocultos: readonly string[]
}) {
  const mostraClassisex = !estaOculto('classisex', ocultos)
  const mostraContos = !estaOculto('contos', ocultos) && contos.length > 0
  const mostraDicas = !estaOculto('dicas-hot', ocultos) && dicas.length > 0
  if (!mostraClassisex && !mostraContos && !mostraDicas) return null
  const t = await getTextos('inicio')
  const quantos = [mostraClassisex, mostraContos, mostraDicas].filter(Boolean).length
  const colunas = quantos === 3 ? 'lg:grid-cols-3' : quantos === 2 ? 'lg:grid-cols-2' : ''
  return (
    <div className={`mt-12 grid gap-4 lg:gap-6 ${colunas}`} data-home-quadros>
      {mostraClassisex && (
        <Quadro
          id="titulo-classisex-home"
          i={0}
          titulo={<TextoRico valor={t.classisexTitulo} linha />}
          href="/classisex"
          botao={<TextoRico valor={t.classisexBotao} linha />}
        >
          <TextoRico valor={t.classisexTexto} className="text-body" />
        </Quadro>
      )}
      {mostraContos && (
        <Quadro
          id="titulo-contos-home"
          i={1}
          titulo={<TextoRico valor={t.contosTitulo} linha />}
          href="/contos"
          botao={<TextoRico valor={t.contosBotao} linha />}
        >
          <Lista
            itens={contos.slice(0, 3).map((c) => ({ href: `/contos/${c.slug}`, title: c.title, dateLabel: c.dateLabel }))}
          />
        </Quadro>
      )}
      {mostraDicas && (
        <Quadro
          id="titulo-dicas-home"
          i={2}
          titulo={<TextoRico valor={t.dicasTitulo} linha />}
          href="/dicas-hot"
          botao={<TextoRico valor={t.dicasBotao} linha />}
        >
          <Lista
            itens={dicas.slice(0, 3).map((d) => ({ href: `/dicas-hot/${d.slug}`, title: d.title, dateLabel: d.dateLabel }))}
          />
        </Quadro>
      )}
    </div>
  )
}
