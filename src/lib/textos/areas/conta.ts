import { definirArea } from '../tipos'

export const conta = definirArea({
  slug: 'textos-conta',
  rotulo: 'Entrar, cadastro e senha',
  descricao: 'Textos fixos das telas de entrar, cadastro, confirmação de e-mail e recuperação de senha.',
  campos: {
    // Comuns
    etiqueta: {
      rotulo: 'Frase pequena acima do título (todas as telas de conta)',
      padrao: 'Área do assinante',
      secao: 'Comuns',
    },
    campoEmail: { rotulo: 'Campo de e-mail', padrao: 'E-mail', secao: 'Comuns' },
    botaoWhatsapp: { rotulo: 'Botão "Chamar no WhatsApp"', padrao: 'Chamar no WhatsApp', secao: 'Comuns' },

    // Entrar
    entrarGoogleTitulo: { soTexto: true, rotulo: 'Título no Google', padrao: 'Entrar', secao: 'Entrar' },
    entrarGoogleDescricao: {
      soTexto: true,
      rotulo: 'Descrição no Google',
      padrao: 'Entrada da área de assinantes do Paraíso Brasília.',
      secao: 'Entrar',
    },
    entrarTitulo: { rotulo: 'Título da página', padrao: 'Entrar', secao: 'Entrar' },
    entrarConfirmado: {
      rotulo: 'Aviso depois de confirmar o e-mail',
      padrao: 'E-mail confirmado. Entre com seu e-mail e senha.',
      secao: 'Entrar',
    },
    entrarCampoSenha: { rotulo: 'Campo de senha', padrao: 'Senha', secao: 'Entrar' },
    entrarBotao: { rotulo: 'Botão de entrar', padrao: 'Entrar', secao: 'Entrar' },
    entrarEsqueci: { rotulo: 'Link "Esqueci minha senha"', padrao: 'Esqueci minha senha', secao: 'Entrar' },
    entrarSemEmail: {
      rotulo: 'Texto antes do link do WhatsApp',
      padrao: 'Se não receber o e-mail, fale com a equipe pelo WhatsApp:',
      secao: 'Entrar',
    },
    entrarEsqueciSemEmail: {
      bloco: true,
      rotulo: 'Texto de senha esquecida (envio de e-mail desligado)',
      padrao: 'Esqueceu a senha? Fale com a equipe pelo WhatsApp: ela envia um link para você criar uma nova.',
      secao: 'Entrar',
    },
    entrarCriarConta: { rotulo: 'Link de criar conta', padrao: 'Criar conta grátis', secao: 'Entrar' },
    entrarAssine: { rotulo: 'Link de assinar', padrao: 'Ainda não é assinante? Assine Já', secao: 'Entrar' },

    // Criar conta grátis
    cadastroGoogleTitulo: { soTexto: true, rotulo: 'Título no Google', padrao: 'Criar conta grátis', secao: 'Criar conta grátis' },
    cadastroGoogleDescricao: {
      soTexto: true,
      rotulo: 'Descrição no Google',
      padrao: 'Crie uma conta gratuita no Paraíso Brasília e publique seu anúncio no ClassiSex.',
      secao: 'Criar conta grátis',
    },
    cadastroTitulo: { rotulo: 'Título da página', padrao: 'Criar conta grátis', secao: 'Criar conta grátis' },
    cadastroFechado: {
      rotulo: 'Aviso de cadastro fechado',
      padrao: 'O cadastro pelo site está fechado no momento. Fale com a equipe pelo WhatsApp.',
      secao: 'Criar conta grátis',
    },
    cadastroEnviado: {
      bloco: true,
      rotulo: 'Aviso depois de enviar o cadastro',
      padrao:
        'Enviamos um link para o seu e-mail. Abra o link para ativar a conta (vale por 7 dias). Olhe também a caixa de spam.',
      secao: 'Criar conta grátis',
    },
    cadastroNaoRecebeu: { rotulo: 'Título "Não recebeu?"', padrao: 'Não recebeu?', secao: 'Criar conta grátis' },
    cadastroIntro: {
      bloco: true,
      rotulo: 'Texto acima do formulário',
      padrao:
        'Com a conta gratuita você publica seus anúncios no ClassiSex (até 3, com 1 foto cada). Assinantes veem todos os anúncios, com contatos, e mandam recados privados entre si.',
      secao: 'Criar conta grátis',
    },
    cadastroJaTem: { rotulo: 'Link para entrar', padrao: 'Já tem conta? Entrar', secao: 'Criar conta grátis' },
    formSenha: { rotulo: 'Formulário: campo de senha', padrao: 'Senha', secao: 'Criar conta grátis' },
    formSenhaDica: {
      rotulo: 'Formulário: dica da senha',
      padrao: 'Mínimo de 8 caracteres.',
      secao: 'Criar conta grátis',
    },
    formApelido: { rotulo: 'Formulário: campo de apelido', padrao: 'Apelido', secao: 'Criar conta grátis' },
    formApelidoDica: {
      rotulo: 'Formulário: dica do apelido',
      padrao: 'Como você aparece no site. Nunca use o nome verdadeiro, telefone ou e-mail.',
      secao: 'Criar conta grátis',
    },
    formMaior18: {
      rotulo: 'Formulário: caixa de maioridade',
      padrao: 'Tenho 18 anos ou mais',
      secao: 'Criar conta grátis',
    },
    formTermosAntes: {
      rotulo: 'Formulário: aceite, antes do primeiro link',
      padrao: 'Li e aceito os',
      secao: 'Criar conta grátis',
    },
    formTermosLink: {
      rotulo: 'Formulário: texto do link dos termos',
      padrao: 'Termos de Uso',
      secao: 'Criar conta grátis',
    },
    formTermosMeio: { rotulo: 'Formulário: aceite, entre os links', padrao: 'e a', secao: 'Criar conta grátis' },
    formPoliticaLink: {
      rotulo: 'Formulário: texto do link da política',
      padrao: 'Política de Privacidade',
      secao: 'Criar conta grátis',
    },
    formBotao: { rotulo: 'Formulário: botão', padrao: 'Criar conta grátis', secao: 'Criar conta grátis' },
    formEnviando: { rotulo: 'Formulário: botão enquanto envia', padrao: 'Enviando…', secao: 'Criar conta grátis' },

    // Confirmar e-mail
    confirmarGoogleTitulo: { soTexto: true, rotulo: 'Título no Google', padrao: 'Confirmar e-mail', secao: 'Confirmar e-mail' },
    confirmarTitulo: { rotulo: 'Título da página', padrao: 'Confirmar e-mail', secao: 'Confirmar e-mail' },
    confirmarLinkNovo: {
      rotulo: 'Texto para pedir um link novo',
      padrao: 'Digite o e-mail da conta para receber um link novo.',
      secao: 'Confirmar e-mail',
    },
    confirmarFalta: {
      rotulo: 'Texto acima do botão',
      padrao: 'Falta só um clique para ativar a sua conta gratuita.',
      secao: 'Confirmar e-mail',
    },
    confirmarBotao: { rotulo: 'Botão de confirmar', padrao: 'Confirmar meu e-mail', secao: 'Confirmar e-mail' },
    confirmarIrEntrar: { rotulo: 'Link para entrar', padrao: 'Ir para Entrar', secao: 'Confirmar e-mail' },
    reenviarCampo: { rotulo: 'Reenviar link: campo de e-mail', padrao: 'E-mail da conta', secao: 'Confirmar e-mail' },
    reenviarBotao: { rotulo: 'Reenviar link: botão', padrao: 'Reenviar link', secao: 'Confirmar e-mail' },

    // Esqueci minha senha
    esqueciGoogleTitulo: { soTexto: true, rotulo: 'Título no Google', padrao: 'Esqueci minha senha', secao: 'Esqueci minha senha' },
    esqueciGoogleDescricao: {
      soTexto: true,
      rotulo: 'Descrição no Google',
      padrao: 'Peça um link para criar uma nova senha da área de assinantes do Paraíso Brasília.',
      secao: 'Esqueci minha senha',
    },
    esqueciTitulo: { rotulo: 'Título da página', padrao: 'Esqueci minha senha', secao: 'Esqueci minha senha' },
    esqueciSemEmail: {
      rotulo: 'Texto (envio de e-mail desligado)',
      padrao: 'Fale com a equipe pelo WhatsApp: ela envia um link para você criar uma nova senha.',
      secao: 'Esqueci minha senha',
    },
    esqueciEnviado: {
      bloco: true,
      rotulo: 'Aviso depois de pedir o link',
      padrao: 'Se o e-mail existir, enviamos um link para criar uma nova senha. Olhe também a caixa de spam.',
      secao: 'Esqueci minha senha',
    },
    esqueciIntro: {
      rotulo: 'Texto acima do formulário',
      padrao: 'Digite o e-mail da sua conta. Enviaremos um link para criar uma nova senha.',
      secao: 'Esqueci minha senha',
    },
    esqueciBotao: { rotulo: 'Botão de enviar', padrao: 'Enviar link', secao: 'Esqueci minha senha' },
    esqueciVoltar: { rotulo: 'Link para voltar', padrao: 'Voltar para Entrar', secao: 'Esqueci minha senha' },

    // Criar nova senha
    novaGoogleTitulo: { soTexto: true, rotulo: 'Título no Google', padrao: 'Criar nova senha', secao: 'Criar nova senha' },
    novaTitulo: { rotulo: 'Título da página', padrao: 'Criar nova senha', secao: 'Criar nova senha' },
    novaAvisoCurta: {
      rotulo: 'Aviso para quem tinha senha curta',
      padrao: 'Sua senha do site antigo tem menos de 8 caracteres. Crie uma nova para continuar.',
      secao: 'Criar nova senha',
    },
    novaCampoNova: { rotulo: 'Campo da nova senha', padrao: 'Nova senha', secao: 'Criar nova senha' },
    novaCampoRepita: { rotulo: 'Campo de repetir a senha', padrao: 'Repita a nova senha', secao: 'Criar nova senha' },
    novaDica: { rotulo: 'Dica da senha', padrao: 'Use pelo menos 8 caracteres.', secao: 'Criar nova senha' },
    novaBotao: { rotulo: 'Botão de salvar', padrao: 'Salvar e entrar', secao: 'Criar nova senha' },
  },
})
