/**
 * Initial texts of the six institutional pages (INST-01, INST-06), seeded by the `pages`
 * migration only when a page with that key does not exist yet (staff edits are never
 * overwritten). Sources: 02-CONTENT.md (revised texts, LGPD/Terms drafts) merged with the
 * original wording from the WordPress database (02-WP-TEXTS.md: "Sobre a casa",
 * "Regras da Casa"), revised for the open area: no explicit content, elegant tone,
 * rules' meaning kept. The client reviews and edits them in the panel.
 *
 * Legal drafts keep their "[VALIDAR …]" markers on purpose until the lawyer's review.
 */
import type { PageKey } from '../../lib/pages/keys'

export type PageSeed = {
  key: PageKey
  title: string
  intro: string
  markdown: string
}

const QUEM_SOMOS = `
Se você chegou até aqui, provavelmente tem curiosidade sobre a vida liberal — ou já faz parte dela. O **Paraíso Brasília** é uma casa de festas liberais onde casais, mulheres e homens encontram um ambiente reservado, seguro e acolhedor para dançar, conversar, conhecer pessoas e viver a noite do seu jeito.

## A primeira vez

Mesmo os casais liberais mais experientes já tiveram a sua primeira vez. Sabemos a importância desse momento: as dúvidas, a expectativa, o clima de novidade. Se vocês estão buscando informação, já deram um passo importante.

Ao entrar, você encontra uma boate como outra qualquer: gente dançando, bebendo e se divertindo. Quem chega pela primeira vez é recebido por um dos nossos promotores, que apresenta todos os ambientes da casa e explica as regras e as características de cada um. Depois, acompanhamos você até uma mesa ou ao bar.

## O que você encontra

- Pista de dança com DJ, bar e shows nas noites de festa.
- Espaços amplos, jardim e piscina numa chácara reservada no Núcleo Rural Lago Oeste.
- Ambientes reservados para casais que desejam mais privacidade — a participação é sempre uma escolha de cada casal.

## Do seu jeito

Pode olhar à vontade: **ninguém é obrigado a nada que não seja de comum acordo**. Convites podem surgir, mas cabe somente a vocês decidir se querem ou não participar. Quem quer apenas assistir às atrações é muito bem-vindo; quem prefere só observar, também; e quem deseja participar mais, também.

O Paraíso se destaca por buscar a integração entre os casais, para que ninguém se sinta deslocado e as amizades comecem logo. Todas as atividades buscam essa integração, mas nem todas são de conteúdo erótico. Quem participa, se diverte. Quem não participa, também.

## Respeito acima de tudo

A liberdade é a base da casa: cada pessoa faz o que deseja — e somente o que deseja —, desde que não agrida nem obrigue ninguém. Por isso pedimos que todos conheçam nossas **Normas** e **Regras**. Quem passar dos limites recebe advertência conforme a gravidade ou é convidado a deixar a festa imediatamente.

Ficou com alguma dúvida? Nossa equipe está sempre à disposição, na casa, pelo WhatsApp ou por e-mail. Sinta-se em casa.
`

const NORMAS = `
Para preservar a privacidade e o respeito entre os frequentadores, o Paraíso Brasília se apoia em três princípios inegociáveis e numa convivência baseada no consentimento.

## Nossos princípios

1. **Somente maiores de 18 anos.** Não é permitida, em nenhuma hipótese, a entrada de menores de idade. Podemos pedir documento com foto na entrada.
2. **Nenhuma droga.** O uso, o porte e a oferta de drogas são terminantemente proibidos nas dependências da casa.
3. **Nenhuma prostituição.** Tolerância zero com qualquer retribuição financeira entre pessoas em contato íntimo dentro da casa: isso foge ao espírito liberal que nos orienta. Quem sugerir esse tipo de acordo será convidado a se retirar imediatamente.

## Consentimento e respeito

- O fundamental é a liberdade: cada pessoa faz o que quiser, e só o que quiser, desde que não agrida nem obrigue ninguém.
- Um "não" encerra o assunto — sem insistência, sem constrangimento. Isso vale para casais, mulheres e homens.
- Quem desrespeitar outras pessoas ou causar mal-estar será convidado a deixar a casa.

## Discrição

A discrição é essencial entre os frequentadores. O que acontece na casa — e quem está nela — fica na casa. Por isso não é permitido fotografar nem filmar (veja as Regras).

## Base legal

Todo adulto capaz de decidir e consentir tem liberdade para fazer as próprias escolhas, garantida pela Constituição Federal (art. 5º, inciso II: "ninguém será obrigado a fazer ou deixar de fazer alguma coisa senão em virtude de lei"). Nossa conduta respeita a legislação brasileira.
`

const REGRAS = `
Para que todos aproveitem a noite com tranquilidade, pedimos atenção às regras abaixo. O descumprimento pode resultar em advertência ou saída imediata.

1. **Horário.** Abrimos às 22h e seguimos até por volta das 5h.
2. **Quem pode entrar.** Às sextas-feiras, a entrada é **exclusiva para casais e mulheres**. Às quartas, quintas, sábados e domingos, recebemos casais, mulheres e homens — homens desacompanhados **somente com reserva** e em número controlado. Confira sempre a programação da festa.
3. **Idade.** Não é permitida a entrada de menores de 18 anos.
4. **Câmeras e celulares.** Não são permitidos filmadora, máquina fotográfica, celular com câmera ou qualquer aparelho que possa captar imagens — a discrição é fundamental entre os casais.
5. **Fumo e vidro.** É proibido fumar. Também não é permitido levar copos ou garrafas de vidro para as áreas reservadas.
6. **Drogas.** Terminantemente proibidas nas dependências da casa.
7. **Respeito.** Quem causar mal-estar ou desrespeitar outros frequentadores será convidado a se retirar.
8. **Armas.** Não é permitida a entrada com qualquer tipo de arma.
9. **Traje.** Esporte fino é o traje mais indicado. Algumas festas têm tema ou dress code próprio, informado na página da festa.
10. **Boa convivência.** Gritos e palavrões não são admitidos; o clima da casa é de festa e cordialidade.
`

const DICAS = `
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
`

const TERMOS = `
## 1. Quem somos

Este site (swingbrasilia.com.br e domínios associados) é mantido pelo **Paraíso Brasília** [VALIDAR: razão social e CNPJ], com endereço na Rua 15, Travessa 01, Chácara 02 — Núcleo Rural Lago Oeste, Sobradinho – DF, CEP 73100-450. Contato: suporte@swingbrasilia.com.br.

## 2. Somente para maiores de 18 anos

O site trata de temas adultos e é destinado exclusivamente a maiores de 18 anos. Ao entrar, você declara ter 18 anos ou mais. Se você é menor de idade, saia do site. [VALIDAR: adequação ao ECA Digital e à forma de verificação de idade]

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
`

const PRIVACIDADE = `
## 1. Controlador e contato

O controlador dos dados é o **Paraíso Brasília** [VALIDAR: razão social e CNPJ], Rua 15, Travessa 01, Chácara 02 — Núcleo Rural Lago Oeste, Sobradinho – DF, CEP 73100-450.

Encarregado pelo tratamento de dados (DPO): [VALIDAR: nome] — e-mail **suporte@swingbrasilia.com.br** [VALIDAR: e-mail próprio para privacidade, ex.: privacidade@swingbrasilia.com.br].

## 2. Quais dados tratamos

**Na área aberta (sem cadastro):**

- **Confirmação de idade:** um cookie (pb_age_ok) que registra que você declarou ter 18 anos ou mais, válido por 30 dias. Não guardamos seu nome nem documento.
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

Usamos apenas cookies necessários: confirmação de idade (pb_age_ok, 30 dias) e, para quem faz login, cookie de sessão. Não usamos cookies de publicidade. [VALIDAR: se forem incluídas ferramentas de estatística, atualizar esta seção]

## 7. Por quanto tempo guardamos

- Registros de acesso: 6 meses.
- Dados de assinantes: enquanto a assinatura existir e pelo prazo exigido por lei depois do encerramento [VALIDAR: prazos fiscais/consumidor].
- Imagens: enquanto houver autorização; removidas mediante pedido (seção 9).

## 8. Seus direitos (LGPD, art. 18)

Você pode pedir: confirmação de que tratamos seus dados; acesso; correção; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; informação sobre compartilhamento; e revogação do consentimento. Escreva para suporte@swingbrasilia.com.br. Respondemos em até 15 dias. Você também pode reclamar à ANPD (Autoridade Nacional de Proteção de Dados).

## 9. Pedido de remoção de imagem

Se você aparece em uma foto ou vídeo do site e quer que seja removido, **mesmo que tenha autorizado antes**:

1. Envie mensagem pelo [WhatsApp (61) 99988-9772](https://wa.me/5561999889772) ou pelo e-mail [suporte@swingbrasilia.com.br](mailto:suporte@swingbrasilia.com.br), com o assunto "Remoção de imagem".
2. Informe o endereço da página e descreva a imagem (ou envie um print).
3. Para sua segurança, podemos pedir uma forma simples de confirmar que a imagem é sua.

A imagem é retirada do site **em até 24 horas** depois do pedido (normalmente bem antes), e os arquivos são apagados do nosso servidor. Cópias feitas por terceiros fora do nosso site não estão sob nosso controle, mas podemos orientar você.

## 10. Segurança

Usamos conexão criptografada (HTTPS), senhas com hash, acesso restrito ao painel e cópias de segurança protegidas. Em caso de incidente de segurança relevante, comunicaremos a ANPD e os titulares afetados, conforme a lei.

## 11. Menores de idade

O site não é destinado a menores de 18 anos e não coleta intencionalmente dados de menores. Se identificarmos dados de menor, eles serão apagados.

## 12. Alterações

Esta política pode ser atualizada. A data da última atualização aparece no topo da página.
`

export const PAGES_SEED: PageSeed[] = [
  {
    key: 'quem-somos',
    title: 'Quem somos',
    intro:
      'O Paraíso Brasília é uma casa de festas liberais para casais e solteiros, num espaço reservado no Lago Oeste, com discrição, respeito e liberdade.',
    markdown: QUEM_SOMOS,
  },
  {
    key: 'normas',
    title: 'Normas da casa',
    intro: 'Os princípios que garantem um ambiente seguro, discreto e respeitoso para todos.',
    markdown: NORMAS,
  },
  {
    key: 'regras',
    title: 'Regras e procedimentos',
    intro: 'Horários, entrada, traje e o que é ou não permitido nas noites do Paraíso.',
    markdown: REGRAS,
  },
  {
    key: 'dicas',
    title: 'Dicas para a sua visita',
    intro: 'Primeira vez numa casa liberal? Algumas dicas para chegar tranquilo e aproveitar a noite.',
    markdown: DICAS,
  },
  {
    key: 'termos',
    title: 'Termos de Uso',
    intro: 'Condições para usar o site do Paraíso Brasília.',
    markdown: TERMOS,
  },
  {
    key: 'privacidade',
    title: 'Política de Privacidade',
    intro:
      'Como o Paraíso Brasília trata dados pessoais no site, conforme a LGPD, e como pedir a remoção de uma imagem.',
    markdown: PRIVACIDADE,
  },
]
