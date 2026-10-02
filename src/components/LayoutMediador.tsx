import { ICONE } from '../lib/icone'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, ChevronRight, CircleHelp, Download, LayoutDashboard, LayoutGrid, LogOut, MoreHorizontal, Settings, Users, Volume2, X,
} from 'lucide-react'
import { Logo } from './Logo'
import { StatusConexao } from './StatusConexao'
import { TelaOffline } from './TelaOffline'
import { useApp } from '../store/AppStore'
import { useOnline } from '../lib/useOnline'
import { cn } from '../lib/utils'

const MENU = [
  { para: '/painel', rotulo: 'Dashboard', curto: 'Início', icone: LayoutDashboard, fim: true, inferior: true },
  { para: '/painel/criancas', rotulo: 'Crianças', curto: 'Crianças', icone: Users, inferior: true },
  { para: '/painel/categorias', rotulo: 'Categorias', curto: 'Categorias', icone: LayoutGrid },
  { para: '/painel/cartoes', rotulo: 'Cartões', curto: 'Cartões', icone: Volume2, inferior: true },
  { para: '/painel/relatorios', rotulo: 'Relatórios', curto: 'Relatórios', icone: BarChart3, inferior: true },
  { para: '/painel/configuracoes', rotulo: 'Configurações', curto: 'Ajustes', icone: Settings },
  { para: '/painel/ajuda', rotulo: 'Ajuda', curto: 'Ajuda', icone: CircleHelp },
  { para: '/instalar', rotulo: 'Instalar aplicativo', curto: 'Instalar', icone: Download },
]

/**
 * Área administrativa do mediador (seção 8.3).
 * Desktop/tablet: menu lateral. Celular: menu inferior (tela "Mobile 390 px com menu inferior").
 */
export function LayoutMediador() {
  const { mediador, sair } = useApp()
  const navegar = useNavigate()
  const local = useLocation()
  const online = useOnline()
  const [maisAberto, setMaisAberto] = useState(false)
  const [ignorarOffline, setIgnorarOffline] = useState(false)

  useEffect(() => {
    if (online) setIgnorarOffline(false)
  }, [online])

  const fazerLogout = () => {
    sair()
    navegar('/entrar')
  }

  const atual = MENU.find((m) => (m.fim ? local.pathname === m.para : local.pathname.startsWith(m.para)))

  return (
    <div className="min-h-screen md:flex">
      {/* Menu lateral (tablet e desktop) */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-100 bg-white md:flex">
        <div className="border-b border-slate-100 px-5 py-4">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Menu do mediador">
          {MENU.map(({ para, rotulo, icone: Icone, fim }) => (
            <NavLink
              key={para}
              to={para}
              end={fim}
              className={({ isActive }) =>
                cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors', isActive ? 'bg-primaria-100 text-primaria-800' : 'text-slate-600 hover:bg-slate-100')
              }
            >
              {({ isActive }) => (
                <>
                  <Icone className="size-4.5" />
                  <span className="flex-1">{rotulo}</span>
                  {isActive && <ChevronRight className="size-4" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-2">
          <StatusConexao />
        </div>
        <div className="flex items-center gap-3 border-t border-slate-100 p-4">
          <div className="flex size-9 items-center justify-center rounded-full bg-primaria-100 text-sm font-bold text-primaria-700">{mediador?.nome.charAt(0).toUpperCase()}</div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-bold">{mediador?.nome}</div>
            <div className="truncate text-xs text-slate-500">{mediador?.papel}</div>
          </div>
          <button onClick={fazerLogout} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Sair da conta" aria-label="Sair da conta">
            <LogOut className="size-4.5" />
          </button>
        </div>
      </aside>

      {/* Barra superior (celular) */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <img src={ICONE} alt="" className="size-8 rounded-lg" />
        <span className="flex-1 font-extrabold">{atual?.rotulo ?? 'Minha Voz'}</span>
        <div className="w-36">
          <StatusConexao compacto />
        </div>
      </header>

      <main className="min-w-0 flex-1 px-4 pt-6 pb-28 sm:px-6 md:pb-10 lg:px-10">
        <div className="mx-auto max-w-5xl">{!online && !ignorarOffline ? <TelaOffline aoContinuar={() => setIgnorarOffline(true)} /> : <Outlet />}</div>
      </main>

      {/* Menu inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-100 bg-white pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Menu inferior">
        {MENU.filter((m) => m.inferior).map(({ para, curto, icone: Icone, fim }) => (
          <NavLink key={para} to={para} end={fim} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold', isActive ? 'text-primaria-700' : 'text-slate-500')}>
            {({ isActive }) => (
              <>
                <span className={cn('rounded-full px-3 py-1', isActive && 'bg-primaria-100')}>
                  <Icone className="size-5" />
                </span>
                {curto}
              </>
            )}
          </NavLink>
        ))}
        <button onClick={() => setMaisAberto(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold text-slate-500">
          <span className="rounded-full px-3 py-1">
            <MoreHorizontal className="size-5" />
          </span>
          Mais
        </button>
      </nav>

      {maisAberto && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMaisAberto(false)}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <div className="animar-surgir absolute inset-x-0 bottom-0 rounded-t-3xl bg-white p-4 pb-8 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="leading-tight">
                <div className="font-extrabold">{mediador?.nome}</div>
                <div className="text-xs text-slate-500">{mediador?.email}</div>
              </div>
              <button onClick={() => setMaisAberto(false)} className="rounded-full p-1.5 hover:bg-slate-100" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MENU.filter((m) => !m.inferior).map(({ para, rotulo, icone: Icone }) => (
                <NavLink key={para} to={para} onClick={() => setMaisAberto(false)} className="flex items-center gap-2 rounded-2xl bg-slate-50 p-3 text-sm font-bold">
                  <Icone className="size-5 text-primaria-600" /> {rotulo}
                </NavLink>
              ))}
              <button onClick={fazerLogout} className="flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">
                <LogOut className="size-5" /> Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function Cabecalho({ titulo, subtitulo, acao }: { titulo: string; subtitulo?: string; acao?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold">{titulo}</h1>
        {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
      </div>
      {acao}
    </div>
  )
}
