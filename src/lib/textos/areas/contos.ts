import { definirArea } from '../tipos'

export const contos = definirArea({
  slug: 'textos-contos',
  rotulo: 'Contos',
  descricao: 'Lista de contos, página de cada conto e a área de contos dos assinantes.',
  campos: {
    // Lista pública
    googleLista: {
      soTexto: true,
      rotulo: 'Título no Google (lista de contos)',
      padrao: 'Contos',
      secao: 'Lista de contos (aberta ao público)',
    },
    googleListaDescricao: {
      bloco: true,
      soTexto: true,
      rotulo: 'Descrição no Google (lista de contos)',
      padrao: 'Contos eróticos do Paraíso Brasília. Leia o começo de cada um; o restante é para assinantes.',
      secao: 'Lista de contos (aberta ao público)',
    },
    listaEyebrow: { rotulo: 'Palavrinha acima do título', padrao: 'Leitura', secao: 'Lista de contos (aberta ao público)' },
    listaTitulo: { rotulo: 'Título da página', padrao: 'Contos', secao: 'Lista de contos (aberta ao público)' },
    listaIntro: {
      bloco: true,
      rotulo: 'Texto de apresentação',
      padrao:
        'Leia o começo de cada conto. O restante é só para assinantes. Qualquer pessoa pode enviar o seu: ele aparece depois que a equipe aprovar.',
      secao: 'Lista de contos (aberta ao público)',
    },
    listaLinkAssinante: {
      rotulo: 'Link para assinantes',
      padrao: 'Já é assinante? Ler os contos completos',
      secao: 'Lista de contos (aberta ao público)',
    },
    listaLinkEnviar: { rotulo: 'Link para enviar um conto', padrao: 'Enviar um conto', secao: 'Lista de contos (aberta ao público)' },
    listaVazioTitulo: {
      rotulo: 'Título quando não há contos',
      padrao: 'Nenhum conto publicado ainda.',
      secao: 'Lista de contos (aberta ao público)',
    },
    listaVazioTexto: {
      bloco: true,
      rotulo: 'Texto quando não há contos',
      padrao: 'Em breve novos contos. Assinantes leem tudo na área do assinante.',
      secao: 'Lista de contos (aberta ao público)',
    },
    listaVazioBotao: { rotulo: 'Botão quando não há contos', padrao: 'Assine Já', secao: 'Lista de contos (aberta ao público)' },
    listaCtaTitulo: {
      rotulo: 'Chamada para assinar: título',
      padrao: 'Contos completos para assinantes',
      secao: 'Lista de contos (aberta ao público)',
    },
    listaCtaTexto: {
      bloco: true,
      rotulo: 'Chamada para assinar: texto',
      padrao: 'Assine para ler cada conto do começo ao fim, ver o ClassiSex e trocar mensagens.',
      secao: 'Lista de contos (aberta ao público)',
    },

    // Conto aberto
    googleContoNaoEncontrado: {
      soTexto: true,
      rotulo: 'Título no Google quando o conto não existe',
      padrao: 'Conto não encontrado',
      secao: 'Página de um conto (aberta ao público)',
    },
    contoEyebrow: {
      rotulo: 'Palavrinha acima do título do conto',
      padrao: 'Contos',
      secao: 'Página de um conto (aberta ao público)',
      ajuda: 'Também usada na página do conto completo para assinantes.',
    },
    contoPor: {
      rotulo: 'Assinatura do autor',
      padrao: 'por {nome}',
      secao: 'Página de um conto (aberta ao público)',
      ajuda: 'Use {nome} para o apelido de quem escreveu. Também usada nos cartões da lista.',
    },
    contoCtaTitulo: {
      rotulo: 'Chamada para continuar lendo: título',
      padrao: 'Quer ler até o fim?',
      secao: 'Página de um conto (aberta ao público)',
    },
    contoCtaTexto: {
      bloco: true,
      rotulo: 'Chamada para continuar lendo: texto',
      padrao: 'Continue lendo: o restante deste conto é só para assinantes.',
      secao: 'Página de um conto (aberta ao público)',
    },
    contoCtaBotao: {
      rotulo: 'Link para assinantes lerem o conto completo',
      padrao: 'Já sou assinante: ler o conto completo',
      secao: 'Página de um conto (aberta ao público)',
    },
    contoVoltar: {
      rotulo: 'Link de voltar para os contos',
      padrao: 'Voltar para os contos',
      secao: 'Página de um conto (aberta ao público)',
      ajuda: 'Também usado na página do conto completo para assinantes.',
    },

    // Cartão
    cardLer: {
      rotulo: 'Link do cartão do conto',
      padrao: 'Ler: {titulo}',
      secao: 'Cartão de conto (nas listas)',
      ajuda: 'Use {titulo} para o título do conto.',
    },

    // Assinantes
    membrosEyebrow: { rotulo: 'Palavrinha acima do título', padrao: 'Área do assinante', secao: 'Contos para assinantes' },
    membrosGoogleLista: { soTexto: true, rotulo: 'Título no Google (lista)', padrao: 'Contos', secao: 'Contos para assinantes' },
    membrosTitulo: { rotulo: 'Título da lista', padrao: 'Contos', secao: 'Contos para assinantes' },
    membrosIntro: { rotulo: 'Texto da lista', padrao: 'Todos os contos, do começo ao fim.', secao: 'Contos para assinantes' },
    membrosVazioTitulo: {
      rotulo: 'Título quando não há contos',
      padrao: 'Nenhum conto publicado ainda.',
      secao: 'Contos para assinantes',
    },
    membrosVazioTexto: {
      bloco: true,
      rotulo: 'Texto quando não há contos',
      padrao: 'Volte em breve: a equipe publica contos novos.',
      secao: 'Contos para assinantes',
    },
    membrosGoogleConto: { soTexto: true, rotulo: 'Título no Google (conto completo)', padrao: 'Conto', secao: 'Contos para assinantes' },
  },
})
