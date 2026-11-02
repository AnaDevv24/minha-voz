import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Pencil, Plus, Search, Star, Trash2, Volume2 } from 'lucide-react'
import { Cabecalho } from '../components/LayoutMediador'
import { FormCartao } from '../components/FormCartao'
import { Pictograma } from '../components/Pictograma'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useConfirmar } from '../components/Confirmacao'
import { falar } from '../lib/fala'
import { CORES } from '../lib/cores'
import { cn } from '../lib/utils'
import type { Cartao } from '../types'

/** Gerenciamento de cartões e pictogramas (Figura 12) — UC-02 / RF05. */
export default function Cartoes() {
  const { cartoes, categorias, salvarCartao, excluirCartao, moverCartao, config } = useApp()
  const avisar = useToast()
  const confirmar = useConfirmar()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [form, setForm] = useState<{ aberto: boolean; cartao: Cartao | null }>({ aberto: false, cartao: null })

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    const ordemCat = new Map(categorias.map((c) => [c.id, c.ordem]))
    return cartoes
      .filter((c) => (filtro === 'todos' || c.categoriaId === filtro) && (!termo || c.texto.toLowerCase().includes(termo)))
      .sort((a, b) => (ordemCat.get(a.categoriaId) ?? 0) - (ordemCat.get(b.categoriaId) ?? 0) || a.ordem - b.ordem)
  }, [cartoes, categorias, busca, filtro])

  async function excluir(c: Cartao) {
    if (!(await confirmar({ titulo: 'Excluir cartão', mensagem: `Excluir o cartão "${c.texto}"? Ele sai de todas as pranchas.` }))) return
    excluirCartao(c.id)
    avisar('Cartão excluído.')
  }

  const podeOrdenar = filtro !== 'todos' && !busca.trim()

  return (
    <div>
      <Cabecalho
        titulo="Cartões / Pictogramas"
        subtitulo={`${cartoes.length} cartões cadastrados`}
        acao={
          <button onClick={() => setForm({ aberto: true, cartao: null })} className="inline-flex items-center gap-1.5 rounded-full bg-primaria-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-primaria-700">
            <Plus className="size-4" /> Novo cartão
          </button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative block lg:w-64">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cartão…"
            className="w-full rounded-full border border-slate-200 bg-white py-2 pr-3 pl-9 text-sm focus:border-primaria-500 focus:outline-none"
          />
        </label>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[{ id: 'todos', nome: 'Todos' }, ...categorias].map((c) => (
            <button
              key={c.id}
              onClick={() => setFiltro(c.id)}
              className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold', filtro === c.id ? 'bg-primaria-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100')}
            >
              {c.nome}
            </button>
          ))}
        </div>
      </div>
      {podeOrdenar && <p className="mb-3 text-xs text-slate-500">Use as setas ← → para mudar a ordem dos cartões nesta categoria.</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map((c, i) => {
          const cat = categorias.find((k) => k.id === c.categoriaId)
          return (
            <div key={c.id} className={cn('flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm', !c.ativo && 'opacity-60')}>
              <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', cat ? CORES[cat.cor].fundo : 'bg-slate-50')}>
                <Pictograma imagem={c.imagemUrl} texto={c.texto} className="size-9 text-3xl" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 truncate font-bold">
                  {c.texto}
                  {c.atalho && <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" aria-label="Atalho na prancha principal" />}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {cat?.nome}
                  {!c.ativo && ' · oculto'}
                </div>
              </div>
              <div className="flex shrink-0 items-center">
                {podeOrdenar && (
                  <>
                    <button onClick={() => moverCartao(c.id, -1)} disabled={i === 0} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Mover para trás">
                      <ArrowLeft className="size-4" />
                    </button>
                    <button onClick={() => moverCartao(c.id, 1)} disabled={i === visiveis.length - 1} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Mover para frente">
                      <ArrowRight className="size-4" />
                    </button>
                  </>
                )}
                <button onClick={() => falar(c.texto, { tom: config.tomVoz })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Ouvir ${c.texto}`}>
                  <Volume2 className="size-4" />
                </button>
                <button onClick={() => salvarCartao({ ...c, ativo: !c.ativo })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label={c.ativo ? 'Ocultar da prancha' : 'Mostrar na prancha'} title={c.ativo ? 'Ocultar da prancha' : 'Mostrar na prancha'}>
                  {c.ativo ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
                <button onClick={() => setForm({ aberto: true, cartao: c })} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Editar ${c.texto}`}>
                  <Pencil className="size-4" />
                </button>
                <button onClick={() => excluir(c)} className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label={`Excluir ${c.texto}`}>
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {visiveis.length === 0 && (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="pictograma text-5xl">🃏</div>
          <p className="mt-2 font-bold">{busca ? 'Nenhum cartão encontrado' : 'Sem cartões nesta categoria'}</p>
          <p className="text-sm text-slate-500">{busca ? 'Tente outra palavra.' : 'Crie um cartão com “Novo cartão”.'}</p>
        </div>
      )}

      <FormCartao
        aberto={form.aberto}
        cartao={form.cartao}
        categoriaInicial={filtro !== 'todos' ? filtro : undefined}
        aoFechar={() => setForm({ aberto: false, cartao: null })}
      />
    </div>
  )
}
