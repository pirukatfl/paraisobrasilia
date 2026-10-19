---
phase: 2
slug: site-aberto-completo-e-m-dia
status: approved
reviewed_at: 2026-10-19
shadcn_initialized: false
preset: none
created: 2026-10-19
extends: .planning/phases/01-funda-o-e-vitrine-de-festas/01-UI-SPEC.md
---

# Phase 2 — UI Design Contract

> Extends the approved Phase 1 design system (01-UI-SPEC.md). Everything not restated here — tokens, fonts, focus ring, age gate, party screens, motion rules — is inherited unchanged.
> Scope: navigation (header menu + footer), Quem Somos and its three sub-pages, legal pages, Contato (address, map, Como chegar, WhatsApp), Espaço gallery (photos + videos), Modelos gallery, home sections that work without parties (D-10), and the staff-facing admin labels for the new globals/collections. All copy pt-BR.

Sources: 02-CONTEXT.md D-01..D-10, 02-RESEARCH.md (patterns 1–6), 02-CONTENT.md (texts), 01-UI-SPEC.md (design system).

---

## Design System

Inherited from Phase 1 without change: Tool none (Tailwind 4 tokens in `src/app/(frontend)/globals.css`), no component library, Josefin Sans (display/headings) + Inter (body/labels), Payload admin pt + dark theme.

| Property | Phase 2 addition |
|----------|------------------|
| Icon library | still none — inline SVG icons, `aria-hidden="true"`, always beside a text label. New icons: menu (3 lines), close (×), map pin, WhatsApp glyph, phone, mail, Instagram glyph, play triangle, chevron-left/right (lightbox). 20px box, `currentColor`. |
| New client islands | `MobileMenu` (disclosure button, < 1024px only) and `Lightbox` (native `<dialog>`). No other client JS on public pages. |
| New tokens | none. No new colors, sizes or weights. |

---

## Spacing Scale

Same scale as Phase 1 (4 / 8 / 16 / 24 / 32 / 48 / 64). No new values.

| Use in Phase 2 | Token |
|----------------|-------|
| Gallery grid gap | md 16px (< 640px) / lg 24px (≥ 640px) |
| Rich-text paragraph spacing; list item gap | md 16px / sm 8px |
| Rich-text H2 margin-top / H3 margin-top | xl 32px / lg 24px |
| Contact block inner padding | md 16px mobile / lg 24px desktop |
| Home section breaks | 2xl 48px |
| Header nav item horizontal gap (desktop) | lg 24px |
| Mobile menu panel padding | md 16px; items separated by 1px `--color-line`, each min-height 44px |

Touch targets: 44 × 44px minimum (inherited), including nav items, map buttons, WhatsApp button, gallery tiles, lightbox prev/next/close.

---

## Typography

Inherited exactly: Label 14/600, Body 16/400, Heading 24/400 (Josefin uppercase), Display 36/600 (Josefin uppercase). No new size or weight.

| New element | Role |
|-------------|------|
| Nav items | Label, uppercase, letter-spacing 0.08em |
| Rich-text H2 inside pages | Heading |
| Rich-text H3 inside pages | Label (uppercase, gold is NOT used — text color `--color-text`) |
| Rich-text paragraphs, lists | Body; max line length 680px |
| Gallery caption, model name | Label (model name in `--color-text`, caption in `--color-muted`) |
| Address lines | Body; CEP in muted |
| "Atualizado em …" on legal pages | Label, muted |

---

## Color

Same 60/30/10 tokens. Accent (orange `--color-accent`) reserved list from Phase 1 is extended with exactly these items:

6. Primary buttons "Como chegar — Google Maps", "Como chegar — Waze", "Chamar no WhatsApp" (orange background, text `--color-bg`).
7. Active nav item underline (2px, accent) and nav hover/focus text color.
8. Text links inside rich text (underlined) — already covered by item 4 semantics.

Gold (`--color-gold`) keeps its single semantic role ("when / how much"): used on the hours line in the contact block ("Abrimos às 22h…"). Not used on buttons or links.

No WhatsApp green: the WhatsApp button uses the house accent (brand consistency, D-04 of Phase 1 "no neon"). Brand red stays decorative only.

Secondary button style (new, for "Ver galeria completa", "Ler mais", "Ver no mapa"): transparent background, 1px `--color-line` border, text `--color-text`, hover/focus border `--color-accent`. Not an accent use.

---

## Screens and Visual Hierarchy

### Global — Header navigation (INST-01, INST-03)
- ≥ 1024px: logo left, inline nav right: **Festas** (`/`) · **Quem somos** (`/quem-somos`) · **Espaço** (`/espaco`) · **Modelos** (`/modelos`, only when at least one model is published) · **Contato** (`/contato`). Active item: accent underline + `aria-current="page"`.
- < 1024px: logo left, button "Menu" (menu icon + visible label "Menu", 44px) right; opens a full-width panel below the header (`--color-surface`, 1px `--color-line` bottom border) listing the same items plus the Quem Somos sub-items indented (Normas, Regras, Dicas). Button has `aria-expanded`, `aria-controls`; Escape and a second tap close it; focus returns to the button. No animation beyond a 150ms opacity fade (none with reduced motion).
- Without JS the menu items are rendered in a `<details>`-free fallback: the panel is server-rendered and hidden with a `data-open` attribute; if JS fails, a `<noscript>` style shows the list inline. (Executor may implement with `<details><summary>` instead — both acceptable as long as the a11y attributes above hold.)

### Global — Footer (INST-03, INST-06)
- Three groups stacked on mobile, three columns ≥ 1024px:
  1. **Contato:** address (2 lines), "Chamar no WhatsApp" text link (accent) with WhatsApp icon, phone, e-mail (mailto), Instagram link only when handle is set.
  2. **Navegue:** Quem somos · Normas · Regras · Dicas · Espaço · Contato.
  3. **Legal:** Termos de Uso · Política de Privacidade.
- Bottom line (inherited): "© {ano} Paraíso Brasília · Proibido para menores de 18 anos".
- All footer text Label size; links muted → text color on hover; focus ring accent.

### S6 — Quem Somos `/quem-somos` and sub-pages `/quem-somos/normas|regras|dicas` (INST-01)
- Layout: single text column max 680px. Above the H1: sub-navigation tabs (horizontal list, scrolls horizontally on mobile with no visible scrollbar requirement): **Quem somos · Normas · Regras · Dicas**; current tab has accent underline + `aria-current="page"`.
- H1 (Display) = page title; intro (Body, muted) below; then rich text.
- End of each sub-page: secondary button linking to the next sub-page ("Próximo: Regras →" etc.; Dicas links to "Ver próximas festas" primary button instead).
- **Focal point:** H1 + intro.

### S7 — Legal pages `/termos-de-uso`, `/politica-de-privacidade` (INST-06)
- Same text column as S6, no sub-nav. Below the H1: "Atualizado em {dd de mês de aaaa}" (Label, muted) from the document's `updatedAt`.
- Rich text supports H2/H3, lists, links. The removal-request section of the privacy policy contains the WhatsApp and e-mail as links.

### S8 — Contato `/contato` (INST-02, INST-03)
- Mobile order: H1 "Contato e como chegar" (Display) · intro (Body, muted) · **contact block** (surface card, radius 12px): address lines, CEP (muted), hours line (gold Label, hidden if empty) · buttons stacked full width: **Como chegar — Google Maps** (primary), **Como chegar — Waze** (primary), **Chamar no WhatsApp** (primary), then phone and e-mail as text links · map.
- ≥ 1024px: two columns — contact block left (5/12), map right (7/12).
- **Map:** OpenStreetMap iframe (`title="Mapa com a localização do Paraíso Brasília"`, `loading="lazy"`, `referrerpolicy="no-referrer"`), aspect-ratio 4/3 mobile, 16/10 desktop, radius 12px, 1px `--color-line` border; below it a muted Label link "Ver mapa ampliado" (opens openstreetmap.org at the coordinates in a new tab). If lat/lng are empty the map area is replaced by the address card only (no broken iframe).
- External links open in a new tab with `rel="noopener noreferrer"` and visible text; icons are decorative.
- **Focal point:** the "Como chegar — Google Maps" button.

### S9 — Espaço `/espaco` (MIDIA-01, MIDIA-03)
- Eyebrow "Nosso espaço" (Label, muted) · H1 "Conheça o Paraíso" (Display) · intro (Body, muted).
- Grid of tiles: 2 columns < 640px, 3 columns 640–1023px, 4 columns ≥ 1024px; gap per spacing table; every tile aspect-ratio 1/1, `object-fit: cover` (focal point from Payload), radius 8px.
- Photo tile = button (opens lightbox at that index), accessible name = image alt. Video tile = button with poster image + centered play icon (48px circle, `--color-bg` at 70% opacity, white triangle) + "Vídeo" Label chip (top-left, surface background); opens the lightbox on the video slide.
- Caption (if any) below the tile, Label muted, 1-line clamp.
- **Focal point:** first tile (only the first two images use eager loading; the rest `loading="lazy"`).
- **Empty state (D-07):** surface card, max width 560px: heading "Fotos do espaço em breve" (Heading) · body "Estamos preparando novas fotos e vídeos dos ambientes. Enquanto isso, venha conhecer pessoalmente." · primary button "Como chegar" → `/contato`; secondary button "Ver próximas festas" → `/`.

### S10 — Lightbox (shared by Espaço and Modelos)
- Native `<dialog>` full viewport, background `--color-bg` at 96% opacity. Content centered: image `max-height: calc(100dvh - 128px)`, `max-width: 100%`, `object-fit: contain`; or `<video controls playsinline preload="metadata" poster>` (metadata only after the visitor opened it).
- Top bar: counter "3 de 12" (Label, muted) left; close button (× icon + sr-only "Fechar") right. Bottom/side: previous/next buttons (chevrons, sr-only labels "Anterior"/"Próxima"), hidden when single item. Caption or model name below the media (Label).
- Keyboard: Esc closes (native), ←/→ navigate; swipe left/right on touch (pointer events, threshold 48px). Focus returns to the tile that opened it. Video pauses on close/navigation.
- No-JS fallback: tiles are links to the full image file (`href` = large image URL) so content remains reachable.

### S11 — Modelos `/modelos` (MIDIA-02, D-08)
- Route and nav item exist only when ≥ 1 model is published; otherwise `/modelos` → 404 page (inherited S4) and the nav/footer omit it.
- Eyebrow "Modelos da casa" · H1 "Modelos" · intro (Body, muted).
- Grid of model cards: 2 columns < 1024px, 4 columns ≥ 1024px. Card: first photo (aspect-ratio 4/5, cover, radius 8px) as a button opening the lightbox with that model's 1–3 photos; below it the artistic name (Label, text) and, if more than one photo, "{n} fotos" (Label, muted). No profile page, no contact.

### S2' — Home `/` revised (D-10)
Order of sections (each section independent; hidden when its data is empty, except Quem Somos and Contato which always exist):
1. **Próximas festas** (Phase 1, unchanged). When empty: compact empty-state (Phase 1 copy) — no longer the whole page.
2. **Conheça o espaço** (2xl top margin): Heading "Conheça o espaço" + up to 6 photo tiles (3 columns ≥ 640px, 2 below; photos only, no videos) + secondary button "Ver galeria completa" → `/espaco`. Hidden when no published space photos.
3. **Quem somos** teaser: surface card with Heading "Quem somos", the `quem-somos` intro text (Body), secondary button "Conheça a casa" → `/quem-somos`.
4. **Como chegar** teaser: surface card with address (2 lines), hours (gold Label, if set), primary button "Como chegar" → `/contato` and text link "Chamar no WhatsApp" (accent). No map iframe on the home (performance).
- **Focal point:** with parties — the first flyer (unchanged); without parties — the H1 + first section below it. H1 on the home stays "Próximas festas" only when there are parties; without parties the H1 becomes "Paraíso Brasília" (Display) with the eyebrow "Casa de festas liberais em Brasília" and the empty state is rendered under a Heading "Próximas festas".

### Admin (Payload) — PAINEL-02, PAINEL-04
- Nav groups: **Site** (Festas, Páginas, Galeria do espaço, Modelos), **Arquivos** (Mídias, Vídeos), **Configurações** (Contato e endereço global), **Equipe** (Usuários). Groups via `admin.group`.
- Lists: Páginas → columns Título, Página (key), Status, Atualizado em. Galeria do espaço → Miniatura, Tipo, Legenda, Ordem, Status. Modelos → Nome artístico, Fotos, Autorização (date or "—"), Status.
- Labels and help texts exactly as in the Copywriting table.

---

## Copywriting Contract

All copy pt-BR. No "Submit/OK/Clique aqui".

| Element | Copy |
|---------|------|
| Nav items | Festas · Quem somos · Espaço · Modelos · Contato |
| Mobile menu button | Menu (accessible name "Abrir menu" / "Fechar menu" by state) |
| Quem Somos sub-tabs | Quem somos · Normas · Regras · Dicas |
| Sub-page next links | Próximo: Normas → · Próximo: Regras → · Próximo: Dicas → |
| Dicas end CTA | Ver próximas festas |
| Legal updated line | Atualizado em {dd de mês de aaaa} |
| Contato H1 | Contato e como chegar |
| Contato intro | Estamos no Núcleo Rural Lago Oeste, em Sobradinho. Fale com a gente pelo WhatsApp para reservas e dúvidas. |
| Map buttons | Como chegar — Google Maps · Como chegar — Waze |
| Map iframe title | Mapa com a localização do Paraíso Brasília |
| Map enlarge link | Ver mapa ampliado |
| WhatsApp CTA | Chamar no WhatsApp |
| Phone / e-mail labels | Telefone · E-mail |
| Instagram link | Instagram @{handle} (only when set) |
| Footer group titles | Contato · Navegue · Legal |
| Footer legal links | Termos de Uso · Política de Privacidade |
| Espaço eyebrow / H1 / intro | Nosso espaço / Conheça o Paraíso / Conheça os ambientes do Paraíso: pista, bar, jardim e piscina numa chácara reservada no Lago Oeste. |
| Espaço empty heading / body | Fotos do espaço em breve / Estamos preparando novas fotos e vídeos dos ambientes. Enquanto isso, venha conhecer pessoalmente. |
| Espaço empty CTAs | Como chegar · Ver próximas festas |
| Video chip / play label | Vídeo / Assistir vídeo: {título} |
| Lightbox | Fechar · Anterior · Próxima · "{n} de {total}" |
| Photo alt fallback | Foto do espaço do Paraíso Brasília |
| Modelos eyebrow / H1 / intro | Modelos da casa / Modelos / As modelos que animam as noites do Paraíso. |
| Model card count | {n} fotos |
| Model photo alt fallback | {Nome artístico} — modelo do Paraíso Brasília |
| Home (no parties) H1 | Paraíso Brasília |
| Home sections | Próximas festas · Conheça o espaço · Quem somos · Como chegar |
| Home buttons | Ver galeria completa · Conheça a casa · Como chegar |
| Page titles (`<title>` via template) | Quem somos · Normas da casa · Regras e procedimentos · Dicas para a sua visita · Termos de Uso · Política de Privacidade · Contato e como chegar · Conheça o Paraíso · Modelos |
| Meta descriptions | pages: their `intro`; Contato: "Endereço, mapa e WhatsApp do Paraíso Brasília, no Núcleo Rural Lago Oeste, Sobradinho – DF."; Espaço: the Espaço intro; Modelos: the Modelos intro |
| Error (data fetch) | inherited Phase 1 error screen |
| **Admin — global** | Contato e endereço — "Dados exibidos no rodapé, na página Contato e na página inicial." |
| Admin contact fields (label — help) | Endereço — "Rua, travessa e número (ex.: Rua 15, Travessa 01, Chácara 02)." · Complemento — "Bairro, cidade e UF." · CEP · Latitude / Longitude — "Opcional. Para acertar o pino do mapa: no Google Maps, clique com o botão direito no portão da chácara e copie os números." · WhatsApp — "Só números, com 55 e DDD (ex.: 5561999889772)." · Telefone (exibição) — "Como aparece no site (ex.: (61) 99988-9772)." · E-mail · Instagram — "Opcional. Só o nome do perfil, sem @. Se ficar vazio, o Instagram não aparece no site." · Horário — "Opcional (ex.: Abrimos às 22h e seguimos até por volta das 5h)." |
| Admin collection Páginas | Páginas (singular Página) — "Textos de Quem Somos, Normas, Regras, Dicas, Termos e Política de Privacidade. Edite e clique em Publicar." |
| Admin page fields | Página (key; options: Quem somos, Normas, Regras, Dicas, Termos de Uso, Política de Privacidade) — "Define o endereço da página. Não pode repetir." · Título · Introdução — "Uma ou duas frases (até 200 caracteres). Aparece no topo e na prévia do Google/WhatsApp." · Texto |
| Admin collection Galeria do espaço | Galeria do espaço (singular "Foto ou vídeo do espaço") — "Fotos e vídeos dos ambientes. Sem nudez explícita: esta galeria é aberta ao público." |
| Admin space fields | Tipo (Foto / Vídeo) · Foto — "JPG, PNG ou WebP até 15 MB. A foto é convertida para WebP automaticamente." · Vídeo — escolha um item de Vídeos · Legenda — "Opcional, até 80 caracteres." · Ordem — "Números menores aparecem primeiro." |
| Admin collection Vídeos | Vídeos (singular Vídeo) — "MP4 (H.264), até 100 MB e cerca de 2 minutos. Exporte em 720p para carregar rápido no celular." |
| Admin video fields | Descrição do vídeo — "Ex.: Pista de dança numa noite de festa." · Imagem de capa — "Uma foto que aparece antes de o vídeo tocar." |
| Admin collection Modelos | Modelos (singular Modelo) — "Nome artístico e até 3 fotos. Sem nudez explícita: esta galeria é aberta ao público." |
| Admin model fields | Nome artístico · Fotos — "De 1 a 3 fotos." · Ordem |
| Admin authorization group | Autorização de uso de imagem — "Recomendado, não obrigatório para publicar. Ex.: Enviou as fotos por WhatsApp para divulgação em 12/10/2026." · Data da autorização · Observação |
| Max photos error | "Cada modelo pode ter no máximo 3 fotos." |
| Image too big error | "A imagem passa de 15 MB. Reduza o tamanho e envie de novo." |
| Destructive: removal request | Payload built-in "Excluir" confirmation (pt). Runbook: for an image-removal request use **Excluir** on the Mídia/Vídeo (deletes the file), not only Despublicar. |

---

## Interaction & Accessibility Contract

Inherited plus:
- Nav landmarks: `<nav aria-label="Principal">` (header), `<nav aria-label="Quem somos">` (sub-tabs), `<nav aria-label="Rodapé">`.
- Lightbox: `aria-label="Galeria de fotos"` on the dialog; slide changes announced via a visually hidden `aria-live="polite"` counter.
- Videos: `preload="none"` in tiles (poster only); never autoplay; `playsinline`; captions not required (no speech) — video `title` used as accessible name.
- External links: visible text, `target="_blank"`, `rel="noopener noreferrer"`, sr-only "(abre em nova aba)".
- Images: alt from media; fallbacks in Copywriting.
- Motion: menu fade 150ms and lightbox fade 150ms, both disabled under `prefers-reduced-motion: reduce`.
- Performance budget (MIDIA-03): `/espaco` with 12 items ≤ 600 KB transferred before interaction on a 390px viewport; home LCP < 2.5s unchanged; client JS added ≤ 6 KB gzipped (MobileMenu + Lightbox).

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable |
| Third-party registries | none | not applicable |

Third-party runtime content: only the OpenStreetMap embed iframe on `/contato` (lazy). No other third-party scripts.

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — every new screen, empty state, CTA and admin field has pt-BR copy; no generic labels
- [x] Dimension 2 Visuals: PASS — focal point declared per screen; galleries and home sections have empty/hidden states
- [x] Dimension 3 Color: PASS — no new tokens; accent additions enumerated (map/WhatsApp buttons, active nav); WhatsApp green deliberately not used
- [x] Dimension 4 Typography: PASS — still 4 sizes / 2 weights
- [x] Dimension 5 Spacing: PASS — only Phase 1 scale values
- [x] Dimension 6 Registry Safety: PASS — no registries; one third-party iframe declared

**Approval:** approved 2026-10-19 (6-dimension gsd-ui-checker review run inline by the orchestrator — no subagent tool available in this session; no blocking issues)
