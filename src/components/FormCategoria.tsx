import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Botao, Entrada, Rotulo } from './Campo'
import { SeletorEmoji } from './SeletorEmoji'
import { useApp } from '../store/AppStore'
import { useToast } from './Toast'
import { CORES, LISTA_CORES } from '../lib/cores'
import { cn, uid } from '../lib/utils'
import type { Categoria, CorCategoria } from '../types'

export function FormCategoria({ aberto, aoFechar, categoria }: { aberto: boolean; aoFechar: () => void; categoria?: Categoria | null }) {
  const { categorias, mediador, salvarCategoria } = useApp()
  const avisar = useToast()
  const [nome, setNome] = useState('')
  const [emoji, setEmoji] = useState('⭐')
  const [cor, setCor] = useState<CorCategoria>('azul')

  useEffect(() => {
    if (!aberto) return
    setNome(categoria?.nome ?? '')
    setEmoji(categoria?.emoji ?? '⭐')
    setCor(categoria?.cor ?? 'azul')
  }, [aberto, categoria])

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !mediador) return
    salvarCategoria({
      id: categoria?.id ?? uid('cat-'),
      mediadorId: mediador.id,
      nome: nome.trim(),
      emoji,
      cor,
      ordem: categoria?.ordem ?? categorias.length,
      ativa: categoria?.ativa ?? true,
    })
    avisar(categoria ? 'Categoria atualizada.' : 'Categoria criada.')
    aoFechar()
  }

  return (
    <Modal titulo={categoria ? 'Editar categoria' : 'Nova categoria'} aberto={aberto} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="space-y-4">
        <div className="flex justify-center">
          <div className={cn('flex size-20 items-center justify-center rounded-2xl border-2 text-5xl', CORES[cor].fundo, CORES[cor].borda)}>
            <span className="pictograma">{emoji}</span>
          </div>
        </div>
        <Rotulo texto="Nome da categoria">
          <Entrada value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Brincadeiras" required maxLength={30} />
        </Rotulo>
        <div>
          <span className="mb-1.5 block text-sm font-bold">Cor</span>
          <div className="flex flex-wrap gap-2">
            {LISTA_CORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCor(c)}
                className={cn('size-9 rounded-full border-2', CORES[c].ponto, cor === c ? 'border-tinta ring-2 ring-offset-2 ring-primaria-500' : 'border-white')}
                aria-label={CORES[c].nome}
                title={CORES[c].nome}
              />
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-bold">Ícone</span>
          <SeletorEmoji valor={emoji} aoEscolher={setEmoji} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Botao type="button" variante="suave" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit">Salvar</Botao>
        </div>
      </form>
    </Modal>
  )
}
