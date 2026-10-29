import {
  BoldFeature,
  FixedToolbarFeature,
  InlineToolbarFeature,
  ItalicFeature,
  lexicalEditor,
  LinkFeature,
  OrderedListFeature,
  ParagraphFeature,
  StrikethroughFeature,
  UnderlineFeature,
  UnorderedListFeature,
} from '@payloadcms/richtext-lexical'

/**
 * Editors of the site texts (Textos do site). No headings, images or embeds, so the layout stays under the
 * site's control. The site renders only the nodes these editors can create.
 */

/** Long copy (block): paragraphs, text marks, lists and links. Same set as Festas' "Sobre a festa". */
export const editorBloco = lexicalEditor({
  features: () => [
    ParagraphFeature(),
    BoldFeature(),
    ItalicFeature(),
    UnderlineFeature(),
    StrikethroughFeature(),
    UnorderedListFeature(),
    OrderedListFeature(),
    LinkFeature({ enabledCollections: [] }),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
  ],
})

/**
 * Titles, buttons, menu, labels and short notices (line): text marks only. No links (many sit inside an
 * `<a>`/`<button>`, a link there is invalid HTML) and no lists (they break headings and buttons).
 */
export const editorLinha = lexicalEditor({
  features: () => [
    ParagraphFeature(),
    BoldFeature(),
    ItalicFeature(),
    UnderlineFeature(),
    StrikethroughFeature(),
    FixedToolbarFeature(),
    InlineToolbarFeature(),
  ],
})
