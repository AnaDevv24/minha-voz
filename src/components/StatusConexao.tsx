import { useApp } from '../store/AppStore'
import { cn } from '../lib/utils'

/** Mostra se o app está falando com a API Flask ou trabalhando só no aparelho. */
export function StatusConexao({ compacto = false }: { compacto?: boolean }) {
  const { conexao, pendentes, verificarConexao } = useApp()
  const servidor = conexao === 'servidor'
  const texto = conexao === 'verificando' ? 'Verificando…' : servidor ? 'Servidor conectado' : 'Modo local'
  const detalhe = servidor ? 'API Flask + banco de dados' : 'API Flask desligada; dados no aparelho'
  return (
    <button
      onClick={() => void verificarConexao()}
      title="Clique para verificar a conexão com a API Flask"
      className={cn('flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold', servidor ? 'bg-green-50 text-green-800' : 'bg-slate-100 text-slate-600')}
    >
      <span className={cn('size-2.5 shrink-0 rounded-full', servidor ? 'bg-green-500' : conexao === 'verificando' ? 'bg-yellow-400' : 'bg-slate-400')} />
      <span className="min-w-0 flex-1 truncate">
        {texto}
        {!compacto && conexao !== 'verificando' && <span className="block truncate font-normal">{detalhe}</span>}
        {!compacto && pendentes > 0 && <span className="block font-normal">{pendentes} alteração(ões) aguardando envio</span>}
      </span>
    </button>
  )
}
