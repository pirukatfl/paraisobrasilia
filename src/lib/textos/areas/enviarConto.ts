import { definirArea } from '../tipos'

export const enviarConto = definirArea({
  slug: 'textos-enviar-conto',
  rotulo: 'Enviar conto',
  descricao: 'Página e formulário para qualquer pessoa enviar um conto, e a confirmação de envio.',
  campos: {
    // Página Enviar um conto
    googleTitulo: { soTexto: true, rotulo: 'Título no Google', padrao: 'Enviar um conto', secao: 'Página Enviar um conto' },
    topo: { rotulo: 'Linha pequena acima do título', padrao: 'Contos', secao: 'Página Enviar um conto' },
    titulo: { rotulo: 'Título da página', padrao: 'Enviar um conto', secao: 'Página Enviar um conto' },
    intro: {
      bloco: true,
      rotulo: 'Texto de abertura',
      padrao:
        'Qualquer pessoa pode enviar, sem cadastro. O conto aparece depois da análise da equipe: todo mundo lê o começo; o conto completo é só para assinantes. Telefone, e-mail, @ e links não são aceitos.',
      secao: 'Página Enviar um conto',
    },

    // Formulário
    obrigatorio: { rotulo: 'Marca de campo obrigatório', padrao: '(obrigatório)', secao: 'Formulário' },
    tituloRotulo: { rotulo: 'Campo: Título', padrao: 'Título', secao: 'Formulário' },
    assinadoRotulo: { rotulo: 'Campo: Assinado como', padrao: 'Assinado como (opcional)', secao: 'Formulário' },
    assinadoAjuda: {
      rotulo: 'Ajuda de Assinado como',
      padrao: 'Aparece como “por …” quando o conto for publicado. Sem telefone, e-mail, @ ou link.',
      secao: 'Formulário',
    },
    contoRotulo: { rotulo: 'Campo: Conto', padrao: 'Conto', secao: 'Formulário' },
    contoAjuda: {
      bloco: true,
      rotulo: 'Ajuda do campo Conto',
      padrao:
        'De {min} a {max} caracteres. Deixe uma linha em branco entre os parágrafos. Telefone, e-mail, @ e links são recusados.',
      secao: 'Formulário',
      ajuda: 'Use {min} e {max} para o mínimo e o máximo de caracteres.',
    },
    emailRotulo: { rotulo: 'Campo: e-mail', padrao: 'Seu e-mail (opcional)', secao: 'Formulário' },
    emailAjuda: {
      rotulo: 'Ajuda do e-mail',
      padrao: 'Opcional, para a equipe falar com você se precisar. Só a equipe vê.',
      secao: 'Formulário',
    },
    imagemRotulo: { rotulo: 'Imagem: título do campo', padrao: 'Imagem (opcional)', secao: 'Formulário' },
    imagemAjuda: {
      bloco: true,
      rotulo: 'Imagem: ajuda',
      padrao:
        '1 imagem JPG, PNG ou WebP, até 15 MB. Aparece na lista e no conto, para todo mundo: sem nudez explícita e sem contatos. Só é mostrada depois da aprovação.',
      secao: 'Formulário',
    },
    imagemEscolher: { rotulo: 'Imagem: botão Escolher', padrao: 'Escolher imagem', secao: 'Formulário' },
    imagemTrocar: { rotulo: 'Imagem: botão Trocar', padrao: 'Trocar imagem', secao: 'Formulário' },
    imagemTirar: { rotulo: 'Imagem: botão Tirar', padrao: 'Tirar imagem', secao: 'Formulário' },
    consentimento: {
      rotulo: 'Termo de consentimento (caixa de marcar)',
      padrao:
        'Tenho 18 anos ou mais, o conto é de minha autoria, e a imagem (se houver) é minha ou tenho autorização, sem nudez explícita e sem contatos.',
      secao: 'Formulário',
    },
    termosAntes: { rotulo: 'Termos: início da frase', padrao: 'Li e aceito os', secao: 'Formulário' },
    termosLink: { rotulo: 'Termos: link dos Termos de Uso', padrao: 'Termos de Uso', secao: 'Formulário' },
    termosE: { rotulo: 'Termos: palavra entre os links', padrao: 'e a', secao: 'Formulário' },
    termosPolitica: { rotulo: 'Termos: link da Política de Privacidade', padrao: 'Política de Privacidade', secao: 'Formulário' },
    aviso: {
      bloco: true,
      rotulo: 'Aviso antes de enviar',
      padrao: 'Depois de enviar, não dá para editar nem apagar o conto. Ele só aparece no site depois que a equipe aprovar.',
      secao: 'Formulário',
    },
    botao: { rotulo: 'Botão de envio', padrao: 'Enviar para aprovação', secao: 'Formulário' },
    botaoEnviando: { rotulo: 'Botão de envio: enquanto envia', padrao: 'Enviando…', secao: 'Formulário' },

    // Conto recebido
    enviadoGoogleTitulo: { soTexto: true, rotulo: 'Título no Google (conto recebido)', padrao: 'Conto recebido', secao: 'Conto recebido' },
    enviadoTopo: { rotulo: 'Linha pequena acima do título', padrao: 'Contos', secao: 'Conto recebido' },
    enviadoTitulo: { rotulo: 'Título da página', padrao: 'Recebemos seu conto', secao: 'Conto recebido' },
    enviadoTexto: {
      rotulo: 'Texto',
      padrao: 'Recebemos seu conto. Ele aparece no site depois que a equipe aprovar.',
      secao: 'Conto recebido',
    },
    enviadoBotaoContos: { rotulo: 'Botão Ver os contos', padrao: 'Ver os contos', secao: 'Conto recebido' },
    enviadoBotaoConta: { rotulo: 'Botão Criar conta', padrao: 'Criar conta gratuita', secao: 'Conto recebido' },
  },
})
