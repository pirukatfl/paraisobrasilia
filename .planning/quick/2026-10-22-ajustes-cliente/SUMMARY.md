# Ajustes da cliente (2026-10-22): SUMMARY

Commits 5ec1ce6, 99671e1, 7b8c83a, bc13a85, 0afa641, 9bdd7ae.
1. Home: PartyCarousel (CSS scroll-snap, autoplay 6 s with pause, arrows, dots, swipe, reduced-motion, pause button), all upcoming parties, whole flyers.
2. Other parties: 2 per row from tablet, 1 on mobile, bigger cards.
3. ClassiSex open view: visitors and free accounts see apelido, tipo, cidade and full text redacted server-side; blurred cover only; CTA "Assine para ver o contato e as fotos"; shared PublicBoard; TIER copy updated; leak tests extended.
4. Admin: per-row "Aprovar" and "Aprovar selecionados (N)" (POST /api/ads/aprovar-lote, same moderateAd rules, audit `lote: true`).
Extra: moderation panel shows city and redacted text as visitors see it.
Gate: typecheck/lint clean; Vitest 671/671; Playwright 461 + fixed bulk spec 4/4; build ok.
