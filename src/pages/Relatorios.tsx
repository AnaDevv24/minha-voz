import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Cabecalho } from '../components/LayoutMediador'
import { Pictograma } from '../components/Pictograma'
import { Selecao } from '../components/Campo'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { PERIODOS, gerarRelatorio, relatorioEmCSV, type Periodo } from '../lib/relatorios'
import { CORES } from '../lib/cores'
import { baixarArquivo, cn, tempoRelativo } from '../lib/utils'

/** Relatórios de uso (Figura 14) — UC-04 / RF07. */
export default function Relatorios() {
  const { banco, criancas, contarRelatorioGerado } = useApp()
  const avisar = useToast()
  const [periodo, setPeriodo] = useState<Periodo>('semana')
  const [criancaId, setCriancaId] = useState('todas')

  const ids = useMemo(() => (criancaId === 'todas' ? criancas.map((c) => c.id) : [criancaId]), [criancaId, criancas])
  const r = useMemo(() => gerarRelatorio(banco, ids, periodo), [banco, ids, periodo])
  const ultimo = banco.eventos.filter((e) => ids.includes(e.criancaId)).at(-1)?.data
  const ultimasFrases = banco.frases.filter((f) => ids.includes(f.criancaId)).slice(-5).reverse()
  const maxCartao = r.cartoesMaisUsados[0]?.total ?? 1
  // Gráfico simples: cliques por dia (7 dias, ou 30 em "Este mês"/"Total")
  const dias = periodo === 'semana' || periodo === 'hoje' ? 7 : 30
  const porDia = useMemo(() => {
    const lista: { rotulo: string; chave: string; total: number }[] = []
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      lista.push({ chave: d.toDateString(), rotulo: d.toLocaleDateString('pt-BR', dias === 7 ? { weekday: 'short' } : { day: '2-digit' }), total: 0 })
    }
    const mapa = new Map(lista.map((x) => [x.chave, x]))
    for (const e of banco.eventos) {
      if (!ids.includes(e.criancaId)) continue
      const item = mapa.get(new Date(e.data).toDateString())
      if (item) item.total++
    }
    return lista
  }, [banco.eventos, ids, dias])
  const maxDia = Math.max(1, ...porDia.map((d) => d.total))
  const nomeCrianca = criancaId === 'todas' ? 'Todas as crianças' : criancas.find((c) => c.id === criancaId)?.nomeApelido ?? ''

  function exportar() {
    const rotulo = PERIODOS.find((p) => p.id === periodo)!.rotulo
    baixarArquivo(`relatorio-minha-voz-${nomeCrianca.toLowerCase().replace(/\s+/g, '-')}-${periodo}.csv`, relatorioEmCSV(r, `${nomeCrianca} - ${rotulo}`), 'text/csv')
    contarRelatorioGerado()
    avisar('Relatório exportado (CSV).')
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Cabecalho
        titulo="Relatórios de uso"
        subtitulo={`Última utilização ${tempoRelativo(ultimo)}`}
        acao={
          <button onClick={exportar} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-primaria-700 hover:bg-primaria-50">
            <Download className="size-4" /> Exportar resumo
          </button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={cn('rounded-full px-3 py-1.5 text-xs font-bold', periodo === p.id ? 'bg-primaria-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100')}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
        <Selecao value={criancaId} onChange={(e) => setCriancaId(e.target.value)} className="w-auto bg-white">
          <option value="todas">Todas as crianças</option>
          {criancas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nomeApelido}
            </option>
          ))}
        </Selecao>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['👆', r.totalCliques, 'Total de cliques', 'bg-slate-100'],
          ['🃏', r.cartoesDistintos, 'Cartões distintos', 'bg-green-50'],
          ['📅', r.sessoes, 'Sessões de uso', 'bg-yellow-50'],
          ['💬', r.frasesFaladas, 'Frases faladas', 'bg-primaria-50'],
        ].map(([e, v, t, f]) => (
          <div key={t as string} className="rounded-3xl bg-white p-4 shadow-sm">
            <span className={`pictograma mb-2 inline-flex size-9 items-center justify-center rounded-full text-lg ${f}`}>{e}</span>
            <div className="text-2xl font-black">{v}</div>
            <div className="text-xs text-slate-500">{t}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-extrabold">Cliques por dia</h2>
        <div className="flex h-36 items-end gap-1" role="img" aria-label={`Gráfico de cliques nos últimos ${dias} dias`}>
          {porDia.map((d) => (
            <div key={d.chave} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.rotulo}: ${d.total} cliques`}>
              <span className="text-[10px] font-bold text-primaria-700 opacity-0 group-hover:opacity-100">{d.total}</span>
              <div className="w-full rounded-t-md bg-primaria-500 transition-all group-hover:bg-primaria-700" style={{ height: `${(d.total / maxDia) * 100}%`, minHeight: d.total ? 4 : 1 }} />
              {(dias === 7 || Number(d.rotulo) % 5 === 0) && <span className="text-[10px] text-slate-500">{d.rotulo.replace('.', '')}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-extrabold">Cartões mais usados</h2>
        {r.cartoesMaisUsados.length === 0 && (
          <div className="py-6 text-center">
            <div className="pictograma text-4xl">📭</div>
            <p className="mt-2 text-sm text-slate-500">Sem relatórios neste período. Os dados aparecem quando a criança usar a prancha.</p>
          </div>
        )}
        <ul className="space-y-3">
          {r.cartoesMaisUsados.slice(0, 8).map((c) => (
            <li key={c.cartaoId} className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-50">
                <Pictograma imagem={c.imagemUrl} texto={c.texto} className="size-6 text-xl" />
              </span>
              <div className="flex-1">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{c.texto}</span>
                  <span className="font-bold text-primaria-700">{c.total}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-primaria-600" style={{ width: `${(c.total / maxCartao) * 100}%` }} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-extrabold">Categorias mais acessadas</h2>
        <div className="flex flex-wrap gap-2">
          {r.categoriasMaisUsadas.map((c) => (
            <span key={c.categoriaId} className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold">
              <span className={cn('size-2.5 rounded-full', CORES[c.cor].ponto)} />
              {c.nome}
              <span className="rounded-full bg-white px-1.5 text-slate-500">{c.total}</span>
            </span>
          ))}
          {r.categoriasMaisUsadas.length === 0 && <p className="text-sm text-slate-500">Nenhum acesso neste período.</p>}
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-extrabold">Últimas frases faladas</h2>
        {ultimasFrases.length === 0 && <p className="text-sm text-slate-500">Quando a criança usar o botão “Falar”, as frases aparecem aqui.</p>}
        <ul className="space-y-2">
          {ultimasFrases.map((f) => (
            <li key={f.id} className="flex justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="font-semibold">“{f.texto}”</span>
              <span className="shrink-0 text-xs text-slate-500">
                {criancas.find((c) => c.id === f.criancaId)?.nomeApelido} · {tempoRelativo(f.data)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
