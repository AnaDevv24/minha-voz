import { cn } from '../lib/utils'

/** Botão liga/desliga (usado para ativar/desativar categorias e cartões). */
export function Interruptor({ ligado, aoMudar, rotulo }: { ligado: boolean; aoMudar: (v: boolean) => void; rotulo: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      title={rotulo}
      onClick={() => aoMudar(!ligado)}
      className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', ligado ? 'bg-green-500' : 'bg-slate-300')}
    >
      <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform', ligado && 'translate-x-5')} />
    </button>
  )
}
