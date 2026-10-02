import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, BarChart3, Heart, LayoutGrid, Lock, Play, Smartphone, Sparkles, Volume2, WifiOff } from 'lucide-react'
import { Logo } from '../components/Logo'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { EMAIL_DEMO, SENHA_DEMO } from '../data/seed'
import { marcarDemonstracao, useEncerrarDemonstracao } from '../lib/demonstracao'

const rolarPara = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

/** Tela inicial do sistema (Figura 4). */
export default function Inicio() {
  const { mediador, entrar } = useApp()
  const navegar = useNavigate()
  const avisar = useToast()
  useEncerrarDemonstracao()

  async function verDemonstracao() {
    if (!mediador) {
      const r = await entrar(EMAIL_DEMO, SENHA_DEMO)
      if (!r.ok) {
        avisar('A conta de demonstração foi removida. Use "Restaurar demonstração" nas Configurações ou crie uma conta.', 'aviso')
        navegar('/entrar')
        return
      }
      marcarDemonstracao(true)
    }
    navegar('/prancha/cri-lucas', { state: { voltar: true } })
  }

  const beneficios = [
    { icone: Volume2, titulo: 'Voz na hora', texto: 'Ao tocar no cartão, o aparelho fala em português do Brasil, sem depender de internet.' },
    { icone: LayoutGrid, titulo: 'Pranchas personalizáveis', texto: 'Categorias e pictogramas organizados e ajustados ao nível de cada criança.' },
    { icone: WifiOff, titulo: 'Funciona offline', texto: 'Aplicativo web progressivo (PWA): instale na tela inicial e use mesmo sem conexão.' },
    { icone: BarChart3, titulo: 'Relatórios de uso', texto: 'Acompanhe os cartões e as categorias mais usados para apoiar a evolução da criança.' },
    { icone: Lock, titulo: 'Privacidade (LGPD)', texto: 'Coletamos o mínimo: apenas apelido e faixa etária, com consentimento do responsável.' },
    { icone: Smartphone, titulo: 'Qualquer aparelho', texto: 'Roda no navegador do celular, tablet ou computador, sem loja de aplicativos.' },
  ]

  const passos = [
    { n: 1, titulo: 'Crie sua conta', texto: 'O responsável, professor ou terapeuta cria uma conta gratuita.' },
    { n: 2, titulo: 'Cadastre a criança', texto: 'Informe o apelido, a faixa etária e as preferências de voz e de tela.' },
    { n: 3, titulo: 'Ajuste a prancha', texto: 'Escolha as categorias e os cartões que fazem sentido para ela.' },
    { n: 4, titulo: 'Comunique!', texto: 'A criança toca nos cartões, monta a frase e o aplicativo fala por ela.' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-primaria-50/50 to-white">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo subtitulo="CAA" />
          <nav className="hidden gap-6 text-sm font-semibold text-primaria-700 md:flex">
            <button onClick={() => rolarPara('beneficios')} className="hover:underline">Benefícios</button>
            <button onClick={() => rolarPara('como-funciona')} className="hover:underline">Como funciona</button>
            <button onClick={() => rolarPara('depoimentos')} className="hover:underline">Depoimentos</button>
          </nav>
          <div className="flex gap-2">
            <Link to={mediador ? '/painel' : '/entrar'} className="rounded-xl border border-primaria-600 px-4 py-2 text-sm font-bold text-primaria-700 hover:bg-primaria-50">
              {mediador ? 'Painel' : 'Entrar'}
            </Link>
            <Link to="/criar-conta" className="hidden rounded-xl bg-primaria-600 px-4 py-2 text-sm font-bold text-white hover:bg-primaria-700 sm:inline-block">
              Criar Conta Grátis
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
            <Sparkles className="size-3.5" /> CAA Digital · Grátis · Sem cartão
          </span>
          <h1 className="mt-5 text-4xl leading-tight font-black text-tinta sm:text-5xl">
            Dê <span className="text-primaria-600 underline decoration-yellow-300 decoration-4 underline-offset-8">voz</span> a quem merece ser <span className="text-green-500">ouvido</span>
          </h1>
          <p className="mt-5 max-w-lg text-lg text-slate-600">
            Plataforma de <strong className="text-primaria-700">Comunicação Aumentativa e Alternativa</strong> para crianças com TEA, dificuldades de fala e neurodivergências.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/criar-conta" className="inline-flex items-center gap-2 rounded-xl bg-primaria-600 px-5 py-3 font-bold text-white shadow-md hover:bg-primaria-700">
              Começar gratuitamente <ArrowRight className="size-4" />
            </Link>
            <button onClick={verDemonstracao} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-tinta hover:bg-slate-50">
              <Play className="size-4" /> Ver demonstração
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
            <span>✅ 100% gratuito</span>
            <span>🔒 Dados seguros (LGPD)</span>
            <span>📱 Mobile-first</span>
          </div>
        </div>

        {/* Ilustração: mini prancha */}
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-6 rounded-full bg-primaria-100/60 blur-2xl" />
          <div className="relative rounded-3xl border border-slate-100 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-2">
              <span className="rounded-lg bg-green-50 px-2 py-1 text-xs font-bold">✋ Quero</span>
              <span className="rounded-lg bg-orange-50 px-2 py-1 text-xs font-bold">💧 Água</span>
              <span className="ml-auto inline-flex items-center gap-1 rounded-lg bg-primaria-600 px-2.5 py-1 text-xs font-bold text-white">
                <Volume2 className="size-3.5" /> Falar
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ['🍽️', 'Alimentação', 'bg-orange-50'],
                ['😊', 'Sentimentos', 'bg-pink-50'],
                ['🏃', 'Ações', 'bg-green-50'],
                ['👫', 'Pessoas', 'bg-sky-50'],
                ['🏠', 'Lugares', 'bg-teal-50'],
                ['🙏', 'Necessidades', 'bg-yellow-50'],
              ].map(([e, n, c]) => (
                <div key={n} className={`flex flex-col items-center gap-1 rounded-2xl ${c} py-4`}>
                  <span className="pictograma text-3xl">{e}</span>
                  <span className="text-[11px] font-bold">{n}</span>
                </div>
              ))}
            </div>
            <div className="absolute -top-4 -right-3 rounded-2xl bg-primaria-600 px-3 py-2 text-xs font-bold text-white shadow-lg">
              “Eu quero água” 🔊
            </div>
            <div className="pictograma absolute -bottom-6 -left-6 flex size-20 items-center justify-center rounded-full border-4 border-white bg-yellow-100 text-5xl shadow-lg" aria-hidden>
              🧒
            </div>
          </div>
        </div>
      </section>

      <section id="beneficios" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        <h2 className="text-center text-3xl font-black">Benefícios</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">Pensado com base nas heurísticas de Nielsen: simples, previsível e com resposta imediata.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {beneficios.map(({ icone: Icone, titulo, texto }) => (
            <div key={titulo} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-3 inline-flex rounded-2xl bg-primaria-50 p-3 text-primaria-600">
                <Icone className="size-6" />
              </div>
              <h3 className="font-extrabold">{titulo}</h3>
              <p className="mt-1 text-sm text-slate-600">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-20 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-black">Como funciona</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {passos.map((p) => (
              <div key={p.n} className="rounded-3xl bg-fundo p-6">
                <div className="flex size-10 items-center justify-center rounded-full bg-primaria-600 font-black text-white">{p.n}</div>
                <h3 className="mt-3 font-extrabold">{p.titulo}</h3>
                <p className="mt-1 text-sm text-slate-600">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="depoimentos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        <h2 className="text-center text-3xl font-black">Depoimentos</h2>
        <p className="mt-2 text-center text-xs text-slate-500">Exemplos ilustrativos do protótipo; os depoimentos reais virão dos testes de usabilidade.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            ['“Agora ele consegue me dizer quando está com fome ou com dor, sem chorar.”', 'Mãe de uma criança de 6 anos'],
            ['“Consigo montar a prancha de cada aluno em poucos minutos e acompanhar o uso.”', 'Professora do AEE'],
            ['“A voz responde na hora, isso faz toda a diferença no atendimento.”', 'Fonoaudióloga'],
          ].map(([t, a]) => (
            <figure key={a} className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <Heart className="size-5 text-pink-400" />
              <blockquote className="mt-3 text-slate-700">{t}</blockquote>
              <figcaption className="mt-3 text-sm font-bold text-slate-500">{a}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-xs text-slate-500">
        <div className="mb-2 flex justify-center gap-4 font-bold text-primaria-700">
          <Link to="/privacidade" className="hover:underline">Privacidade (LGPD)</Link>
          <Link to="/instalar" className="hover:underline">Instalar aplicativo</Link>
          <Link to="/entrar" className="hover:underline">Entrar</Link>
        </div>
        Minha Voz — CAA · Projeto de TCC (IFG Câmpus Uruaçu, ADS, 2026) · Código aberto e gratuito
      </footer>
    </div>
  )
}
