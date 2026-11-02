/*
 * Cliente da API REST em Flask (backend/app.py) — comunicação entre as camadas (seção 4.9.4).
 * React -> HTTP/JSON -> Flask -> MySQL, Cloud Firestore ou arquivo dados.json.
 *
 * O app é "offline-first": tudo é salvo primeiro no aparelho e as alterações entram numa
 * fila que é enviada ao servidor quando ele está disponível (RNF07, seção 9.4).
 */

const BASE: string = import.meta.env.VITE_API_URL ?? `${location.protocol}//${location.hostname}:5000/api`
const CHAVE_TOKEN = 'minha-voz:token'
const CHAVE_FILA = 'minha-voz:fila'

export interface Operacao {
  metodo: 'PUT' | 'POST' | 'DELETE'
  caminho: string
  corpo?: unknown
}

export interface Resposta<T = unknown> {
  ok: boolean
  status: number
  dados: T
}

export class SemConexao extends Error {}

function ler<T>(chave: string, padrao: T): T {
  try {
    const v = localStorage.getItem(chave)
    return v ? (JSON.parse(v) as T) : padrao
  } catch {
    return padrao
  }
}
function gravar(chave: string, valor: unknown) {
  try {
    if (valor === null) localStorage.removeItem(chave)
    else localStorage.setItem(chave, JSON.stringify(valor))
  } catch {
    /* sem armazenamento */
  }
}

export const enderecoApi = BASE
export const obterToken = (): string | null => ler<string | null>(CHAVE_TOKEN, null)
export const definirToken = (t: string | null) => gravar(CHAVE_TOKEN, t)

export async function requisicao<T = unknown>(metodo: string, caminho: string, corpo?: unknown, tempoLimite = 5000): Promise<Resposta<T>> {
  const controle = new AbortController()
  const timer = setTimeout(() => controle.abort(), tempoLimite)
  const token = obterToken()
  try {
    const resp = await fetch(BASE + caminho, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: controle.signal,
    })
    const texto = await resp.text()
    let dados: unknown = null
    try {
      dados = texto ? JSON.parse(texto) : null
    } catch {
      dados = texto
    }
    return { ok: resp.ok, status: resp.status, dados: dados as T }
  } catch {
    throw new SemConexao('Servidor indisponível')
  } finally {
    clearTimeout(timer)
  }
}

/** GET /api/saude — o servidor Flask está ligado? */
export async function servidorDisponivel(): Promise<boolean> {
  // Na prévia online não há API Flask: o app fica no "Modo local".
  if (import.meta.env.VITE_PREVIA === '1') return false
  if (typeof navigator !== 'undefined' && !navigator.onLine && !/localhost|127\.0\.0\.1/.test(BASE)) return false
  try {
    const r = await requisicao<{ status: string }>('GET', '/saude', undefined, 1500)
    return r.ok && r.dados?.status === 'ok'
  } catch {
    return false
  }
}

// ---------------- Fila de sincronização ----------------

export const filaPendente = (): Operacao[] => ler<Operacao[]>(CHAVE_FILA, [])

export function enfileirar(ops: Operacao[]) {
  if (ops.length) gravar(CHAVE_FILA, [...filaPendente(), ...ops])
}

export function limparFila() {
  gravar(CHAVE_FILA, null)
}

let descarregando = false

/**
 * Envia a fila na ordem. Para no primeiro erro de rede (tenta de novo depois).
 * Retorna 'sessao-expirada' se o servidor pedir login novamente.
 */
export async function descarregarFila(): Promise<'ok' | 'sem-conexao' | 'sessao-expirada' | 'ocupado'> {
  if (descarregando) return 'ocupado'
  if (!obterToken()) return 'sessao-expirada'
  descarregando = true
  try {
    let fila = filaPendente()
    while (fila.length) {
      const op = fila[0]
      try {
        const r = await requisicao(op.metodo, op.caminho, op.corpo)
        if (r.status === 401) return 'sessao-expirada'
        if (!r.ok) console.warn('Operação recusada pelo servidor e descartada:', op, r.dados)
      } catch {
        return 'sem-conexao'
      }
      fila = filaPendente().slice(1)
      gravar(CHAVE_FILA, fila)
    }
    return 'ok'
  } finally {
    descarregando = false
  }
}
