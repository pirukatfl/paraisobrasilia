import { definirArea } from '../tipos'

export const areaAssinante = definirArea({
  slug: 'textos-area-assinante',
  rotulo: 'Área do assinante',
  descricao: 'Textos fixos da área do assinante: início, minha assinatura, trocar senha e avisos de renovação.',
  campos: {
    // Início da área
    googleTitulo: { soTexto: true, rotulo: 'Título no Google', padrao: 'Área do assinante', secao: 'Início da área' },
    etiqueta: { rotulo: 'Frase pequena acima do título (início e trocar senha)', padrao: 'Área do assinante', secao: 'Início da área' },
    senhaAlterada: { rotulo: 'Aviso de senha alterada', padrao: 'Senha alterada.', secao: 'Início da área' },
    saudacao: {
      rotulo: 'Título da página',
      padrao: 'Olá, {nome}',
      secao: 'Início da área',
      ajuda: 'Use {nome} para o nome do assinante.',
    },
    minhaTitulo: { rotulo: 'Título "Minha assinatura"', padrao: 'Minha assinatura', secao: 'Início da área' },
    contaTitulo: {
      rotulo: 'Título "Sua conta" (conta grátis)',
      padrao: 'Sua conta: {tipo}',
      secao: 'Início da área',
      ajuda: 'Use {tipo} para o tipo da conta (veja o campo abaixo).',
    },
    contaTipoGratuita: { soTexto: true, rotulo: 'Nome da conta grátis', padrao: 'Conta gratuita', secao: 'Início da área' },
    contaTexto: {
      bloco: true,
      rotulo: 'Texto da conta grátis',
      padrao:
        'Você pode publicar até 3 anúncios com 1 foto cada. Também lê os anúncios dos outros, sem os contatos e só com a foto de capa. Para ver o contato, todas as fotos e os vídeos e para trocar recados, assine.',
      secao: 'Início da área',
    },
    contaBotaoAnuncios: { rotulo: 'Botão "Meus anúncios"', padrao: 'Meus anúncios', secao: 'Início da área' },
    dadosTitulo: { rotulo: 'Título "Dados da conta"', padrao: 'Dados da conta', secao: 'Início da área' },
    dadosEmail: {
      rotulo: 'Linha do e-mail',
      padrao: 'E-mail: {email}',
      secao: 'Início da área',
      ajuda: 'Use {email} para o e-mail do assinante.',
    },

    // Trocar senha
    senhaGoogleTitulo: { soTexto: true, rotulo: 'Título no Google', padrao: 'Trocar senha', secao: 'Trocar senha' },
    senhaTitulo: { rotulo: 'Título da página', padrao: 'Trocar senha', secao: 'Trocar senha' },
    senhaCampoAtual: { rotulo: 'Campo da senha atual', padrao: 'Senha atual', secao: 'Trocar senha' },
    senhaCampoNova: { rotulo: 'Campo da nova senha', padrao: 'Nova senha', secao: 'Trocar senha' },
    senhaCampoRepita: { rotulo: 'Campo de repetir a senha', padrao: 'Repita a nova senha', secao: 'Trocar senha' },
    senhaDica: { rotulo: 'Dica da senha', padrao: 'Use pelo menos 8 caracteres.', secao: 'Trocar senha' },
    senhaBotao: { rotulo: 'Botão de salvar', padrao: 'Salvar nova senha', secao: 'Trocar senha' },

    // Aviso de senha provisória
    provisoriaTexto: {
      rotulo: 'Aviso de senha provisória',
      padrao: 'Você está usando uma senha provisória.',
      secao: 'Aviso de senha provisória',
    },
    provisoriaLink: { rotulo: 'Link para trocar', padrao: 'Troque agora.', secao: 'Aviso de senha provisória' },

    // Painel Minha assinatura
    assAtivaAntes: { rotulo: 'Assinatura ativa: texto', padrao: 'Sua assinatura:', secao: 'Painel da assinatura' },
    assAtivaSelo: { rotulo: 'Assinatura ativa: palavra em destaque', padrao: 'Ativa', secao: 'Painel da assinatura' },
    assValidaAte: {
      rotulo: 'Assinatura ativa: validade',
      padrao: 'Válida até {data}',
      secao: 'Painel da assinatura',
      ajuda: 'Use {data} para a data de validade.',
    },
    assFalta1: { rotulo: 'Assinatura ativa: falta 1 dia', padrao: 'Falta 1 dia', secao: 'Painel da assinatura' },
    assFaltam: {
      rotulo: 'Assinatura ativa: faltam vários dias',
      padrao: 'Faltam {dias} dias',
      secao: 'Painel da assinatura',
      ajuda: 'Use {dias} para o número de dias.',
    },
    assVenceu: {
      rotulo: 'Assinatura vencida',
      padrao: 'Sua assinatura venceu em {data}.',
      secao: 'Painel da assinatura',
      ajuda: 'Use {data} para a data em que venceu.',
    },
    assRenovar: { rotulo: 'Botão de renovar', padrao: 'Renovar', secao: 'Painel da assinatura' },
    assSemAssinatura: {
      rotulo: 'Conta sem assinatura',
      padrao: 'Sua conta ainda não tem uma assinatura ativa.',
      secao: 'Painel da assinatura',
    },
    assVerPlanos: { rotulo: 'Botão de ver planos', padrao: 'Ver planos', secao: 'Painel da assinatura' },
    assEncerrada: {
      rotulo: 'Acesso encerrado pela equipe',
      padrao: 'Seu acesso foi encerrado pela equipe. Fale com a gente pelo WhatsApp.',
      secao: 'Painel da assinatura',
    },
    assWhatsapp: { rotulo: 'Botão do WhatsApp', padrao: 'Falar no WhatsApp', secao: 'Painel da assinatura' },

    // Faixa de renovação
    renovVenceu: {
      rotulo: 'Faixa: assinatura vencida',
      padrao: 'Sua assinatura venceu em {data}. Renove para voltar a ter acesso completo.',
      secao: 'Faixa de renovação (topo do site)',
      ajuda: 'Use {data} para a data em que venceu.',
    },
    renovVence: {
      rotulo: 'Faixa: assinatura perto de vencer',
      padrao: 'Sua assinatura vence em {data} ({quando}). Renove para não perder o acesso.',
      secao: 'Faixa de renovação (topo do site)',
      ajuda: 'Use {data} para a data e {quando} para "último dia" ou "faltam N dias".',
    },
    renovUltimoDia: { soTexto: true, rotulo: 'Faixa: "último dia"', padrao: 'último dia', secao: 'Faixa de renovação (topo do site)' },
    renovFaltam: {
      soTexto: true,
      rotulo: 'Faixa: "faltam N dias"',
      padrao: 'faltam {dias} dias',
      secao: 'Faixa de renovação (topo do site)',
      ajuda: 'Use {dias} para o número de dias.',
    },
    renovBotao: { rotulo: 'Faixa: botão', padrao: 'Renovar agora', secao: 'Faixa de renovação (topo do site)' },

    // Aviso nas páginas só para assinantes
    inativoTitulo: {
      rotulo: 'Título do aviso',
      padrao: 'Disponível para assinantes',
      secao: 'Aviso nas páginas só para assinantes',
    },
    inativoTexto: {
      bloco: true,
      rotulo: 'Texto do aviso (conta grátis)',
      padrao:
        'Com a conta gratuita você publica seus anúncios em Meus anúncios e lê os anúncios dos outros (sem os contatos e só com a foto de capa). Assine para ver o contato, todas as fotos e os vídeos e para mandar e receber recados.',
      secao: 'Aviso nas páginas só para assinantes',
    },
    inativoAssine: { rotulo: 'Botão "Assine Já"', padrao: 'Assine Já', secao: 'Aviso nas páginas só para assinantes' },
    inativoAnuncios: { rotulo: 'Botão "Meus anúncios"', padrao: 'Meus anúncios', secao: 'Aviso nas páginas só para assinantes' },
    inativoNaoAtiva: {
      rotulo: 'Título para assinatura vencida ou encerrada',
      padrao: 'Sua assinatura não está ativa',
      secao: 'Aviso nas páginas só para assinantes',
    },
  },
})
