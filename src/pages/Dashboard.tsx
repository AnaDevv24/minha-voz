import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { useApp } from '../store/AppStore'
import { dataExtenso, saudacao, tempoRelativo } from '../lib/utils'

/** Dashboard do mediador (Figura 6). */
export default function Dashboard() {
  const { mediador, criancas, cartoes, banco } = useApp()
  const primeiroNome = mediador?.nome.split(' ')[0] ?? ''
  const pranchasAtivas = criancas.filter((c) => c.prancha.ativa).length
  const ids = new Set(criancas.map((c) => c.id))
  // Últimas atividades: frases faladas e toques nos cartões, mais recentes primeiro
  const atividades = [
    ...banco.frases.filter((f) => ids.has(f.criancaId)).map((f) => ({ id: f.id, criancaId: f.criancaId, data: f.data, texto: `falou “${f.texto}”`, emoji: '💬' })),
    ...banco.eventos.filter((e) => ids.has(e.criancaId)).map((e) => ({ id: e.id, criancaId: e.criancaId, data: e.data, texto: `tocou em “${e.texto}”`, emoji: '👆' })),
  ]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 6)

  const numeros = [
    { emoji: '👦', valor: criancas.length, rotulo: 'Crianças cadastradas', cor: 'text-primaria-600', fundo: 'bg-primaria-50' },
    { emoji: '📋', valor: pranchasAtivas, rotulo: 'Pranchas ativas', cor: 'text-green-600', fundo: 'bg-green-50' },
    { emoji: '🃏', valor: cartoes.length, rotulo: 'Cartões cadastrados', cor: 'text-yellow-600', fundo: 'bg-yellow-50' },
    { emoji: '📊', valor: banco.relatoriosGerados, rotulo: 'Relatórios gerados', cor: 'text-purple-600', fundo: 'bg-purple-50' },
  ]

  const atalhos = [
    { emoji: '👧', rotulo: 'Cadastrar criança', para: '/painel/criancas/nova' },
    { emoji: '📋', rotulo: 'Gerenciar pranchas', para: '/painel/criancas' },
    { emoji: '📊', rotulo: 'Ver relatórios', para: '/painel/relatorios' },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">
            {saudacao()}, {primeiroNome}! 👋
          </h1>
          <p className="text-sm text-slate-500">Aqui está um resumo do seu trabalho</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
          <CalendarDays className="size-3.5" /> {dataExtenso()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {numeros.map((n) => (
          <div key={n.rotulo} className="rounded-3xl bg-white p-4 shadow-sm">
            <div className={`mb-3 inline-flex size-10 items-center justify-center rounded-full ${n.fundo}`}>
              <span className="pictograma text-xl">{n.emoji}</span>
            </div>
            <div className={`text-3xl font-black ${n.cor}`}>{n.valor}</div>
            <div className="text-xs text-slate-500">{n.rotulo}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {atalhos.map((a) => (
          <Link key={a.rotulo} to={a.para} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm hover:bg-primaria-50">
            <span className="pictograma flex size-10 items-center justify-center rounded-full bg-slate-50 text-xl">{a.emoji}</span>
            <span className="flex-1 text-sm font-bold">{a.rotulo}</span>
            <ChevronRight className="size-4 text-slate-400" />
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold">Crianças recentes</h2>
          <Link to="/painel/criancas" className="text-sm font-bold text-primaria-700 hover:underline">
            Ver todas
          </Link>
        </div>
        {criancas.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-500">
            Nenhuma criança cadastrada ainda. <Link to="/painel/criancas/nova" className="font-bold text-primaria-700">Cadastrar agora</Link>
          </p>
        )}
        <ul className="divide-y divide-slate-100">
          {criancas.slice(-5).map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <span className="pictograma flex size-10 items-center justify-center rounded-full bg-primaria-50 text-xl">{c.avatar}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{c.nomeApelido}</div>
                  <div className="text-xs text-slate-500">
                    {c.faixaEtaria} · Prancha {c.prancha.nivel}
                  </div>
                </div>
                <Link to={`/prancha/${c.id}`} state={{ voltar: true }} className="rounded-full bg-primaria-50 px-3 py-1 text-xs font-bold text-primaria-700 hover:bg-primaria-100">
                  Acessar
                </Link>
              </li>
            ))}
        </ul>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold">Últimas atividades</h2>
          <Link to="/painel/relatorios" className="text-sm font-bold text-primaria-700 hover:underline">
            Relatórios
          </Link>
        </div>
        {atividades.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Nenhuma atividade ainda. Abra uma prancha para começar.</p>}
        <ul className="space-y-2">
          {atividades.map((a) => {
            const c = criancas.find((k) => k.id === a.criancaId)
            return (
              <li key={a.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                <span className="pictograma text-lg">{c?.avatar ?? a.emoji}</span>
                <span className="min-w-0 flex-1 truncate">
                  <strong>{c?.nomeApelido}</strong> {a.texto}
                </span>
                <span className="shrink-0 text-xs text-slate-500">{tempoRelativo(a.data)}</span>
              </li>
            )
          })}
        </ul>
      </div>
      </div>
    </div>
  )
}
