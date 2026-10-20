---
type: quick
slug: aviso-novo-cadastro
date: 2026-10-20
priority: client request
autonomous: true
depends_on: [conta-gratuita]
---

# Aviso de novo cadastro para a equipe

**Goal:** staff receive an e-mail on every public self sign-up (/cadastro).

## Tasks

1. Field `avisoNovoCadastroEmail` in the `contact` global ("E-mail que recebe aviso de novo cadastro"), field access staff-only because the global is public-read; migration `aviso_novo_cadastro` (one nullable column).
2. `src/lib/email/new-signup-notice.ts`: builds the Portuguese notice (apelido, e-mail, date/time America/Sao_Paulo, tier gratuito, /admin link; no password or token) and sends it; recipient = setting, else the from-address; does nothing when e-mail is not configured; never throws, logs only the account id.
3. `signUp` calls it after `payload.create` has committed, inside the existing background work (staff-created and trusted creates never go through it; re-armed unconfirmed sign-ups are not new).
4. Tests (adapter mocked): sends on public sign-up, custom recipient, setting hidden from anonymous reads, not on trusted/staff create, not without SMTP, failure does not break sign-up.
5. GUIA-DA-EQUIPE.md, "Contas gratuitas": paragraph "Aviso de novo cadastro".
