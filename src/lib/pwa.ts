/*
 * Instalação do PWA (A2HS — Add to Home Screen, seção 9.4).
 * O Chrome/Edge disparam "beforeinstallprompt"; guardamos o evento para o botão
 * "Instalar aplicativo". No iPhone a instalação é pelo menu Compartilhar do Safari.
 */
interface EventoInstalacao extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let evento: EventoInstalacao | null = null
const ouvintes = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    evento = e as EventoInstalacao
    ouvintes.forEach((f) => f())
  })
  window.addEventListener('appinstalled', () => {
    evento = null
    ouvintes.forEach((f) => f())
  })
}

export const podeInstalar = () => !!evento
export const jaInstalado = () =>
  typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true)
export const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

export function aoMudarInstalacao(f: () => void) {
  ouvintes.add(f)
  return () => {
    ouvintes.delete(f)
  }
}

export async function instalar(): Promise<boolean> {
  if (!evento) return false
  await evento.prompt()
  const { outcome } = await evento.userChoice
  evento = null
  ouvintes.forEach((f) => f())
  return outcome === 'accepted'
}
