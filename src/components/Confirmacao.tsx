import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { TriangleAlert } from 'lucide-react'
import { Modal } from './Modal'
import { Botao } from './Campo'

interface Pedido {
  titulo: string
  mensagem: string
  confirmar?: string
  perigo?: boolean
}

const Contexto = createContext<(p: Pedido) => Promise<boolean>>(async () => false)

/** Modal de confirmação (estado "confirmação de exclusão"; prevenção de erros de Nielsen). */
export function ConfirmacaoProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const resolver = useRef<(v: boolean) => void>(() => {})

  const confirmar = useCallback((p: Pedido) => {
    setPedido(p)
    return new Promise<boolean>((res) => {
      resolver.current = res
    })
  }, [])

  const responder = (v: boolean) => {
    resolver.current(v)
    setPedido(null)
  }

  return (
    <Contexto.Provider value={confirmar}>
      {children}
      <Modal titulo={pedido?.titulo ?? ''} aberto={!!pedido} aoFechar={() => responder(false)}>
        <div className="flex gap-3">
          {pedido?.perigo !== false && (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <TriangleAlert className="size-5" />
            </span>
          )}
          <p className="text-sm text-slate-600">{pedido?.mensagem}</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Botao variante="suave" onClick={() => responder(false)}>
            Cancelar
          </Botao>
          <Botao variante={pedido?.perigo === false ? 'primario' : 'perigo'} className={pedido?.perigo === false ? '' : '!bg-red-600 !text-white hover:!bg-red-700'} onClick={() => responder(true)} autoFocus>
            {pedido?.confirmar ?? 'Excluir'}
          </Botao>
        </div>
      </Modal>
    </Contexto.Provider>
  )
}

export const useConfirmar = () => useContext(Contexto)
