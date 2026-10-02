import { Link } from 'react-router-dom'
import { Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Cabecalho } from '../components/LayoutMediador'
import { useApp } from '../store/AppStore'
import { useConfirmar } from '../components/Confirmacao'
import { useToast } from '../components/Toast'

/** Seleção dos perfis das crianças (Figura 7) — RF02. */
export default function Criancas() {
  const { criancas, excluirCrianca } = useApp()
  const confirmar = useConfirmar()
  const avisar = useToast()

  return (
    <div>
      <Cabecalho
        titulo="Perfis das crianças"
        subtitulo="Selecione para acessar a prancha"
        acao={
          <Link to="/painel/criancas/nova" className="inline-flex items-center gap-1.5 rounded-full bg-primaria-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-primaria-700">
            <Plus className="size-4" /> Nova criança
          </Link>
        }
      />

      {criancas.length === 0 && (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="pictograma text-5xl">🧒</div>
          <p className="mt-3 font-bold">Nenhuma criança cadastrada</p>
          <p className="text-sm text-slate-500">Cadastre a primeira criança para montar a prancha dela.</p>
          <Link to="/painel/criancas/nova" className="mt-4 inline-block rounded-xl bg-primaria-600 px-4 py-2 text-sm font-bold text-white">Cadastrar criança</Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {criancas.map((c) => (
          <div key={c.id} className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <span className="pictograma flex size-16 items-center justify-center rounded-2xl bg-primaria-50 text-4xl">{c.avatar}</span>
              <div className="mt-2 text-lg font-extrabold">{c.nomeApelido}</div>
              <div className="text-xs text-slate-500">{c.faixaEtaria}</div>
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              {[
                ['Prancha', c.prancha.nivel],
                ['Voz', c.preferenciaVoz],
                ['Cartões', c.tamanhoCartao],
                ['Alto contraste', c.altoContraste ? 'Sim' : 'Não'],
                ['Categorias', String(c.prancha.categoriasVisiveis.length)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex gap-2">
              <Link to={`/prancha/${c.id}`} state={{ voltar: true }} className="flex-1 rounded-full bg-primaria-600 py-2 text-center text-sm font-bold text-white hover:bg-primaria-700">
                Acessar prancha
              </Link>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-bold">
              <Link to={`/painel/criancas/${c.id}`} className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 py-2 text-slate-600 hover:bg-slate-100" aria-label={`Editar perfil de ${c.nomeApelido}`}>
                <Pencil className="size-4" /> Editar perfil
              </Link>
              <Link to={`/painel/criancas/${c.id}/personalizar`} className="flex flex-col items-center gap-1 rounded-xl bg-slate-50 py-2 text-slate-600 hover:bg-slate-100">
                <SlidersHorizontal className="size-4" /> Personalizar
              </Link>
              <button
                onClick={async () => {
                  if (await confirmar({ titulo: 'Excluir criança', mensagem: `Excluir o perfil de ${c.nomeApelido}? O histórico de uso também será apagado.` })) {
                    excluirCrianca(c.id)
                    avisar('Perfil excluído.')
                  }
                }}
                className="flex flex-col items-center gap-1 rounded-xl bg-red-50 py-2 text-red-600 hover:bg-red-100"
                aria-label={`Excluir ${c.nomeApelido}`}
              >
                <Trash2 className="size-4" /> Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
