import type { SerializedAutoLinkNode, SerializedLinkNode } from '@payloadcms/richtext-lexical'
import {
  type JSXConverter,
  type JSXConvertersFunction,
  RichText as LexicalRichText,
} from '@payloadcms/richtext-lexical/react'

import type { RichTextState } from '@/lib/parties/types'

import { renderLink } from './richLink'

const renderLinkNode: JSXConverter<SerializedLinkNode | SerializedAutoLinkNode> = ({ node, nodesToJSX }) =>
  renderLink(node.fields?.url ?? '', nodesToJSX({ nodes: node.children }))

const converters: JSXConvertersFunction = ({ defaultConverters }) => ({
  ...defaultConverters,
  link: renderLinkNode as JSXConverter<SerializedLinkNode>,
  autolink: renderLinkNode as JSXConverter<SerializedAutoLinkNode>,
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
