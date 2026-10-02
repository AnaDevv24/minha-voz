import { Link } from 'react-router-dom'
import { RefreshCw, WifiOff } from 'lucide-react'
import { useApp } from '../store/AppStore'
import { useToast } from './Toast'

/** Estado offline/PWA (tela 18): a prancha continua disponível com os recursos já carregados. */
export function TelaOffline({ aoContinuar }: { aoContinuar?: () => void }) {
  const { criancas, pendentes } = useApp()
  const avisar = useToast()

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10 text-center">
      <span className="flex size-20 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
        <WifiOff className="size-10" />
      </span>
      <h1 className="mt-5 text-2xl font-black">Você está offline</h1>
      <p className="mt-2 max-w-md text-slate-600">
        Sem problema: a prancha de comunicação continua funcionando com os cartões e a voz que já estão no aparelho. As alterações feitas agora
        ficam guardadas e são enviadas quando a internet voltar{pendentes ? ` (${pendentes} aguardando envio)` : ''}.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => {
            if (navigator.onLine) {
              avisar('Conexão restabelecida!')
              aoContinuar?.()
            } else avisar('Ainda sem conexão. Tente de novo em instantes.', 'aviso')
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-primaria-600 px-5 py-3 font-bold text-white hover:bg-primaria-700"
        >
          <RefreshCw className="size-4" /> Tentar novamente
        </button>
        {aoContinuar && (
          <button onClick={aoContinuar} className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold hover:bg-slate-50">
            Continuar no modo offline
          </button>
        )}
      </div>
      {criancas.length > 0 && (
        <div className="mt-8 w-full max-w-md">
          <div className="mb-2 text-sm font-bold text-slate-500">Continuar na prancha</div>
          <div className="flex flex-wrap justify-center gap-2">
            {criancas.map((c) => (
              <Link key={c.id} to={`/prancha/${c.id}`} state={{ voltar: true }} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 font-bold shadow-sm hover:bg-primaria-50">
                <span className="pictograma text-xl">{c.avatar}</span> {c.nomeApelido}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
