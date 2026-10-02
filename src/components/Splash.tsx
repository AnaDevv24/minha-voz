import { ICONE } from '../lib/icone'
import { useEffect, useState } from 'react'

/** Tela inicial/splash: logo, frase e carregamento (aparece uma vez por sessão). */
export function Splash() {
  const [visivel, setVisivel] = useState(() => {
    try {
      return !sessionStorage.getItem('minha-voz:splash')
    } catch {
      return false
    }
  })
  const [saindo, setSaindo] = useState(false)

  useEffect(() => {
    if (!visivel) return
    try {
      sessionStorage.setItem('minha-voz:splash', '1')
    } catch {
      /* ignora */
    }
    const t1 = setTimeout(() => setSaindo(true), 1500)
    const t2 = setTimeout(() => setVisivel(false), 1850)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [visivel])

  if (!visivel) return null
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-primaria-50 to-white transition-opacity duration-300 ${saindo ? 'opacity-0' : 'opacity-100'}`}
      onClick={() => setVisivel(false)}
      role="status"
      aria-label="Carregando Minha Voz"
    >
      <img src={ICONE} alt="" className="size-24 rounded-3xl shadow-lg" />
      <div className="text-center">
        <div className="text-3xl font-black text-tinta">Minha Voz — CAA</div>
        <div className="mt-1 text-slate-600">Comunicação simples, acessível e inclusiva</div>
      </div>
      <div className="h-2 w-48 overflow-hidden rounded-full bg-primaria-100">
        <div className="h-full rounded-full bg-primaria-600" style={{ animation: 'carregar 1.5s ease-in-out forwards' }} />
      </div>
    </div>
  )
}
