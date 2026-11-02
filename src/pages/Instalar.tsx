import { ICONE } from '../lib/icone'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Download, MonitorSmartphone, Share, SquarePlus, WifiOff } from 'lucide-react'
import { aoMudarInstalacao, ehIOS, instalar, jaInstalado, podeInstalar } from '../lib/pwa'
import { useToast } from '../components/Toast'

/** Instalação do PWA (tela 19) — Add to Home Screen. */
export default function Instalar() {
  const navegar = useNavigate()
  const avisar = useToast()
  const [, forcar] = useState(0)
  useEffect(() => aoMudarInstalacao(() => forcar((n) => n + 1)), [])
  const instalado = jaInstalado()

  async function clicar() {
    if (podeInstalar()) {
      const ok = await instalar()
      avisar(ok ? 'Aplicativo instalado!' : 'Instalação cancelada.', ok ? 'sucesso' : 'info')
    } else {
      avisar('Use as instruções abaixo para adicionar à tela inicial.', 'info')
    }
  }

  return (
    <div className="min-h-screen bg-fundo px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => navegar(-1)} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-tinta">
          <ArrowLeft className="size-4" /> Voltar
        </button>
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm sm:p-10">
          <img src={ICONE} alt="" className="mx-auto size-20 rounded-3xl shadow" />
          <h1 className="mt-4 text-3xl font-black">Instale o Minha Voz</h1>
          <p className="mx-auto mt-2 max-w-md text-slate-600">
            Adicione o aplicativo à tela inicial do celular, tablet ou computador. Ele abre em tela cheia, como um app, e a prancha funciona mesmo sem internet.
          </p>
          {instalado ? (
            <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 font-bold text-green-700">
              <CheckCircle2 className="size-5" /> O aplicativo já está instalado neste aparelho
            </p>
          ) : (
            <button onClick={clicar} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primaria-600 px-6 py-3 text-lg font-bold text-white shadow-md hover:bg-primaria-700">
              <Download className="size-5" /> Instalar aplicativo
            </button>
          )}
          {!podeInstalar() && !instalado && (
            <p className="mt-3 text-xs text-slate-500">
              O botão automático aparece no Chrome/Edge quando o app roda em modo de produção (npm run build + npm run preview) ou publicado com HTTPS.
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <SquarePlus className="size-6 text-primaria-600" />
            <h2 className="mt-2 font-extrabold">Android (Chrome)</h2>
            <p className="mt-1 text-sm text-slate-600">Menu ⋮ → “Adicionar à tela inicial” ou “Instalar aplicativo”.</p>
          </div>
          <div className={`rounded-3xl bg-white p-5 shadow-sm ${ehIOS() ? 'ring-2 ring-primaria-500' : ''}`}>
            <Share className="size-6 text-primaria-600" />
            <h2 className="mt-2 font-extrabold">iPhone / iPad (Safari)</h2>
            <p className="mt-1 text-sm text-slate-600">Botão Compartilhar → “Adicionar à Tela de Início”.</p>
          </div>
          <div className="rounded-3xl bg-white p-5 shadow-sm">
            <MonitorSmartphone className="size-6 text-primaria-600" />
            <h2 className="mt-2 font-extrabold">Computador</h2>
            <p className="mt-1 text-sm text-slate-600">No Chrome ou Edge, clique no ícone de instalar na barra de endereço.</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 rounded-3xl bg-yellow-50 p-5 text-sm text-yellow-900">
          <WifiOff className="size-6 shrink-0" />
          Depois de aberto uma vez, o app guarda a prancha, os pictogramas e os estilos no aparelho (Service Worker, estratégia Cache-First).
        </div>
      </div>
    </div>
  )
}
