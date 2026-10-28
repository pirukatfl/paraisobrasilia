import { definirArea } from '../tipos'

export const geral = definirArea({
  slug: 'textos-geral',
  rotulo: 'Menu, rodapé e avisos gerais',
  descricao: 'Menu do topo, rodapé, confirmação de maioridade (18+), página não encontrada, página de erro, galeria e paginação.',
  campos: {
    // Google (default)
    googleTitulo: {
      soTexto: true,
      rotulo: 'Título padrão no Google',
      padrao: 'Paraíso Brasília — Casa de festas liberais',
      secao: 'Google (padrão)',
      ajuda: 'Aparece na aba do navegador e no Google quando a página não tem título próprio.',
    },
    googleDescricao: {
      bloco: true,
      soTexto: true,
      rotulo: 'Descrição padrão no Google',
      padrao:
        'Festas liberais para casais e solteiros em Brasília. Veja a programação das próximas festas do Paraíso Brasília.',
      secao: 'Google (padrão)',
      ajuda: 'Texto que aparece abaixo do título nos resultados do Google.',
    },
    pularConteudo: {
      rotulo: 'Link "pular para o conteúdo"',
      padrao: 'Pular para o conteúdo',
      secao: 'Google (padrão)',
      ajuda: 'Só aparece para quem navega pelo teclado.',
    },

    // Menu
    menuBotao: { rotulo: 'Botão do menu no celular', padrao: 'Menu', secao: 'Menu' },
    menuFestas: { rotulo: 'Menu: Festas', padrao: 'Festas', secao: 'Menu', ajuda: 'Também usado no rodapé.' },
    menuQuemSomos: { rotulo: 'Menu: Quem somos', padrao: 'Quem somos', secao: 'Menu', ajuda: 'Também usado no rodapé.' },
    menuNormas: { rotulo: 'Menu: Normas', padrao: 'Normas', secao: 'Menu', ajuda: 'Também usado no rodapé.' },
    menuRegras: { rotulo: 'Menu: Regras', padrao: 'Regras', secao: 'Menu', ajuda: 'Também usado no rodapé.' },
    menuDicas: { rotulo: 'Menu: Dicas', padrao: 'Dicas', secao: 'Menu', ajuda: 'Também usado no rodapé.' },
    menuEspaco: { rotulo: 'Menu: Espaço', padrao: 'Espaço', secao: 'Menu', ajuda: 'Também usado no rodapé.' },
    menuModelos: {
      rotulo: 'Menu: Profissionais e amadoras',
      padrao: 'Profissionais e amadoras',
      secao: 'Menu',
      ajuda: 'Também usado no rodapé.',
    },
    menuClassisex: { rotulo: 'Menu: ClassiSex', padrao: 'ClassiSex', secao: 'Menu', ajuda: 'Também usado no rodapé.' },
    menuContos: { rotulo: 'Menu: Contos', padrao: 'Contos', secao: 'Menu', ajuda: 'Também usado no rodapé.' },
    menuDicasHot: { rotulo: 'Menu: Dicas Hot', padrao: 'Dicas Hot', secao: 'Menu', ajuda: 'Também usado no rodapé.' },
    menuContato: { rotulo: 'Menu: Contato', padrao: 'Contato', secao: 'Menu', ajuda: 'Também usado no rodapé.' },
    menuAssineJa: { rotulo: 'Menu: Assine Já', padrao: 'Assine Já', secao: 'Menu', ajuda: 'Também usado no rodapé.' },
    menuAreaAssinante: {
      rotulo: 'Menu: Área do assinante',
      padrao: 'Área do assinante',
      secao: 'Menu',
      ajuda: 'Também usado no rodapé.',
    },
    menuMeusAnuncios: {
      rotulo: 'Menu do assinante: Meus anúncios',
      padrao: 'Meus anúncios',
      secao: 'Menu',
      ajuda: 'Só aparece para quem está logado.',
    },
    menuMinhaAssinatura: {
      rotulo: 'Menu do assinante: Minha assinatura',
      padrao: 'Minha assinatura',
      secao: 'Menu',
      ajuda: 'Só aparece para quem está logado.',
    },
    menuTrocarSenha: {
      rotulo: 'Menu do assinante: Trocar senha',
      padrao: 'Trocar senha',
      secao: 'Menu',
      ajuda: 'Só aparece para quem está logado.',
    },
    menuSair: {
      rotulo: 'Menu do assinante: Sair',
      padrao: 'Sair',
      secao: 'Menu',
      ajuda: 'Só aparece para quem está logado.',
    },

    // Footer
    rodapeContatoTitulo: { rotulo: 'Título do bloco de contato', padrao: 'Contato', secao: 'Rodapé' },
    rodapeWhatsapp: { rotulo: 'Link do WhatsApp', padrao: 'Chamar no WhatsApp', secao: 'Rodapé' },
    rodapeInstagram: {
      rotulo: 'Link do Instagram',
      padrao: 'Instagram @{usuario}',
      secao: 'Rodapé',
      ajuda: 'Use {usuario} para o nome do perfil.',
    },
    rodapeNavegueTitulo: { rotulo: 'Título do bloco de navegação', padrao: 'Navegue', secao: 'Rodapé' },
    rodapeLegalTitulo: { rotulo: 'Título do bloco legal', padrao: 'Legal', secao: 'Rodapé' },
    rodapeTermos: { rotulo: 'Link dos Termos de Uso', padrao: 'Termos de Uso', secao: 'Rodapé' },
    rodapePrivacidade: { rotulo: 'Link da Política de Privacidade', padrao: 'Política de Privacidade', secao: 'Rodapé' },
    rodapeCopyright: {
      rotulo: 'Linha final do rodapé',
      padrao: '© {ano} Paraíso Brasília · Proibido para menores de 18 anos',
      secao: 'Rodapé',
      ajuda: 'Use {ano} para o ano atual (muda sozinho).',
    },

    // Age gate
    idadeTitulo: {
      rotulo: 'Título da confirmação',
      padrao: 'Conteúdo para maiores de 18 anos',
      secao: 'Confirmação 18+',
    },
    idadeTexto: {
      bloco: true,
      rotulo: 'Texto da confirmação',
      padrao:
        'O Paraíso Brasília é uma casa de festas liberais para adultos. Para continuar, confirme que você tem 18 anos ou mais.',
      secao: 'Confirmação 18+',
    },
    idadeBotaoEntrar: {
      rotulo: 'Botão de confirmar',
      padrao: 'Tenho 18 anos ou mais — Entrar',
      secao: 'Confirmação 18+',
    },
    idadeBotaoSair: { rotulo: 'Botão de sair', padrao: 'Sair do site', secao: 'Confirmação 18+' },

    // 404
    naoEncontradaTitulo: {
      rotulo: 'Título',
      padrao: 'Página não encontrada',
      secao: 'Página não encontrada',
    },
    naoEncontradaTexto: {
      rotulo: 'Texto',
      padrao: 'O endereço pode ter mudado ou a festa foi removida.',
      secao: 'Página não encontrada',
    },
    naoEncontradaBotao: {
      rotulo: 'Botão',
      padrao: 'Ver próximas festas',
      secao: 'Página não encontrada',
    },

    // Error page
    erroTitulo: {
      rotulo: 'Título',
      padrao: 'Algo deu errado ao abrir esta página.',
      secao: 'Página de erro',
    },
    erroTexto: {
      bloco: true,
      rotulo: 'Texto',
      padrao:
        'Pode ser uma instabilidade momentânea. Tente de novo em alguns instantes. Se continuar, avise a equipe informando o código abaixo.',
      secao: 'Página de erro',
    },
    erroCodigo: {
      rotulo: 'Linha do código do erro',
      padrao: 'Código: {codigo}',
      secao: 'Página de erro',
      ajuda: 'Use {codigo} para o código que a equipe técnica precisa.',
    },
    erroBotao: { rotulo: 'Botão de tentar de novo', padrao: 'Tentar de novo', secao: 'Página de erro' },
    erroVoltar: { rotulo: 'Link para voltar', padrao: 'Voltar ao início', secao: 'Página de erro' },

    // Gallery
    galeriaVideo: { rotulo: 'Etiqueta de vídeo nas miniaturas', padrao: 'Vídeo', secao: 'Galeria e fotos' },
    galeriaContador: {
      rotulo: 'Contador de fotos',
      padrao: '{n} de {total}',
      secao: 'Galeria e fotos',
      ajuda: 'Use {n} para a posição da foto e {total} para o total de fotos.',
    },
    galeriaVerFesta: {
      rotulo: 'Link para a festa na foto ampliada',
      padrao: 'Ver detalhes da festa',
      secao: 'Galeria e fotos',
    },

    // Pagination
    paginacaoAnteriores: { rotulo: 'Botão anterior', padrao: 'Anteriores', secao: 'Paginação' },
    paginacaoPagina: {
      rotulo: 'Texto da página atual',
      padrao: 'Página {pagina} de {total}',
      secao: 'Paginação',
      ajuda: 'Use {pagina} para a página atual e {total} para o total de páginas.',
    },
    paginacaoProximos: { rotulo: 'Botão seguinte', padrao: 'Próximos', secao: 'Paginação' },
  },
})
