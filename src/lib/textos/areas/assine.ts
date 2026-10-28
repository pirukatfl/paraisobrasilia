import { definirArea } from '../tipos'

export const assine = definirArea({
  slug: 'textos-assine',
  rotulo: 'Assine Já e planos',
  descricao: 'Textos fixos da página Assine Já, da tabela Grátis × Assinante e da chamada "Assine Já" dos contos e do ClassiSex.',
  campos: {
    // Google
    googleTitulo: {
      rotulo: 'Título no Google',
      padrao: 'Assine Já',
      secao: 'Google',
      ajuda: 'Aparece na aba do navegador e no Google.',
    },
    googleDescricao: {
      formatado: false,
      rotulo: 'Descrição no Google',
      padrao:
        'Planos de assinatura do Paraíso Brasília: acesso à área de assinantes com perfis, fotos e contatos. Pague pelo PagBank e envie o comprovante pelo WhatsApp.',
      secao: 'Google',
    },

    // Topo
    topoEtiqueta: { rotulo: 'Frase pequena acima do título', padrao: 'Assinatura', secao: 'Topo da página' },
    topoTitulo: { rotulo: 'Título da página', padrao: 'Assine Já', secao: 'Topo da página' },
    topoTexto: {
      formatado: true,
      rotulo: 'Texto de apresentação',
      padrao:
        'A assinatura libera a área de assinantes do Paraíso: perfis completos do ClassiSex com fotos, vídeos e contatos, e recados privados entre assinantes.',
      secao: 'Topo da página',
    },

    // Tabela Grátis x Assinante
    comparativoTitulo: { rotulo: 'Título da tabela', padrao: 'Grátis × Assinante', secao: 'Tabela Grátis × Assinante' },
    comparativoColunaItem: {
      rotulo: 'Título da primeira coluna',
      padrao: 'O que você pode fazer',
      secao: 'Tabela Grátis × Assinante',
    },
    comparativoColunaGratis: { rotulo: 'Título da coluna Grátis', padrao: 'Grátis', secao: 'Tabela Grátis × Assinante' },
    comparativoColunaAssinante: {
      rotulo: 'Título da coluna Assinante',
      padrao: 'Assinante',
      secao: 'Tabela Grátis × Assinante',
    },
    comparativoFotosItem: { rotulo: 'Linha 1: o que é', padrao: 'Fotos por anúncio', secao: 'Tabela Grátis × Assinante' },
    comparativoFotosGratis: { rotulo: 'Linha 1: conta grátis', padrao: '1', secao: 'Tabela Grátis × Assinante' },
    comparativoFotosAssinante: {
      rotulo: 'Linha 1: assinante',
      padrao: 'até {fotos}',
      secao: 'Tabela Grátis × Assinante',
      ajuda: 'Use {fotos} para o número máximo de fotos.',
    },
    comparativoVideosItem: { rotulo: 'Linha 2: o que é', padrao: 'Vídeos por anúncio', secao: 'Tabela Grátis × Assinante' },
    comparativoVideosGratis: { rotulo: 'Linha 2: conta grátis', padrao: 'não', secao: 'Tabela Grátis × Assinante' },
    comparativoVideosAssinante: {
      rotulo: 'Linha 2: assinante',
      padrao: 'até {videos}',
      secao: 'Tabela Grátis × Assinante',
      ajuda: 'Use {videos} para o número máximo de vídeos.',
    },
    comparativoAnunciosItem: {
      rotulo: 'Linha 3: o que é',
      padrao: 'Ver anúncios do ClassiSex',
      secao: 'Tabela Grátis × Assinante',
    },
    comparativoAnunciosGratis: {
      rotulo: 'Linha 3: conta grátis',
      padrao: 'todos, sem contato',
      secao: 'Tabela Grátis × Assinante',
    },
    comparativoAnunciosAssinante: {
      rotulo: 'Linha 3: assinante',
      padrao: 'todos, com contato, fotos e vídeos',
      secao: 'Tabela Grátis × Assinante',
    },
    comparativoContosItem: {
      rotulo: 'Linha 4: o que é',
      padrao: 'Contos e Dicas Hot completos',
      secao: 'Tabela Grátis × Assinante',
    },
    comparativoContosGratis: { rotulo: 'Linha 4: conta grátis', padrao: 'só o início', secao: 'Tabela Grátis × Assinante' },
    comparativoContosAssinante: { rotulo: 'Linha 4: assinante', padrao: 'sim', secao: 'Tabela Grátis × Assinante' },
    comparativoBotaoAssine: { rotulo: 'Botão principal', padrao: 'Assine Já', secao: 'Tabela Grátis × Assinante' },
    comparativoBotaoCadastro: {
      rotulo: 'Botão de criar conta',
      padrao: 'Criar conta grátis',
      secao: 'Tabela Grátis × Assinante',
    },

    // Planos
    semPlanosTitulo: { rotulo: 'Título quando não há planos', padrao: 'Planos', secao: 'Planos' },
    semPlanosTexto: {
      rotulo: 'Texto quando não há planos',
      padrao: 'Os planos estão sendo atualizados. Fale com a gente pelo WhatsApp.',
      secao: 'Planos',
    },
    semPlanosBotao: { rotulo: 'Botão quando não há planos', padrao: 'Fale com a gente', secao: 'Planos' },
    cartaoDe: {
      rotulo: 'Preço antigo (quando há promoção)',
      padrao: 'de {preco}',
      secao: 'Planos',
      ajuda: 'Use {preco} para o valor.',
    },
    cartaoPor: {
      rotulo: 'Preço promocional',
      padrao: 'por {preco}',
      secao: 'Planos',
      ajuda: 'Use {preco} para o valor.',
    },
    cartaoPagar: { rotulo: 'Botão de pagar', padrao: 'Pagar', secao: 'Planos' },
    cartaoWhatsapp: { rotulo: 'Botão de combinar pelo WhatsApp', padrao: 'Combinar pelo WhatsApp', secao: 'Planos' },
    cartaoWhatsappMensagem: {
      rotulo: 'Mensagem que abre no WhatsApp ao escolher um plano',
      padrao: 'Olá! Quero assinar o plano {plano}.',
      secao: 'Planos',
      ajuda: 'Use {plano} para o nome do plano.',
    },

    // Como assinar
    comoTitulo: { rotulo: 'Título', padrao: 'Como assinar', secao: 'Como assinar' },
    comoPasso1Antes: {
      rotulo: 'Passo 1 (com cadastro pelo site): antes do link',
      padrao: 'Crie sua conta grátis em',
      secao: 'Como assinar',
    },
    comoPasso1Link: {
      rotulo: 'Passo 1 (com cadastro pelo site): texto do link',
      padrao: '/cadastro',
      secao: 'Como assinar',
    },
    comoPasso1Depois: {
      rotulo: 'Passo 1 (com cadastro pelo site): depois do link',
      padrao: '— ou entre, se já tem.',
      secao: 'Como assinar',
    },
    comoPasso1SemCadastro: {
      rotulo: 'Passo 1 (cadastro pelo site fechado)',
      padrao: 'Envie seu nome e e-mail pelo WhatsApp; a equipe cria sua conta.',
      secao: 'Como assinar',
    },
    comoPasso2: { rotulo: 'Passo 2', padrao: 'Escolha o plano e pague pelo link do PagBank.', secao: 'Como assinar' },
    comoPasso3: {
      rotulo: 'Passo 3',
      padrao: 'Envie o comprovante pelo WhatsApp com o e-mail da sua conta.',
      secao: 'Como assinar',
    },
    comoPasso4: {
      rotulo: 'Passo 4',
      padrao: 'A equipe libera a assinatura na sua conta (sem senha nova).',
      secao: 'Como assinar',
    },
    comoBotaoComprovante: {
      rotulo: 'Botão de enviar comprovante',
      padrao: 'Enviar comprovante pelo WhatsApp',
      secao: 'Como assinar',
    },
    comprovanteMensagem: {
      rotulo: 'Mensagem que abre no WhatsApp ao enviar o comprovante',
      padrao: 'Olá! Fiz o pagamento da assinatura e vou enviar o comprovante. Meu nome: … Meu e-mail: …',
      secao: 'Como assinar',
    },
    comoBotaoEntrar: { rotulo: 'Botão de entrar', padrao: 'Já é assinante? Entrar', secao: 'Como assinar' },

    // Chamada nos contos e no ClassiSex
    ctaBotao: {
      rotulo: 'Botão verde da chamada "Assine Já"',
      padrao: 'Assine Já',
      secao: 'Chamada nas prévias (contos, ClassiSex e Dicas Hot)',
      ajuda: 'O título e o texto de cada chamada ficam na área da própria página.',
    },
    ctaJaSouAssinante: {
      rotulo: 'Link "Já sou assinante"',
      padrao: 'Já sou assinante',
      secao: 'Chamada nas prévias (contos, ClassiSex e Dicas Hot)',
    },
  },
})
