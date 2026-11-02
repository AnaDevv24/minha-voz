import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Info } from 'lucide-react'
import { LogoIcone } from '../components/Logo'
import { Botao, Entrada, Rotulo } from '../components/Campo'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { EMAIL_DEMO, SENHA_DEMO } from '../data/seed'
import { useEncerrarDemonstracao } from '../lib/demonstracao'

/** Tela de login do mediador (Figura 5) — UC-05 / RF01. */
export default function Entrar() {
  const { entrar } = useApp()
  useEncerrarDemonstracao()
  const navegar = useNavigate()
  const local = useLocation()
  const avisar = useToast()
  const [email, setEmail] = useState(EMAIL_DEMO)
  const [senha, setSenha] = useState(SENHA_DEMO)
  const [verSenha, setVerSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)
    const r = await entrar(email, senha)
    setCarregando(false)
    if (!r.ok) return setErro(r.erro)
    const destino = (local.state as { de?: string } | null)?.de ?? '/painel'
    navegar(destino, { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-fundo px-4 py-10">
      <Link to="/" className="mb-6 flex flex-col items-center gap-2 text-center">
        <LogoIcone className="size-14" />
        <div className="text-xl font-extrabold">Minha Voz — CAA</div>
        <div className="text-sm text-primaria-700">Acesso do mediador</div>
      </Link>

      <form onSubmit={enviar} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex gap-2 rounded-xl bg-yellow-50 p-3 text-xs text-yellow-900">
          <Info className="size-4 shrink-0" />
          <span>
            Demonstração: os campos já vêm preenchidos com <strong>{EMAIL_DEMO}</strong> / <strong>{SENHA_DEMO}</strong>.
          </span>
        </div>
        <Rotulo texto="E-mail">
          <Entrada type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </Rotulo>
        <Rotulo texto="Senha">
          <div className="relative">
            <Entrada type={verSenha ? 'text' : 'password'} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required className="pr-10" />
            <button type="button" onClick={() => setVerSenha((v) => !v)} className="absolute inset-y-0 right-2 px-1 text-slate-500" aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}>
              {verSenha ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
            </button>
          </div>
        </Rotulo>
        {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">{erro}</p>}
        <Botao type="submit" className="w-full" disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </Botao>
        <Link to="/recuperar-senha" className="block w-full text-center text-sm font-semibold text-primaria-700 hover:underline">
          Esqueci minha senha
        </Link>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <hr className="flex-1 border-slate-100" /> ou <hr className="flex-1 border-slate-100" />
        </div>
        <button
          type="button"
          onClick={() => avisar('Login com Google fica disponível ao conectar o Firebase Authentication (opcional no TCC).', 'info')}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-bold hover:bg-slate-50"
        >
          <span className="text-base font-black text-[#4285F4]">G</span> Entrar com Google
        </button>
        <Link to="/criar-conta" className="block w-full rounded-xl border border-primaria-600 py-2.5 text-center text-sm font-bold text-primaria-700 hover:bg-primaria-50">
          Criar conta
        </Link>
      </form>
      <p className="mt-6 text-xs text-slate-500">🔒 Protegido pela LGPD · Seus dados estão seguros</p>

    </div>
  )
}
