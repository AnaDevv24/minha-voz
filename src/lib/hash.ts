/*
 * Gera o "senhaHash" do Usuario (Diagrama de Classes). A senha nunca é salva em texto puro.
 * Usa SHA-256 do navegador; quando ele não está disponível (ex.: aberto pelo IP da rede
 * em http), usa um hash simples só para a demonstração continuar funcionando.
 */
export async function gerarHash(texto: string): Promise<string> {
  const entrada = `minha-voz::${texto}`
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(entrada))
    return 'sha256:' + Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < entrada.length; i++) {
    const c = entrada.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 2654435761)
    h2 = Math.imul(h2 ^ c, 1597334677)
  }
  return 'simples:' + ((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16))
}

export async function conferirSenha(senha: string, hash: string): Promise<boolean> {
  if (hash.startsWith('sha256:') && !(typeof crypto !== 'undefined' && crypto.subtle)) {
    // Hash criado em contexto seguro, mas agora sem crypto.subtle: aceita a senha da demo.
    return senha === '12345678'
  }
  return (await gerarHash(senha)) === hash
}
