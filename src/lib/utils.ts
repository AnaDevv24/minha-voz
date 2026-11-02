export function uid(prefixo = ''): string {
  const aleatorio =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefixo}${Date.now().toString(36)}${aleatorio}`
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function dataExtenso(d = new Date()): string {
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function tempoRelativo(iso: string | undefined): string {
  if (!iso) return 'nenhuma utilização ainda'
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.round(diff / 60000)
  if (min < 1) return 'agora mesmo'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} ${h === 1 ? 'hora' : 'horas'}`
  const dias = Math.round(h / 24)
  return `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`
}

export function saudacao(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export function baixarArquivo(nome: string, conteudo: string, tipo = 'text/plain') {
  const blob = new Blob([conteudo], { type: `${tipo};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function ehImagem(imagemUrl: string): boolean {
  return imagemUrl.startsWith('data:') || imagemUrl.startsWith('http') || imagemUrl.startsWith('/')
}
