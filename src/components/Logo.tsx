import { ICONE } from '../lib/icone'
import { cn } from '../lib/utils'

export function LogoIcone({ className }: { className?: string }) {
  return <img src={ICONE} alt="" className={cn('size-10 rounded-xl shadow-sm', className)} />
}

export function Logo({ subtitulo = 'CAA', className }: { subtitulo?: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <LogoIcone />
      <div className="leading-tight">
        <div className="font-extrabold text-tinta">Minha Voz</div>
        <div className="text-xs text-slate-500">{subtitulo}</div>
      </div>
    </div>
  )
}
