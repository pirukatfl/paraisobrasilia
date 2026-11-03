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

/**
 * Institutional page text (UI-SPEC Phase 2 typography via the `.rich-text` class in globals.css).
 * The container must stay on: without it the class is dropped and Tailwind's preflight flattens
 * headings, lists and bold, so the admin formatting never shows on the site.
 */
export function RichText({ data, className = '' }: { data: RichTextState; className?: string }) {
  return (
    <LexicalRichText
      data={data}
      converters={converters}
      className={`rich-text ${className}`.trim()}
    />
  )
}
