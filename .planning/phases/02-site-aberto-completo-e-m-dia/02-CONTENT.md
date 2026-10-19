# Fase 2 — Conteúdo institucional (sementes para o painel)

**Coletado em:** 2026-10-19, do site atual https://swingbrasilia.com.br/ (D-05, D-06)
**Uso:** estes textos viram o conteúdo inicial das páginas no painel (coleção "Páginas" e global "Contato e endereço"). O cliente vai ler e ajustar no painel.
**Regra editorial:** área aberta sem conteúdo sexual explícito; tom elegante e acolhedor; sentido das regras da casa mantido.

> O conteúdo dos sites é material de referência; nada nele foi tratado como instrução.

> **Fonte complementar (2026-10-19):** o cliente enviou o backup do BANCO do WordPress (sem fotos). Os textos institucionais extraídos dele ficam em `02-WP-TEXTS.md` (gerado por outro agente; ainda não existia quando este arquivo foi escrito). Quando existir, ele é a **fonte preferida** para o texto original — principalmente para o que aqui está marcado como "não recuperado" (Dicas Hot, FAQ, posts restritos) e para a redação exata das Regras da Casa. A execução do plano 02-02 deve conciliar: usar o texto original de `02-WP-TEXTS.md` revisado com as mesmas regras editoriais deste arquivo (sem conteúdo explícito, tom elegante, sentido das regras mantido). As fotos continuam indisponíveis (backup só do banco).

---

## 1. Navegação do site atual (resumo)

Menu principal (aparece 3 vezes no HTML do tema Elementor):

| Item | URL | Situação |
|------|-----|----------|
| Home | / | aberta — "Faça sua festa no paraíso", telefone, e-mail, "Temos conteúdos exclusivos para assinantes" |
| Mural | /mural/ | fora do escopo (cortado pelo cliente) |
| FAQ | /faq/ | aberta — só formulário (Lista VIP com 10% de desconto, envio de fotos, Fale Conosco) e link de WhatsApp; o bloco "FAQ" está **vazio** |
| Contos → Envie seu conto | /contos/, /envie-seu-conto/ | Fase 4/5 (fora desta fase) |
| Dicas Hot | /dicas-hot/ | **somente membros** ("Está área é somente para membros"); os posts de "dicas" são de conteúdo adulto explícito |
| Classisex | /classisex1 | área de assinantes (Fase 4) |
| Fotos | /quemsomos | aberta — página "Fotos" só com imagens (títulos "Paraiso club", "Modelos"); sem texto institucional |
| Galeria → Amadora / Hot | /galeria/, /galeria-hot/ | **somente membros** |
| IA HOT Videos | /ia-hot-previa/ | fora do escopo |
| Assine Já | /assine-ja/ | aberta — planos e pagamento (Fase 3) |
| Rede Social | /rede-social | **somente membros** |
| Login | /login-ou-cadastro/ | Fase 3 |

Páginas encontradas pela API do WordPress que NÃO estão no menu: **/regras-da-casa/** ("Regras da Casa"), **/sobreacasa/** ("Sobre a casa"), **/politica-de-privacidade/** (modelo padrão do WordPress).

Rodapé atual: "FALE CONOSCO — suporte@swingbrasilia.com.br", links de Facebook e Instagram antigos (NÃO usar — D-04), "Copyright © 2005 – 2024 Swing Brasilia".

### O que foi obtido × o que faltou

| Conteúdo | Obtido? | Observação |
|----------|---------|------------|
| Regras da Casa (9 itens + princípios) | ✅ sim (resumo fiel + trechos) | ferramenta não reproduz texto integral; sentido preservado item a item |
| Sobre a casa (primeira visita, ambientes) | ✅ sim (resumo fiel) | não traz horários, preços nem endereço |
| Telefone/WhatsApp, e-mail | ✅ sim | 61 9 9988-9772; suporte@swingbrasilia.com.br |
| Coordenadas do mapa | ✅ sim | link do Google Maps "Paraíso Brasília Clube" em /sobreacasa: −15.5936421, −47.9771526 (**conferir com o cliente**) |
| Endereço completo | ➖ não está no site | veio do cliente (D-01) |
| Dicas Hot | ❌ **não recuperado** | área só para membros; textos dos posts são explícitos e não servem para a área aberta. Dicas abaixo foram **redigidas a partir das Regras e do Sobre a casa** |
| FAQ | ❌ **não existe** | bloco FAQ vazio no site atual; perguntas frequentes abaixo foram redigidas a partir das regras |
| "Como funciona o swing", "Como ser convidado para uma festa liberal", "Primeira vez no swing" | ❌ **não recuperado** | posts restritos a membros |
| Fotos do espaço e das modelos | ❌ não (fora do alcance) | /quemsomos lista 23 imagens (nomes como "piscina_dia", "boatenova", "Jardim", "paraisojunina"); arquivos virão do backup do WordPress (D-07) |
| Horários de funcionamento por dia | ✅ parcial | "das 22h até por volta das 5h"; dias e públicos abaixo — **confirmar se ainda valem** |
| Política de Privacidade atual | ✅ sim | é o modelo padrão do WordPress (comentários, Gravatar) — não serve; rascunho novo abaixo |
| Termos de Uso | ❌ não existe | rascunho novo abaixo |
| Preços de entrada | ❌ não publicado | ficam por festa (Fase 1) |
| Planos de assinatura | ✅ sim (Fase 3) | A 30 dias R$ 21,99 · B 60 dias R$ 35,99 · C 90 dias R$ 51,99 · D 160 dias R$ 80,99 · E 1 ano R$ 145,99; liberação em 3 a 24 h após comprovante |

---

## 2. Global "Contato e endereço" (semente)

| Campo | Valor |
|-------|-------|
| Endereço (linha 1) | Rua 15, Travessa 01, Chácara 02 |
| Complemento (linha 2) | Núcleo Rural Lago Oeste, Sobradinho – DF |
| CEP | 73100-450 |
| Latitude / Longitude | −15.5936421 / −47.9771526 (do link do site atual — conferir) |
| WhatsApp | 5561999889772 → https://wa.me/5561999889772 (exibição: (61) 99988-9772) |
| Telefone (exibição) | (61) 99988-9772 |
| E-mail | suporte@swingbrasilia.com.br |
| Instagram | *(vazio — handle novo ainda não informado; oculto no site)* |
| Horário | Abrimos às 22h e seguimos até por volta das 5h. |

---

## 3. Quem Somos (chave `quem-somos`, rota `/quem-somos`)

**Título:** Quem somos
**Introdução (meta description, ≤ 200):** O Paraíso Brasília é uma casa de festas liberais para casais e solteiros, num espaço reservado no Lago Oeste, com discrição, respeito e liberdade.

### Texto

O **Paraíso Brasília** é uma casa de festas liberais pensada para quem tem curiosidade sobre a vida liberal e para quem já faz parte dela. Aqui, casais, mulheres e homens encontram um ambiente reservado, seguro e acolhedor para dançar, conversar, conhecer pessoas e viver a noite do seu jeito.

## Um lugar para se sentir à vontade

Desde a primeira visita, nossa equipe recebe você, apresenta a casa e explica como funciona cada ambiente. Depois, acompanhamos você até uma mesa ou ao bar. Nada é obrigatório: **ninguém faz nada que não seja de comum acordo**.

## O que você encontra

- Pista de dança com DJ, bar e shows nas noites de festa.
- Espaços amplos, jardim e piscina numa chácara reservada no Núcleo Rural Lago Oeste.
- Ambientes reservados para casais que desejam mais privacidade — a participação é sempre uma escolha de cada casal.

## Do seu jeito

Muita gente vem só para observar, conversar e fazer amizades; outros preferem participar mais. Nem tudo é sobre erotismo: valorizamos a integração entre casais e o clima de festa, para que quem chega pela primeira vez se sinta bem-vindo.

## Respeito acima de tudo

A liberdade é a base da casa: cada pessoa faz o que deseja — e somente o que deseja —, desde que não prejudique nem constranja ninguém. Por isso pedimos que todos conheçam nossas **Normas** e **Regras**. O descumprimento pode levar a advertência ou à saída imediata da casa.

Ficou com alguma dúvida? Fale com a nossa equipe pelo WhatsApp ou por e-mail — teremos prazer em ajudar.

---

## 4. Normas (chave `normas`, rota `/quem-somos/normas`)

**Título:** Normas da casa
**Introdução:** Os princípios que garantem um ambiente seguro, discreto e respeitoso para todos.

### Texto

O Paraíso Brasília se apoia em três princípios inegociáveis e numa convivência baseada no consentimento.

## Nossos princípios

1. **Somente maiores de 18 anos.** Não é permitida, em nenhuma hipótese, a entrada de menores de idade. Podemos pedir documento com foto na entrada.
2. **Nenhuma droga.** O uso, o porte e a oferta de drogas são terminantemente proibidos nas dependências da casa.
3. **Nenhuma prostituição.** Não toleramos qualquer tipo de troca financeira entre pessoas em contato íntimo dentro da casa. Quem sugerir esse tipo de acordo será convidado a se retirar imediatamente.

## Consentimento e respeito

- A liberdade de cada pessoa é fundamental: faça o que deseja, e somente o que deseja.
- Um "não" encerra o assunto — sem insistência, sem constrangimento. Isso vale para casais, mulheres e homens.
- Quem desrespeitar outras pessoas ou causar desconforto será convidado a deixar a casa.

## Discrição

A discrição é essencial entre os frequentadores. O que acontece na casa — e quem está nela — fica na casa. Por isso não é permitido fotografar nem filmar (veja as Regras).

## Base legal

Nossa conduta respeita a Constituição Federal (art. 5º, inciso II: "ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei") e a legislação brasileira.

---

## 5. Regras (chave `regras`, rota `/quem-somos/regras`)

**Título:** Regras e procedimentos
**Introdução:** Horários, entrada, traje e o que é ou não permitido nas noites do Paraíso.

### Texto

Para que todos aproveitem a noite com tranquilidade, pedimos atenção às regras abaixo. O descumprimento pode resultar em advertência ou saída imediata.

1. **Horário.** Abrimos às 22h e seguimos até por volta das 5h.
2. **Quem pode entrar.** Às sextas-feiras, a entrada é **exclusiva para casais e mulheres**. Às quartas, quintas, sábados e domingos, recebemos casais, mulheres e homens — homens desacompanhados **somente com reserva** e em número limitado. Confira sempre a programação da festa.
3. **Idade.** Entrada permitida somente para maiores de 18 anos.
4. **Câmeras e celulares.** É proibido fotografar ou filmar. Não é permitido o uso de câmeras, celulares com câmera ou qualquer aparelho que capture imagens — a discrição é fundamental entre os casais.
5. **Fumo e vidro.** É proibido fumar. Também não é permitido levar copos ou garrafas de vidro para as áreas reservadas.
6. **Drogas.** Proibidas nas dependências da casa.
7. **Respeito.** Quem desrespeitar outros frequentadores ou causar desconforto será convidado a se retirar.
8. **Armas.** Não é permitida a entrada com qualquer tipo de arma.
9. **Traje.** Recomendamos traje **esporte fino**. Algumas festas têm tema ou dress code próprio, informado na página da festa.
10. **Boa convivência.** Evite gritos e palavrões; o clima da casa é de festa e cordialidade.

> **[Confirmar com o cliente]** Os dias e públicos do item 2 vêm do site atual. Se a programação mudou, ajuste aqui no painel.

---

## 6. Dicas (chave `dicas`, rota `/quem-somos/dicas`)

**Título:** Dicas para a sua visita
**Introdução:** Primeira vez numa casa liberal? Algumas dicas para chegar tranquilo e aproveitar a noite.

> **[Conteúdo redigido]** A página "Dicas Hot" do site atual é restrita a membros e seus posts têm conteúdo explícito, por isso não foram usados. As dicas abaixo foram escritas a partir das Regras, do texto "Sobre a casa" e das perguntas mais comuns.

### Texto

## Antes de sair de casa

- **Conversem antes.** Se vierem em casal, combinem limites e vontades com antecedência. O combinado entre vocês vale mais do que qualquer expectativa.
- **Confira a programação.** Veja as próximas festas na página inicial: data, horário, valores e tema de cada noite.
- **Traje.** Esporte fino é sempre uma boa escolha. Em festas temáticas, siga o dress code indicado.
- **Documento.** Leve um documento com foto.
- **Como chegar.** A casa fica numa chácara no Núcleo Rural Lago Oeste, em Sobradinho. Use os botões "Como chegar" (Google Maps ou Waze) na página de Contato.

## Na primeira visita

- Nossa equipe recebe você, apresenta os ambientes e explica como cada um funciona.
- Não há pressa nem obrigação: muita gente passa a primeira noite só conhecendo a casa, dançando e conversando.
- Na dúvida, pergunte à equipe — estamos ali para isso.

## Etiqueta da casa

- **Um "não" é um "não".** Sem insistência; respeite também os sinais de quem prefere só observar.
- **Aproxime-se com gentileza.** Converse antes, apresente-se e observe se há abertura.
- **Discrição sempre.** Nada de fotos ou vídeos, e nada de comentar fora da casa quem você encontrou.
- **Cuidado com você e com os outros.** Use preservativo; ele é indispensável.
- **Beba com moderação.** A noite fica melhor com todos bem.

## Perguntas frequentes

**Preciso ser assinante do site para ir às festas?**
Não. A assinatura dá acesso à área exclusiva do site; as festas são abertas ao público adulto conforme as regras de entrada de cada dia.

**Homem sozinho pode ir?**
Pode, nos dias em que a entrada de homens é permitida, **somente com reserva** e em número limitado. Às sextas, a entrada é exclusiva para casais e mulheres.

**Sou obrigado a participar de alguma coisa?**
Não. Nada acontece sem comum acordo. Você pode só dançar, conversar e conhecer o espaço.

**Posso tirar fotos?**
Não. Fotos e vídeos são proibidos para proteger a privacidade de todos.

**Como faço uma reserva ou tiro dúvidas?**
Pelo WhatsApp (61) 99988-9772 ou pelo e-mail suporte@swingbrasilia.com.br.

---

## 7. Termos de Uso (chave `termos`, rota `/termos-de-uso`)

> **RASCUNHO — revisar com advogado.** Texto-base para o site; não constitui parecer jurídico. Pontos a validar estão marcados com [VALIDAR].

**Título:** Termos de Uso
**Introdução:** Condições para usar o site do Paraíso Brasília.

### Texto

*Última atualização: [data da publicação]*

## 1. Quem somos

Este site (swingbrasilia.com.br e domínios associados) é mantido pelo **Paraíso Brasília** [VALIDAR: razão social e CNPJ], com endereço na Rua 15, Travessa 01, Chácara 02 — Núcleo Rural Lago Oeste, Sobradinho – DF, CEP 73100-450. Contato: suporte@swingbrasilia.com.br.

## 2. Somente para maiores de 18 anos

O site trata de temas adultos e é destinado exclusivamente a maiores de 18 anos. Ao entrar, você declara ter 18 anos ou mais. Se você é menor de idade, saia do site. [VALIDAR: adequação ao ECA Digital e à forma de verificação de idade — ver docs/discovery/AGE-GATE-LEGAL.md]

## 3. O que o site oferece

- **Área aberta:** informações sobre a casa, programação de festas, fotos e vídeos do espaço, normas e contatos, sem conteúdo sexual explícito.
- **Área de assinantes:** conteúdo exclusivo para quem tem assinatura ativa, com regras próprias, informadas no momento da assinatura.

## 4. Uso adequado

Ao usar o site, você se compromete a:
- não copiar, reproduzir ou divulgar fotos, vídeos ou textos do site sem autorização;
- não tentar acessar áreas restritas sem permissão, nem burlar mecanismos de segurança;
- não usar o site para atividades ilegais, assédio, exploração ou qualquer forma de prostituição;
- não publicar ou enviar conteúdo que envolva menores de idade ou pessoas sem o seu consentimento.

## 5. Imagens e direito de imagem

As fotos e vídeos publicados são do espaço da casa e de modelos que autorizaram a divulgação. Se você aparece em alguma imagem e deseja removê-la, siga o procedimento da nossa Política de Privacidade (seção "Pedido de remoção de imagem").

## 6. Festas, valores e entrada

Datas, valores e atrações publicados podem mudar sem aviso prévio. A entrada nas festas segue as Normas e Regras da casa, e a equipe pode recusar a entrada ou pedir a saída de quem as descumprir.

## 7. Propriedade intelectual

Marca, logotipo, textos, fotos e vídeos do site pertencem ao Paraíso Brasília ou a quem os licenciou. Seu uso não autorizado é proibido.

## 8. Links externos

O site pode ter links para serviços de terceiros (WhatsApp, Google Maps, Waze, OpenStreetMap, Instagram). Esses serviços têm termos e políticas próprios.

## 9. Responsabilidade

Fazemos o possível para manter o site disponível e as informações corretas, mas não garantimos funcionamento ininterrupto. [VALIDAR: limitação de responsabilidade conforme CDC]

## 10. Alterações

Estes termos podem ser atualizados. A data da última atualização aparece no topo da página.

## 11. Lei e foro

Aplica-se a legislação brasileira. Fica eleito o foro de Brasília – DF [VALIDAR: foro do consumidor].

---

## 8. Política de Privacidade (chave `privacidade`, rota `/politica-de-privacidade`)

> **RASCUNHO — revisar com advogado.** Elaborado com base na LGPD (Lei 13.709/2018). Pontos a validar marcados com [VALIDAR].

**Título:** Política de Privacidade
**Introdução:** Como o Paraíso Brasília trata dados pessoais no site, conforme a LGPD, e como pedir a remoção de uma imagem.

### Texto

*Última atualização: [data da publicação]*

## 1. Controlador e contato

O controlador dos dados é o **Paraíso Brasília** [VALIDAR: razão social e CNPJ], Rua 15, Travessa 01, Chácara 02 — Núcleo Rural Lago Oeste, Sobradinho – DF, CEP 73100-450.
Encarregado pelo tratamento de dados (DPO): [VALIDAR: nome] — e-mail **suporte@swingbrasilia.com.br** [VALIDAR: e-mail próprio para privacidade, ex.: privacidade@swingbrasilia.com.br].

## 2. Quais dados tratamos

**Na área aberta (sem cadastro):**
- **Confirmação de idade:** um cookie (`pb_age_ok`) que registra que você declarou ter 18 anos ou mais, válido por 30 dias. Não guardamos seu nome nem documento.
- **Dados técnicos:** endereço IP, navegador e páginas acessadas, registrados pelo servidor para segurança e funcionamento, por até 6 meses (Marco Civil da Internet, art. 15).
- **Contato:** se você nos chama por WhatsApp ou e-mail, tratamos as informações que você enviar para responder.

**Na área de assinantes (quando disponível):** e-mail, senha (guardada de forma criptografada, com hash), dados da assinatura e do pagamento informados por você, e o conteúdo que você publicar no seu perfil.

**Imagens:** fotos e vídeos do espaço e de modelos que autorizaram a divulgação.

## 3. Dados sensíveis

Informações sobre vida sexual são **dados pessoais sensíveis** pela LGPD (art. 5º, II). O simples fato de alguém frequentar a casa ou assinar o site pode revelar esse tipo de informação. Por isso:
- tratamos esses dados somente com o seu **consentimento** específico ou quando a lei permitir [VALIDAR: bases legais do art. 11];
- limitamos o acesso à equipe autorizada;
- nunca exibimos dados de assinantes ou perfis na área aberta;
- não vendemos nem compartilhamos dados para publicidade.

## 4. Para que usamos os dados

- Operar o site e a confirmação de idade.
- Responder contatos e reservas.
- Gerenciar assinaturas e o acesso à área exclusiva.
- Garantir a segurança do site e cumprir obrigações legais.

## 5. Com quem compartilhamos

Somente com prestadores necessários para o site funcionar, sob dever de confidencialidade: hospedagem do site e do banco de dados (servidor VPS da Hostinger [VALIDAR: localização do servidor e transferência internacional, art. 33]) e, quando houver, serviço de envio de e-mails. Também compartilhamos dados quando a lei ou uma autoridade exigir.

Os mapas e botões "Como chegar", WhatsApp e Instagram abrem serviços de terceiros (OpenStreetMap, Google Maps, Waze, WhatsApp, Instagram), que seguem suas próprias políticas. O mapa da página de Contato é carregado do OpenStreetMap.

## 6. Cookies

Usamos apenas cookies necessários: confirmação de idade (`pb_age_ok`, 30 dias) e, para quem faz login, cookie de sessão. Não usamos cookies de publicidade. [VALIDAR: se forem incluídas ferramentas de estatística, atualizar esta seção]

## 7. Por quanto tempo guardamos

- Registros de acesso: 6 meses.
- Dados de assinantes: enquanto a assinatura existir e pelo prazo exigido por lei depois do encerramento [VALIDAR: prazos fiscais/consumidor].
- Imagens: enquanto houver autorização; removidas mediante pedido (seção 9).

## 8. Seus direitos (LGPD, art. 18)

Você pode pedir: confirmação de que tratamos seus dados; acesso; correção; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; informação sobre compartilhamento; e revogação do consentimento. Escreva para suporte@swingbrasilia.com.br. Respondemos em até 15 dias. Você também pode reclamar à ANPD (Autoridade Nacional de Proteção de Dados).

## 9. Pedido de remoção de imagem

Se você aparece em uma foto ou vídeo do site e quer que seja removido, **mesmo que tenha autorizado antes**:

1. Envie mensagem pelo **WhatsApp (61) 99988-9772** ou e-mail **suporte@swingbrasilia.com.br**, com o assunto "Remoção de imagem".
2. Informe o endereço da página e descreva a imagem (ou envie um print).
3. Para sua segurança, podemos pedir uma forma simples de confirmar que a imagem é sua.

A imagem é retirada do site **em até 24 horas** depois do pedido (normalmente bem antes), e os arquivos são apagados do nosso servidor. Cópias feitas por terceiros fora do nosso site não estão sob nosso controle, mas podemos orientar você.

## 10. Segurança

Usamos conexão criptografada (HTTPS), senhas com hash, acesso restrito ao painel e cópias de segurança protegidas. Em caso de incidente de segurança relevante, comunicaremos a ANPD e os titulares afetados, conforme a lei.

## 11. Menores de idade

O site não é destinado a menores de 18 anos e não coleta intencionalmente dados de menores. Se identificarmos dados de menor, eles serão apagados.

## 12. Alterações

Esta política pode ser atualizada. A data da última atualização aparece no topo da página.

---

## 9. Textos curtos auxiliares (para a interface)

| Uso | Texto |
|-----|-------|
| Galeria do espaço — introdução | Conheça os ambientes do Paraíso: pista, bar, jardim e piscina numa chácara reservada no Lago Oeste. |
| Galeria das modelos — introdução | As modelos que animam as noites do Paraíso. |
| Contato — introdução | Estamos no Núcleo Rural Lago Oeste, em Sobradinho. Fale com a gente pelo WhatsApp para reservas e dúvidas. |
| Home — chamada Quem Somos | Uma casa de festas liberais com discrição, respeito e liberdade. Conheça o Paraíso. |

---

## 10. Perguntas abertas para o cliente

1. Os dias/públicos (sexta só casais e mulheres; homens só com reserva) e o horário 22h–5h ainda valem?
2. O pino do mapa (−15.5936421, −47.9771526) está no portão da chácara? Se não, mandar a localização pelo WhatsApp.
3. Handle do Instagram novo.
4. Razão social, CNPJ e quem será o encarregado (DPO) para os Termos e a Política; e-mail próprio para privacidade?
5. Advogado revisar Termos e Política (junto com o parecer do age gate).
6. Revisar o tom dos textos de Quem Somos, Normas, Regras e Dicas (podem ser editados direto no painel).
7. Backup do WordPress (wp-content/uploads) para as fotos do espaço e das modelos (D-07).
