import { definirArea } from '../tipos'

export const inicio = definirArea({
  slug: 'textos-inicio',
  rotulo: 'Página inicial',
  descricao: 'Textos fixos da página inicial: próximas festas, espaço, quem somos, dicas e como chegar.',
  campos: {
    // Topo
    chamadaTopo: {
      rotulo: 'Frase pequena acima do título',
      padrao: 'Casa de festas liberais em Brasília',
      secao: 'Topo da página',
    },
    tituloProximasFestas: {
      rotulo: 'Título da lista de próximas festas',
      padrao: 'Próximas festas',
      secao: 'Topo da página',
    },
    tituloSemFestas: {
      rotulo: 'Título grande quando não há festas',
      padrao: 'Paraíso Brasília',
      secao: 'Topo da página',
      ajuda: 'Aparece no lugar da lista de festas quando nenhuma festa está agendada.',
    },
    semFestasTitulo: {
      rotulo: 'Aviso quando não há festas',
      padrao: 'Nenhuma festa agendada no momento',
      secao: 'Topo da página',
    },
    semFestasTexto: {
      rotulo: 'Texto quando não há festas',
      padrao: 'A próxima programação será publicada aqui em breve. Volte nos próximos dias.',
      secao: 'Topo da página',
    },

    // Espaço
    espacoTitulo: { rotulo: 'Título da seção do espaço', padrao: 'Conheça o espaço', secao: 'Seção do espaço' },
    espacoBotao: { rotulo: 'Botão da galeria', padrao: 'Ver galeria completa', secao: 'Seção do espaço' },

    // Quem somos
    quemSomosTitulo: { rotulo: 'Título da seção Quem somos', padrao: 'Quem somos', secao: 'Seção Quem somos' },
    quemSomosTextoReserva: {
      rotulo: 'Texto de reserva de Quem somos',
      padrao: 'Uma casa de festas liberais com discrição, respeito e liberdade. Conheça o Paraíso.',
      secao: 'Seção Quem somos',
      ajuda: 'Só aparece se a página Quem somos estiver sem texto de abertura.',
    },
    quemSomosBotao: { rotulo: 'Botão da seção', padrao: 'Conheça a casa', secao: 'Seção Quem somos' },

    // Dicas
    dicasTitulo: { rotulo: 'Título da seção de dicas', padrao: 'Dicas Hot', secao: 'Seção Dicas Hot' },
    dicasBotao: { rotulo: 'Botão das dicas', padrao: 'Ver todas as Dicas Hot', secao: 'Seção Dicas Hot' },

    // Como chegar
    comoChegarTitulo: { rotulo: 'Título da seção Como chegar', padrao: 'Como chegar', secao: 'Seção Como chegar' },
    comoChegarBotao: { rotulo: 'Botão para a página de contato', padrao: 'Como chegar', secao: 'Seção Como chegar' },
    comoChegarWhatsapp: {
      rotulo: 'Link do WhatsApp',
      padrao: 'Chamar no WhatsApp',
      secao: 'Seção Como chegar',
    },
  },
})
