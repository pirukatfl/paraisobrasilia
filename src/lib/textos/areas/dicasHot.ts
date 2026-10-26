import { definirArea } from '../tipos'

export const dicasHot = definirArea({
  slug: 'textos-dicas-hot',
  rotulo: 'Dicas Hot',
  descricao: 'Lista de Dicas Hot, página de cada dica e a área de dicas dos assinantes.',
  campos: {
    // Lista pública
    googleLista: { rotulo: 'Título no Google (lista de dicas)', padrao: 'Dicas Hot', secao: 'Lista de dicas (aberta ao público)' },
    googleListaDescricao: {
      rotulo: 'Descrição no Google (lista de dicas)',
      padrao: 'Dicas Hot do Paraíso Brasília: swing, casais liberais, fetiches e prazer a dois, com respeito e sem tabu.',
      secao: 'Lista de dicas (aberta ao público)',
      longo: true,
    },
    listaEyebrow: { rotulo: 'Palavrinha acima do título', padrao: 'Leitura', secao: 'Lista de dicas (aberta ao público)' },
    listaTitulo: { rotulo: 'Título da página', padrao: 'Dicas Hot', secao: 'Lista de dicas (aberta ao público)' },
    listaIntro: {
      rotulo: 'Texto de apresentação',
      padrao: 'Textos sobre swing, casais liberais, fetiches e prazer a dois, com respeito e sem tabu.',
      secao: 'Lista de dicas (aberta ao público)',
      longo: true,
    },
    listaLinkAssinante: {
      rotulo: 'Link para assinantes',
      padrao: 'Já é assinante? Ler as Dicas Hot completas',
      secao: 'Lista de dicas (aberta ao público)',
    },
    listaVazioTitulo: {
      rotulo: 'Título quando não há dicas',
      padrao: 'Nenhuma dica publicada ainda.',
      secao: 'Lista de dicas (aberta ao público)',
    },
    listaVazioTexto: {
      rotulo: 'Texto quando não há dicas',
      padrao: 'Em breve novas dicas por aqui.',
      secao: 'Lista de dicas (aberta ao público)',
      longo: true,
    },
    listaVazioBotao: { rotulo: 'Botão quando não há dicas', padrao: 'Voltar para a home', secao: 'Lista de dicas (aberta ao público)' },
    listaCtaTitulo: {
      rotulo: 'Chamada para assinar: título',
      padrao: 'Dicas Hot completas para assinantes',
      secao: 'Lista de dicas (aberta ao público)',
    },
    listaCtaTexto: {
      rotulo: 'Chamada para assinar: texto',
      padrao: 'Assine para ler cada dica do começo ao fim, ver o ClassiSex e trocar mensagens.',
      secao: 'Lista de dicas (aberta ao público)',
      longo: true,
    },

    // Dica aberta
    googleDicaNaoEncontrada: {
      rotulo: 'Título no Google quando a dica não existe',
      padrao: 'Dica não encontrada',
      secao: 'Página de uma dica (aberta ao público)',
    },
    dicaEyebrow: {
      rotulo: 'Link acima do título da dica',
      padrao: 'Dicas Hot',
      secao: 'Página de uma dica (aberta ao público)',
      ajuda: 'Também usado na página da dica completa para assinantes.',
    },
    dicaCtaTitulo: {
      rotulo: 'Chamada para continuar lendo: título',
      padrao: 'Quer ler até o fim?',
      secao: 'Página de uma dica (aberta ao público)',
    },
    dicaCtaTexto: {
      rotulo: 'Chamada para continuar lendo: texto',
      padrao: 'Continue lendo: o restante desta dica é só para assinantes.',
      secao: 'Página de uma dica (aberta ao público)',
      longo: true,
    },
    dicaCtaBotao: {
      rotulo: 'Link para assinantes lerem a dica completa',
      padrao: 'Já sou assinante: ler a dica completa',
      secao: 'Página de uma dica (aberta ao público)',
    },
    leiaTambem: { rotulo: 'Título de "outras dicas"', padrao: 'Leia também', secao: 'Página de uma dica (aberta ao público)' },
    dicaVoltar: {
      rotulo: 'Link de voltar para as dicas',
      padrao: 'Voltar para as Dicas Hot',
      secao: 'Página de uma dica (aberta ao público)',
      ajuda: 'Também usado na página da dica completa para assinantes.',
    },

    // Cartão
    cardLer: {
      rotulo: 'Link do cartão da dica',
      padrao: 'Ler: {titulo}',
      secao: 'Cartão de dica (nas listas)',
      ajuda: 'Use {titulo} para o título da dica.',
    },

    // Assinantes
    membrosEyebrow: { rotulo: 'Palavrinha acima do título', padrao: 'Área do assinante', secao: 'Dicas Hot para assinantes' },
    membrosGoogleLista: { rotulo: 'Título no Google (lista)', padrao: 'Dicas Hot', secao: 'Dicas Hot para assinantes' },
    membrosTitulo: { rotulo: 'Título da lista', padrao: 'Dicas Hot', secao: 'Dicas Hot para assinantes' },
    membrosIntro: { rotulo: 'Texto da lista', padrao: 'Todas as dicas, do começo ao fim.', secao: 'Dicas Hot para assinantes' },
    membrosVazioTitulo: {
      rotulo: 'Título quando não há dicas',
      padrao: 'Nenhuma dica publicada ainda.',
      secao: 'Dicas Hot para assinantes',
    },
    membrosVazioTexto: {
      rotulo: 'Texto quando não há dicas',
      padrao: 'Volte em breve: a equipe publica dicas novas.',
      secao: 'Dicas Hot para assinantes',
      longo: true,
    },
    membrosGoogleDica: { rotulo: 'Título no Google (dica completa)', padrao: 'Dica Hot', secao: 'Dicas Hot para assinantes' },
  },
})
