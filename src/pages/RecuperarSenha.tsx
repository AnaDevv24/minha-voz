import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { LogoIcone } from '../components/Logo'
import { Botao, Entrada, Rotulo } from '../components/Campo'
import { requisicao } from '../lib/api'

/** Recuperação de senha (tela 4). */
export default function RecuperarSenha() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [carregando, setCarregando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setCarregando(true)
    try {
      await requisicao('POST', '/auth/recuperar-senha', { email }, 2500)
    } catch {
      /* sem servidor: a demonstração segue igual */
    }
    setCarregando(false)
    setEnviado(true)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-fundo px-4 py-10">
      <Link to="/" className="mb-6 flex flex-col items-center gap-2 text-center">
        <LogoIcone className="size-14" />
        <div className="text-xl font-extrabold">Recuperar senha</div>
      </Link>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-sm">
        {enviado ? (
          <div className="text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-50 text-green-600">
              <MailCheck className="size-7" />
            </span>
            <h2 className="mt-3 font-extrabold">Verifique seu e-mail</h2>
            <p className="mt-1 text-sm text-slate-600">
              Se <strong>{email}</strong> estiver cadastrado, enviaremos um link para criar uma nova senha. (Na demonstração o envio é simulado.)
            </p>
            <Link to="/entrar" className="mt-5 block rounded-xl bg-primaria-600 py-2.5 text-sm font-bold text-white">Voltar ao login</Link>
          </div>
        ) : (
          <form onSubmit={enviar} className="space-y-4">
            <p className="text-sm text-slate-600">Informe o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha.</p>
            <Rotulo texto="E-mail">
              <Entrada type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus />
            </Rotulo>
            <Botao type="submit" className="w-full" disabled={carregando}>
              {carregando ? 'Enviando…' : 'Enviar link'}
            </Botao>
            <Link to="/entrar" className="flex items-center justify-center gap-1 text-sm font-semibold text-primaria-700 hover:underline">
              <ArrowLeft className="size-4" /> Voltar ao login
            </Link>
          </form>
        )}
      </div>
    </div>
  )
}
