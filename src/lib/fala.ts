/*
 * Síntese de voz com a Web Speech API (seção 9.6 do TCC).
 * O texto é falado pelo próprio aparelho (computação de borda): nada vai para a internet,
 * a resposta é imediata (RNF03 < 3 s) e funciona offline quando o sistema tem vozes locais.
 */
import type { PreferenciaVoz } from '../types'

export interface OpcoesFala {
  preferencia?: PreferenciaVoz
  velocidade?: number
  tom?: number
  vozFeminina?: string
  vozMasculina?: string
}

// Nomes comuns de vozes pt-BR nos sistemas (Windows, Android, macOS/iOS, Chrome).
const PISTAS_FEMININAS = ['francisca', 'maria', 'luciana', 'female', 'feminina', 'thalita', 'vitoria', 'vitória', 'fernanda', 'joana', 'google português']
const PISTAS_MASCULINAS = ['antonio', 'antônio', 'daniel', 'felipe', 'male', 'masculina', 'donato', 'fabio', 'fábio', 'humberto', 'julio', 'ricardo']

export function falaSuportada(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

let vozesCache: SpeechSynthesisVoice[] = []

export function carregarVozes(): Promise<SpeechSynthesisVoice[]> {
  if (!falaSuportada()) return Promise.resolve([])
  const atuais = window.speechSynthesis.getVoices()
  if (atuais.length) {
    vozesCache = atuais
    return Promise.resolve(atuais)
  }
  return new Promise((resolve) => {
    const pronto = () => {
      vozesCache = window.speechSynthesis.getVoices()
      resolve(vozesCache)
    }
    window.speechSynthesis.addEventListener('voiceschanged', pronto, { once: true })
    setTimeout(pronto, 1500)
  })
}

export function vozesPortugues(vozes = vozesCache): SpeechSynthesisVoice[] {
  const br = vozes.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('pt-br'))
  return br.length ? br : vozes.filter((v) => v.lang.toLowerCase().startsWith('pt'))
}

function escolherVoz(op: OpcoesFala): SpeechSynthesisVoice | undefined {
  const pt = vozesPortugues()
  if (!pt.length) return undefined
  const nomeFixo = op.preferencia === 'Masculina' ? op.vozMasculina : op.vozFeminina
  if (nomeFixo) {
    const fixa = pt.find((v) => v.name === nomeFixo)
    if (fixa) return fixa
  }
  const pistas = op.preferencia === 'Masculina' ? PISTAS_MASCULINAS : PISTAS_FEMININAS
  return pt.find((v) => pistas.some((p) => v.name.toLowerCase().includes(p))) ?? pt[0]
}

/** Fala o texto em português do Brasil. Interrompe qualquer fala anterior. */
export function falar(texto: string, op: OpcoesFala = {}): boolean {
  if (!falaSuportada() || !texto.trim()) return false
  const synth = window.speechSynthesis
  synth.cancel()
  const fala = new SpeechSynthesisUtterance(texto)
  fala.lang = 'pt-BR'
  const voz = escolherVoz(op)
  if (voz) fala.voice = voz
  fala.rate = op.velocidade ?? 0.95
  // Sem uma voz masculina instalada, um tom mais grave ajuda a diferenciar.
  const semVozMasculina = op.preferencia === 'Masculina' && voz && !PISTAS_MASCULINAS.some((p) => voz.name.toLowerCase().includes(p))
  fala.pitch = (op.tom ?? 1) * (semVozMasculina ? 0.75 : 1)
  synth.speak(fala)
  return true
}

export function pararFala() {
  if (falaSuportada()) window.speechSynthesis.cancel()
}

if (falaSuportada()) void carregarVozes()
