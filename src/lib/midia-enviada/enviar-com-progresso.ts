/**
 * POST a FormData and report the upload progress (fetch cannot). Always resolves with the status and the JSON
 * body (null when the answer is not JSON, e.g. an error page from a proxy); rejects only when the network fails.
 */
export function enviarComProgresso(
  url: string,
  body: FormData,
  onProgress: (fraction: number) => void,
): Promise<{ status: number; json: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(Math.min(1, event.loaded / event.total))
    }
    xhr.onload = () => {
      let json: unknown = null
      try {
        json = JSON.parse(xhr.responseText)
      } catch {
        json = null
      }
      resolve({ status: xhr.status, json })
    }
    xhr.onerror = () => reject(new Error('rede'))
    xhr.ontimeout = () => reject(new Error('rede'))
    xhr.send(body)
  })
}

/** Message for an answer that is not the JSON the route handlers send (proxy/server page). */
export function mensagemDeStatus(status: number): string {
  if (status === 413) return 'O arquivo passa do tamanho aceito. Envie um vídeo de até 100 MB.'
  if (status === 408 || status === 504 || status === 524) return 'O envio demorou demais e foi cortado. Tente de novo com uma conexão melhor.'
  return 'Não foi possível enviar o arquivo por um erro inesperado no servidor. Tente de novo; se continuar, avise a equipe.'
}
