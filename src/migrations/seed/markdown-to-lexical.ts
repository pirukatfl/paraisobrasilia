import { convertMarkdownToLexical, editorConfigFactory } from '@payloadcms/richtext-lexical'
import type { Payload, PayloadRequest, SanitizedConfig } from 'payload'

import { PAGES_SEED } from './pages-content'

type LexicalState = ReturnType<typeof convertMarkdownToLexical>

/**
 * Markdown (headings, paragraphs, lists, bold, italic, links) → Lexical editor state,
 * with Payload's own converter and the default editor features.
 */
export async function markdownToLexical(markdown: string, config: SanitizedConfig): Promise<LexicalState> {
  const editorConfig = await editorConfigFactory.default({ config })
  return convertMarkdownToLexical({ editorConfig, markdown: markdown.trim() })
}

/**
 * Creates each institutional page as published ONLY when no page with that key exists
 * (T-02-04c: re-running on every deploy never overwrites staff edits). Returns the keys created.
 */
export async function seedPages(payload: Payload, req?: Partial<PayloadRequest>): Promise<string[]> {
  const created: string[] = []
  for (const page of PAGES_SEED) {
    const existing = await payload.find({
      collection: 'pages',
      where: { key: { equals: page.key } },
      draft: true,
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    if (existing.totalDocs > 0) continue
    await payload.create({
      collection: 'pages',
      data: {
        key: page.key,
        title: page.title,
        intro: page.intro,
        body: (await markdownToLexical(page.markdown, payload.config)) as never,
        _status: 'published',
      },
      overrideAccess: true,
      req,
    })
    created.push(page.key)
  }
  return created
}
