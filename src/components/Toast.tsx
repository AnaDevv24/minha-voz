import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, TriangleAlert } from 'lucide-react'

type Tipo = 'sucesso' | 'aviso' | 'info'
interface Aviso { id: number; texto: string; tipo: Tipo }

const Contexto = createContext<(texto: string, tipo?: Tipo) => void>(() => {})

/** Mensagens curtas de retorno (heurística de Nielsen: visibilidade do estado do sistema). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const mostrar = useCallback((texto: string, tipo: Tipo = 'sucesso') => {
    const id = Date.now() + Math.random()
    setAvisos((a) => [...a, { id, texto, tipo }])
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <Contexto.Provider value={mostrar}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite">
        {avisos.map((a) => (
          <div
            key={a.id}
            className="animar-surgir pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl bg-tinta px-4 py-3 text-sm font-semibold text-white shadow-lg"
          >
            {a.tipo === 'sucesso' && <CheckCircle2 className="size-5 shrink-0 text-green-300" />}
            {a.tipo === 'aviso' && <TriangleAlert className="size-5 shrink-0 text-yellow-300" />}
            {a.tipo === 'info' && <Info className="size-5 shrink-0 text-sky-300" />}
            {a.texto}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  )
}

export const useToast = () => useContext(Contexto)
