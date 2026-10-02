import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({ titulo, aberto, aoFechar, children, largura = 'max-w-md' }: {
  titulo: string
  aberto: boolean
  aoFechar: () => void
  children: ReactNode
  largura?: string
}) {
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto, aoFechar])

  if (!aberto) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-4" onMouseDown={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`animar-surgir max-h-[92vh] w-full ${largura} overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{titulo}</h2>
          <button onClick={aoFechar} className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
