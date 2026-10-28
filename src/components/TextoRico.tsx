import { Fragment, type ReactNode } from 'react'

import { preencherRico, type TextoRico as EstadoRico } from '@/lib/textos/rico'

import { renderLink } from './richLink'

// Lexical text format bits
const NEGRITO = 1
const ITALICO = 2
const RISCADO = 4
const SUBLINHADO = 8

type No = Record<string, unknown>

const ehObjeto = (valor: unknown): valor is No => typeof valor === 'object' && valor !== null

const filhosDe = (no: No): No[] => (Array.isArray(no.children) ? no.children.filter(ehObjeto) : [])

function renderTexto(no: No, chave: number): ReactNode {
  if (typeof no.text !== 'string') return null
  const formato = typeof no.format === 'number' ? no.format : 0
  let out: ReactNode = no.text
  if (formato & NEGRITO) out = <strong>{out}</strong>
  if (formato & ITALICO) out = <em>{out}</em>
  if (formato & RISCADO) out = <s>{out}</s>
  if (formato & SUBLINHADO) out = <u>{out}</u>
  return <Fragment key={chave}>{out}</Fragment>
}

/**
 * Whitelist: paragraph, text (bold, italic, underline, strikethrough), line break, lists and links.
 * Any other node (heading, upload, relationship, block, unknown) is dropped, so stored JSON can never
 * add markup the site did not plan for. No raw HTML is ever injected.
 */
function renderNos(nos: No[], inline: boolean): ReactNode[] {
  return nos.map((no, i): ReactNode => {
    switch (no.type) {
      case 'text':
        return renderTexto(no, i)
      case 'linebreak':
        return <br key={i} />
      case 'link':
      case 'autolink': {
        const campos = ehObjeto(no.fields) ? no.fields : {}
        const url = typeof campos.url === 'string' ? campos.url : ''
        return renderLink(url, renderNos(filhosDe(no), inline), i)
      }
      case 'paragraph': {
        const filhos = renderNos(filhosDe(no), inline)
        // Inline: paragraphs are separated by a line break instead of a block
        return inline ? (
          <Fragment key={i}>
            {i > 0 && <br />}
            {filhos}
          </Fragment>
        ) : (
          <p key={i}>{filhos}</p>
        )
      }
      case 'list': {
        const itens = filhosDe(no).filter((item) => item.type === 'listitem')
        if (inline) {
          return (
            <Fragment key={i}>
              {i > 0 && <br />}
              {itens.map((item, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {renderNos(filhosDe(item), inline)}
                </Fragment>
              ))}
            </Fragment>
          )
        }
        const Lista = no.listType === 'number' ? 'ol' : 'ul'
        return (
          <Lista key={i}>
            {itens.map((item, j) => (
              <li key={j}>{renderNos(filhosDe(item), inline)}</li>
            ))}
          </Lista>
        )
      }
      default:
        return null
    }
  })
}

/**
 * Formatted site text (Textos do site). Block by default (`div` with paragraphs and lists, pass the size
 * and colour classes of the old `<p>`); `inline` renders a `span` with no block elements, for parents that
 * only accept phrasing content. `{name}` placeholders are filled from `vars` before rendering.
 */
export function TextoRico({
  valor,
  vars,
  className,
  inline = false,
  id,
  role,
}: {
  valor: EstadoRico
  vars?: Record<string, string | number>
  className?: string
  inline?: boolean
  id?: string
  role?: 'note' | 'status' | 'alert'
}) {
  const estado = vars ? preencherRico(valor, vars) : valor
  const filhos = renderNos(filhosDe(ehObjeto(estado.root) ? estado.root : {}), inline)
  const classes = inline ? className : `texto-rico ${className ?? ''}`.trim()
  return inline ? (
    <span id={id} role={role} className={classes}>
      {filhos}
    </span>
  ) : (
    <div id={id} role={role} className={classes}>
      {filhos}
    </div>
  )
}
