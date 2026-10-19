import type { SerializedAutoLinkNode, SerializedLinkNode } from '@payloadcms/richtext-lexical'
import {
  type JSXConverter,
  type JSXConvertersFunction,
  RichText as LexicalRichText,
} from '@payloadcms/richtext-lexical/react'

import type { RichTextState } from '@/lib/parties/types'

// T-02-04b: only http(s), mailto, tel and site-relative links become anchors; anything else renders as text.
const SAFE_HREF = /^(https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i

const renderLink: JSXConverter<SerializedLinkNode | SerializedAutoLinkNode> = ({ node, nodesToJSX }) => {
  const children = nodesToJSX({ nodes: node.children })
  const url = node.fields?.url ?? ''
  if (!SAFE_HREF.test(url)) return <span>{children}</span>
  if (/^https?:\/\//i.test(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        {children}
        <span className="sr-only"> (abre em nova aba)</span>
      </a>
    )
  }
  return <a href={url}>{children}</a>
}

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  link: renderLink as JSXConverter<SerializedLinkNode>,
  autolink: renderLink as JSXConverter<SerializedAutoLinkNode>,
})

/** Institutional page text (UI-SPEC Phase 2 typography via the `.rich-text` class in globals.css). */
export function RichText({ data, className = '' }: { data: RichTextState; className?: string }) {
  return (
    <LexicalRichText
      data={data}
      converters={converters}
      disableContainer
      className={`rich-text ${className}`.trim()}
    />
  )
}
