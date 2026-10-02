import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Database, EyeOff, Lock, ShieldCheck, Trash2, UserCheck } from 'lucide-react'
import { useApp } from '../store/AppStore'

/** Consentimento e privacidade (tela 5) — RF06 / RNF06, LGPD (Lei nº 13.709/2018). */
export default function Privacidade() {
  const { mediador } = useApp()
  const navegar = useNavigate()
  const itens = [
    { icone: EyeOff, titulo: 'Coleta mínima', texto: 'Da criança guardamos só apelido, faixa etária, preferências da prancha e observações assistivas curtas. Nunca nome completo, foto do rosto, laudo ou dados clínicos.' },
    { icone: UserCheck, titulo: 'Consentimento do responsável', texto: 'A conta só é criada com o aceite do responsável legal (ou de quem tem a autorização dele). O aceite fica registrado com data e hora.' },
    { icone: Lock, titulo: 'Acesso protegido', texto: 'Somente o mediador autenticado vê as pranchas e os relatórios. A senha é guardada apenas como hash (PBKDF2/SHA-256), nunca em texto puro.' },
    { icone: Database, titulo: 'Onde ficam os dados', texto: 'No próprio aparelho (para funcionar offline) e, quando conectado, no servidor do projeto (API Flask + banco MySQL ou Cloud Firestore). A voz é gerada no aparelho: nada do que a criança fala é enviado para a internet.' },
    { icone: ShieldCheck, titulo: 'Finalidade', texto: 'Os dados servem só para montar a prancha e acompanhar a evolução da comunicação. Não há anúncios nem compartilhamento com terceiros.' },
    { icone: Trash2, titulo: 'Seus direitos', texto: 'Você pode ver, exportar e apagar todos os dados a qualquer momento em Configurações > Privacidade e LGPD.' },
  ]
  return (
    <div className="min-h-screen bg-fundo px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <button onClick={() => navegar(-1)} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-tinta">
          <ArrowLeft className="size-4" /> Voltar
        </button>
        <h1 className="text-3xl font-black">Privacidade e consentimento</h1>
        <p className="mt-1 text-slate-600">Como o Minha Voz protege as informações da criança, de acordo com a LGPD.</p>
        <div className="mt-6 space-y-3">
          {itens.map(({ icone: Icone, titulo, texto }) => (
            <div key={titulo} className="flex gap-4 rounded-3xl bg-white p-5 shadow-sm">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                <Icone className="size-5" />
              </span>
              <div>
                <h2 className="font-extrabold">{titulo}</h2>
                <p className="mt-0.5 text-sm text-slate-600">{texto}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {mediador ? (
            <Link to="/painel/configuracoes" className="rounded-xl bg-primaria-600 px-5 py-3 font-bold text-white">Gerenciar meus dados</Link>
          ) : (
            <Link to="/criar-conta" className="rounded-xl bg-primaria-600 px-5 py-3 font-bold text-white">Concordo, criar conta</Link>
          )}
        </div>
      </div>
    </div>
  )
}
