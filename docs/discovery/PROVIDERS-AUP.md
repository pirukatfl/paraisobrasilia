# Políticas de uso dos provedores (conteúdo adulto)

O Paraíso terá, a partir da Fase 4, uma área de assinantes com fotos e vídeos explícitos (conteúdo adulto **legal**, de maiores, com consentimento). Por isso cada provedor (servidor, armazenamento, CDN/DNS, e-mail) precisa permitir esse tipo de conteúdo **antes** de contratar — trocar de provedor depois significa migrar o site às pressas.

Pesquisa feita em 2026-10-17 lendo as páginas oficiais de termos de cada provedor (trechos copiados literalmente, no idioma original). Nada foi contratado nem cadastrado. Confiança: **ALTA** = texto oficial explícito sobre conteúdo adulto; **MÉDIA** = texto oficial sem proibição, mas também sem permissão explícita (confirmar por chamado ao suporte); **BAIXA** = fonte não oficial, texto ambíguo ou página não lida.

## Tabela

| Provedor | Serviço | Conteúdo adulto legal permitido? | Trecho/evidência | Fonte (URL) | Confiança | Data |
|----------|---------|----------------------------------|------------------|-------------|-----------|------|
| Hetzner | VPS | **Não** | Termos, seção 8.2: "The Customer is obligated not to publish any content that infringes on the rights of third parties … or otherwise violates applicable law. This includes in particular, but is not limited to, pornographic or obscene material, extremist content …". Confirma a declaração da equipe no LowEndTalk: "não permite conteúdo pornográfico" (https://lowendtalk.com/discussion/comment/4502754) | https://www.hetzner.com/legal/terms-and-conditions/ | ALTA | 2026-10-17 |
| Contabo | VPS | **Não** | Termos gerais (vigentes desde fev/2025), cláusula 6(1): "The customer furthermore warrants that the content provided or published does not violate public morals, … does not contain any pornographic or obscene materials, …". A FAQ diz que "there are no controls on for what you use your server for", mas só dentro da lei alemã e dos Termos | https://contabo.com/en-us/legal/terms-and-conditions/ | ALTA | 2026-10-17 |
| OVHcloud (Europa/internacional) | VPS | Sim, sem proibição específica | Termos gerais de serviço (17/01/2025), 6.2.1: "The Client must use lawful Content as part of the Services and use it in compliance with applicable laws and regulations." Proíbe conteúdo ilícito, "containing child pornography …" e incitação ao ódio; nada sobre conteúdo adulto legal. Condições específicas de VPS (10/04/2025) sem menção a conteúdo adulto | https://www.ovhcloud.com/en/terms-and-conditions/contracts/ (PDF: https://contract.eu.ovhapis.com/1.0/pdf/contrat_genServices-we.pdf) | MÉDIA | 2026-10-17 |
| Hostinger | VPS | **Sim (explícito)** | Artigo oficial de suporte: "You are able to host adult web pages (like porn) with all our hosting packages." e "Due to high resource requirements for such a type of website, we recommend Cloud or VPS hosting for such purposes". Outro artigo oficial (modificado em 15/09/2026): "You can host adult-oriented websites at Hostinger", desde que o conteúdo seja legal | https://support.hostinger.com/en/articles/1583358-do-you-allow-adult-web-pages e https://www.hostinger.com/support/which-types-of-content-and-websites-are-allowed-at-hostinger/ | ALTA | 2026-10-17 |
| Locaweb | VPS (Brasil) | Sim, sem proibição específica | Contrato de VPS (V02.2026, 27/07/2026), cláusula 5.4.1 "c" proíbe "Material de teor sexual explícito envolvendo menores de idade (pornografia infantil)" e a "divulgação não consensual de imagens, vídeos ou dados de teor íntimo ou sexual"; não há proibição de conteúdo adulto legal nem cláusula de "moral e bons costumes" | https://sources.locaweb.com.br/site/contratos/contrato-vps-locaweb.pdf | MÉDIA | 2026-10-17 |
| HostGator Brasil | VPS / hospedagem (Brasil) | Sim, sem proibição específica | Termos de serviço, 4.1: "Todos os serviços oferecidos pela HostGator são exclusivamente para propósitos legais."; 4.5 proíbe "(iii) pornografia infantil e crimes graves contra crianças e adolescentes e pessoas vulneráveis". Nenhuma menção a conteúdo adulto legal | https://www.hostgator.com.br/termos-de-servico | MÉDIA | 2026-10-17 |
| Vultr | VPS (tem região São Paulo) | Incerto | Política de uso (31/10/2022) proíbe "Content that is harmful to minors in any way, defamatory, libelous, obscene, abusive, …" e "any defamatory, obscene, or otherwise unlawful content, such as child pornography …". Não fala de conteúdo adulto legal; o termo "obscene" deixa margem de interpretação | https://www.vultr.com/legal/use-policy/ | BAIXA | 2026-10-17 |
| Backblaze B2 | Armazenamento de objetos (fotos/vídeos) | Sim, sem proibição específica | AUP (vigente desde 16/04/2026) proíbe apenas CSAM e imagens íntimas sem consentimento: "(d) involves child sexual abuse material ("CSAM") or non-consensual intimate imagery." e "Store, publish, share, or transmit another person's intimate imagery without their authorization" | https://www.backblaze.com/company/policy/acceptable-use-policy | MÉDIA | 2026-10-17 |
| Cloudflare | DNS / CDN (Stream, Images, R2) | DNS/CDN: sem proibição geral; Stream/Images/R2: risco de remoção | Termos da plataforma de desenvolvedor (28/09/2026): "Content stored or streamed on Cloudflare Stream and Cloudflare Images that we determine in our sole judgment" [seja ilegal ou nocivo] pode ser bloqueado ou removido; não menciona conteúdo adulto. AUP geral da Cloudflare não lida | https://www.cloudflare.com/service-specific-terms-developer-platform/ | MÉDIA (DNS/CDN) / BAIXA (Stream/Images) | 2026-10-17 |
| Resend | E-mail transacional | Conteúdo dos e-mails: **não**; e-mails neutros: talvez | AUP (13/10/2026), "Prohibited Sending Content": "Pornography/sexually explicit content" e "Escort services". E-mails transacionais neutros (redefinição de senha, aviso de vencimento) podem ser aceitos, mas **requer confirmação com o suporte** declarando a natureza do site | https://resend.com/legal/acceptable-use | MÉDIA | 2026-10-17 |
| Cloudinary | Imagens/vídeo | **Não** | "Cloudinary doesn't permit the hosting of adult (NSFW) content." | https://cloudinary.com/documentation/ts_dam_does_cloudinary_support_adult_nsfw_content | ALTA | 2026-10-17 |
| Vercel / Netlify | Hospedagem serverless | Não usar | Política sobre conteúdo adulto pouco clara (apenas tópicos de fórum); suspensão de conta derrubaria o site. Decisão do projeto (CLAUDE.md): não usar | não verificado | BAIXA | 2026-10-17 |

Observações:

- "Sem proibição específica" **não** é permissão por escrito. Antes de contratar, abrir um chamado no provedor escolhido descrevendo o site (casa de festas liberais, área pública sem nudez, área de assinantes com fotos/vídeos explícitos de maiores com consentimento) e guardar a resposta (checklist de STACK.md, "Hosting Policy Checklist").
- Domínio e DNS ficam na conta da casa (registrador/Cloudflare), não na do desenvolvedor.

## Recomendação para staging (Fase 1)

O staging da Fase 1 só hospeda flyers sem nudez, então o risco imediato é baixo. Mesmo assim, **o mesmo provedor deve carregar a produção**, que terá a área de assinantes com mídia explícita a partir da Fase 4 — escolher agora evita uma migração forçada depois. Configuração prevista: 2 vCPU, 4 GB RAM, 40 GB de disco, Ubuntu 24.04 (plano 01-10).

Lista curta, em ordem:

1. **Hostinger VPS** — única com permissão explícita e oficial para sites adultos ("like porn"), recomendando justamente VPS para esse uso. Confirmar no pedido a disponibilidade de servidor no Brasil e abrir chamado mesmo assim.
2. **OVHcloud VPS** — empresa grande, contrato exige apenas conteúdo lícito, sem cláusula moral; latência maior (sem data center no Brasil — verificar a região mais próxima). Confirmar por chamado.
3. **Locaweb VPS** — empresa brasileira, data center no Brasil, contrato proíbe só pornografia infantil e conteúdo íntimo não consensual. Confirmar por chamado, já que o contrato não fala de conteúdo adulto legal.

Alternativas: HostGator Brasil (mesma situação da Locaweb) e Vultr (região São Paulo, mas a palavra "obscene" na política deixa dúvida — só com confirmação por escrito).

**Descartados:** Hetzner e Contabo (termos proíbem material pornográfico), Vercel/Netlify, Cloudinary.

Para os demais serviços: armazenamento em **Backblaze B2**; **Cloudflare** apenas como DNS/CDN (sem Stream/Images para mídia de assinantes); e-mail transacional em **Resend** só após confirmação do suporte (alternativa: Amazon SES, não verificado).

Escolha do cliente: Hostinger VPS (2026-10-17) — aceita conteúdo adulto por escrito (suporte oficial).
