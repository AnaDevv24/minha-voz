import { useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Cabecalho } from '../components/LayoutMediador'
import { FormCategoria } from '../components/FormCategoria'
import { Interruptor } from '../components/Interruptor'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useConfirmar } from '../components/Confirmacao'
import { CORES } from '../lib/cores'
import { cn } from '../lib/utils'
import type { Categoria } from '../types'

/** Gerenciamento de categorias (Figura 11) — UC-01 / RF05: ativar, desativar, reorganizar, editar e excluir. */
export default function Categorias() {
  const { categorias, cartoes, salvarCategoria, excluirCategoria, moverCategoria } = useApp()
  const avisar = useToast()
  const confirmar = useConfirmar()
  const [form, setForm] = useState<{ aberto: boolean; categoria: Categoria | null }>({ aberto: false, categoria: null })

  async function excluir(c: Categoria) {
    const qtd = cartoes.filter((k) => k.categoriaId === c.id).length
    if (!(await confirmar({ titulo: 'Excluir categoria', mensagem: `Excluir a categoria "${c.nome}"${qtd ? ` e os ${qtd} cartões dela` : ''}? Esta ação não pode ser desfeita.` }))) return
    excluirCategoria(c.id)
    avisar('Categoria excluída.')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Cabecalho
        titulo="Categorias"
        subtitulo="Organize os grupos de cartões. Use as setas para mudar a ordem na prancha."
        acao={
          <button onClick={() => setForm({ aberto: true, categoria: null })} className="inline-flex items-center gap-1.5 rounded-full bg-primaria-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-primaria-700">
            <Plus className="size-4" /> Nova categoria
          </button>
        }
      />

      <ul className="space-y-2.5">
        {categorias.map((c, i) => {
          const qtd = cartoes.filter((k) => k.categoriaId === c.id).length
          return (
            <li key={c.id} className={cn('flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm', !c.ativa && 'opacity-70')}>
              <div className="flex flex-col">
                <button onClick={() => moverCategoria(c.id, -1)} disabled={i === 0} className="rounded p-0.5 text-slate-400 hover:text-tinta disabled:opacity-30" aria-label="Mover para cima">
                  <ArrowUp className="size-4" />
                </button>
                <button onClick={() => moverCategoria(c.id, 1)} disabled={i === categorias.length - 1} className="rounded p-0.5 text-slate-400 hover:text-tinta disabled:opacity-30" aria-label="Mover para baixo">
                  <ArrowDown className="size-4" />
                </button>
              </div>
              <span className={cn('pictograma flex size-11 items-center justify-center rounded-full text-2xl', CORES[c.cor].fundo)}>{c.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold">{c.nome}</div>
                <div className="text-xs text-slate-500">
                  {qtd} cartões{!c.ativa && ' · desativada (não aparece na prancha)'}
                </div>
              </div>
              <Interruptor
                ligado={c.ativa}
                aoMudar={(v) => {
                  salvarCategoria({ ...c, ativa: v })
                  avisar(v ? `"${c.nome}" ativada.` : `"${c.nome}" desativada.`, 'info')
                }}
                rotulo={c.ativa ? 'Desativar categoria' : 'Ativar categoria'}
              />
              <button onClick={() => setForm({ aberto: true, categoria: c })} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label={`Editar ${c.nome}`}>
                <Pencil className="size-4" />
              </button>
              <button onClick={() => excluir(c)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label={`Excluir ${c.nome}`}>
                <Trash2 className="size-4" />
              </button>
            </li>
          )
        })}
      </ul>

      {categorias.length === 0 && <p className="rounded-3xl bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Nenhuma categoria ainda. Crie a primeira em “Nova categoria”.</p>}

      <FormCategoria aberto={form.aberto} categoria={form.categoria} aoFechar={() => setForm({ aberto: false, categoria: null })} />
    </div>
  )
}
