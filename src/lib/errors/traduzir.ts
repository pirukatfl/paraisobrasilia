import {
  MENSAGEM_ARQUIVO_GRANDE,
  MENSAGEM_INESPERADA,
  MENSAGEM_MUITAS_TENTATIVAS,
  MENSAGEM_NAO_ENCONTRADO,
  MENSAGEM_PERMISSAO,
  MENSAGEM_SESSAO,
} from './mensagens'

/** English phrases Payload (and the browser) can put in front of the user, by lowercase text without the final dot. */
const FRASES: Record<string, string> = {
  'something went wrong': MENSAGEM_INESPERADA,
  'an unknown error occurred': MENSAGEM_INESPERADA,
  'an error has occurred': MENSAGEM_INESPERADA,
  'an error occurred': MENSAGEM_INESPERADA,
  'internal server error': MENSAGEM_INESPERADA,
  'there was an error initializing payload':
    'O sistema não conseguiu iniciar agora. Tente de novo em instantes; se continuar, avise a equipe.',
  'you are not allowed to perform this action': MENSAGEM_PERMISSAO,
  forbidden: MENSAGEM_PERMISSAO,
  unauthorized: MENSAGEM_SESSAO,
  'you must be logged in to perform this action': MENSAGEM_SESSAO,
  'the email or password provided is incorrect': 'E-mail ou senha incorretos.',
  'the requested resource was not found': MENSAGEM_NAO_ENCONTRADO,
  'not found': MENSAGEM_NAO_ENCONTRADO,
  'value must be unique': 'Este valor já está em uso. Troque e tente de novo.',
  'value must be a valid email': 'Informe um e-mail válido.',
  'this field is required': 'Este campo é obrigatório.',
  'file size limit has been reached': MENSAGEM_ARQUIVO_GRANDE,
  'too many requests': MENSAGEM_MUITAS_TENTATIVAS,
  'failed to fetch': 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
  'load failed': 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
  'networkerror when attempting to fetch resource': 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
  'bad request': 'Os dados enviados não são válidos. Confira o formulário e tente de novo.',
  'unexpected token': MENSAGEM_INESPERADA,
}

const CAMPOS_INVALIDOS = /^the following fields? (?:is|are) invalid:?\s*(.*)$/i
const LOCKED = /^this user is locked due to having too many failed login attempts/i

/**
 * Turns the English phrases Payload may send into Portuguese. Text that is already in
 * Portuguese (or unknown) goes through untouched.
 */
export function traduzirMensagem(texto: string): string {
  const limpo = texto.trim()
  const campos = CAMPOS_INVALIDOS.exec(limpo)
  if (campos) {
    const lista = campos[1].replace(/\.$/, '').trim()
    return lista ? `Confira os campos: ${lista}.` : 'Confira os campos do formulário.'
  }
  if (LOCKED.test(limpo)) return 'Conta bloqueada por muitas tentativas de entrada. Espere alguns minutos e tente de novo.'
  const chave = limpo.replace(/\.+$/, '').toLowerCase()
  if (FRASES[chave]) return FRASES[chave]
  if (chave.startsWith('unexpected token') || /is not valid json/.test(chave)) return MENSAGEM_INESPERADA
  return texto
}
