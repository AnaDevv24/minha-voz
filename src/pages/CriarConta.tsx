import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogoIcone } from '../components/Logo'
import { Botao, Entrada, Rotulo, Selecao } from '../components/Campo'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'

/** Cadastro do responsável/mediador — RF01, com consentimento LGPD (RF06). */
export default function CriarConta() {
  const { cadastrar } = useApp()
  const navegar = useNavigate()
  const avisar = useToast()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [papel, setPapel] = useState('Responsável')
  const [aceite, setAceite] = useState(false)
  const [erro, setErro] = useState('')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (senha.length < 8) return setErro('A senha precisa ter pelo menos 8 caracteres.')
    if (senha !== confirmar) return setErro('As senhas não conferem.')
    if (!aceite) return setErro('É preciso aceitar os termos de privacidade.')
    const r = await cadastrar({ nome, email, senha, papel })
    if (!r.ok) return setErro(r.erro)
    avisar('Conta criada! Agora cadastre a primeira criança.')
    navegar('/painel/criancas/nova')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-fundo px-4 py-10">
      <Link to="/" className="mb-6 flex flex-col items-center gap-2 text-center">
        <LogoIcone className="size-14" />
        <div className="text-xl font-extrabold">Criar conta gratuita</div>
        <div className="text-sm text-primaria-700">Para pais, responsáveis, professores e terapeutas</div>
      </Link>
      <form onSubmit={enviar} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-6 shadow-sm">
        <Rotulo texto="Seu nome">
          <Entrada value={nome} onChange={(e) => setNome(e.target.value)} required autoComplete="name" />
        </Rotulo>
        <Rotulo texto="E-mail">
          <Entrada type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Rotulo>
        <Rotulo texto="Perfil do mediador">
          <Selecao value={papel} onChange={(e) => setPapel(e.target.value)}>
            <option>Responsável</option>
            <option>Professor(a)</option>
            <option>Fonoaudiólogo(a)</option>
            <option>Terapeuta</option>
            <option>Profissional do AEE</option>
          </Selecao>
        </Rotulo>
        <Rotulo texto="Senha" dica="Mínimo de 8 caracteres.">
          <Entrada type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="new-password" />
        </Rotulo>
        <Rotulo texto="Confirmar senha">
          <Entrada type="password" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} required autoComplete="new-password" />
        </Rotulo>
        <label className="flex gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primaria-600" />
          <span>
            Sou o responsável legal ou tenho autorização dele. Concordo que o Minha Voz guarde apenas o mínimo necessário (apelido, faixa etária e preferências
            de uso da criança), conforme a LGPD (Lei nº 13.709/2018). Posso exportar ou apagar os dados a qualquer momento.{' '}
            <Link to="/privacidade" className="font-bold text-primaria-700 underline">Ler a política de privacidade</Link>
          </span>
        </label>
        {erro && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">{erro}</p>}
        <Botao type="submit" className="w-full">Criar conta</Botao>
        <p className="text-center text-sm">
          Já tem conta? <Link to="/entrar" className="font-bold text-primaria-700 hover:underline">Entrar</Link>
        </p>
      </form>
    </div>
  )
}
