import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Delete, Maximize2, Settings, Trash2, Volume2 } from 'lucide-react'
import { Pictograma } from '../components/Pictograma'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useOnline } from '../lib/useOnline'
import { falar } from '../lib/fala'
import { CORES } from '../lib/cores'
import { cn, uid } from '../lib/utils'
import { emDemonstracao } from '../lib/demonstracao'
import type { Cartao, Categoria, PerfilCrianca, TamanhoCartao } from '../types'

interface ItemFrase {
  chave: string
  cartao: Cartao
}

const GRADE: Record<TamanhoCartao, string> = {
  Pequeno: 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8',
  Médio: 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  Grande: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
}
const ICONE: Record<TamanhoCartao, string> = {
  Pequeno: 'text-4xl size-10',
  Médio: 'text-5xl size-14',
  Grande: 'text-6xl size-20',
}
const TEXTO: Record<TamanhoCartao, string> = {
  Pequeno: 'text-sm',
  Médio: 'text-base',
  Grande: 'text-lg',
}

function idDaSessao(criancaId: string): string {
  const chave = `minha-voz:sessao-uso:${criancaId}`
  try {
    const existente = sessionStorage.getItem(chave)
    if (existente) return existente
    const nova = uid('ses-')
    sessionStorage.setItem(chave, nova)
    return nova
  } catch {
    return uid('ses-')
  }
}

/**
 * Prancha de comunicação da criança (Figuras 9 e 10) — RF03, RF04, UC-06, UC-07, UC-08.
 * Fluxo do Diagrama de Atividades: tocar nos cartões -> frase em construção -> "Falar"
 * -> se não houver cartões, mostra alerta; senão concatena os textos e fala em pt-BR.
 */
export default function Prancha() {
  const { criancaId = '', categoriaId } = useParams()
  const { criancas, categorias, cartoes, config, registrarUso, registrarFrase } = useApp()
  const navegar = useNavigate()
  const local = useLocation()
  const avisar = useToast()
  const demonstracao = emDemonstracao()
  // De onde a prancha foi aberta (tela inicial, Crianças, Dashboard...): ao sair, volta para lá.
  const estado = local.state as { voltar?: boolean; doQuadro?: boolean } | null
  const sairDaPrancha = () => (estado?.voltar ? navegar(-1) : navegar(demonstracao ? '/' : '/painel/criancas', { replace: true }))
  const voltarAsCategorias = () => (estado?.doQuadro ? navegar(-1) : navegar(`/prancha/${criancaId}`, { replace: true }))
  const crianca = criancas.find((c) => c.id === criancaId)
  const [frase, setFrase] = useState<ItemFrase[]>([])
  const [tocado, setTocado] = useState<string | null>(null)
  const [verFrase, setVerFrase] = useState(false)
  const [falando, setFalando] = useState(false)
  const online = useOnline()
  const sessaoId = useMemo(() => idDaSessao(criancaId), [criancaId])

  const categoriasVisiveis = useMemo(
    () => (crianca ? categorias.filter((c) => c.ativa && crianca.prancha.categoriasVisiveis.includes(c.id)) : []),
    [categorias, crianca],
  )
  const ocultos = useMemo(() => new Set(crianca?.prancha.cartoesOcultos ?? []), [crianca])
  const disponivel = (c: Cartao) => c.ativo && !ocultos.has(c.id)
  const atalhos = cartoes.filter((c) => disponivel(c) && c.atalho)
  const categoriaAtual = categoriasVisiveis.find((c) => c.id === categoriaId)

  if (!crianca) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="pictograma text-5xl">🤔</div>
        <p className="font-bold">Prancha não encontrada.</p>
        <Link to="/painel/criancas" className="font-bold text-primaria-700">Voltar para as crianças</Link>
      </div>
    )
  }

  const contraste = crianca.altoContraste
  const opcoesVoz = {
    preferencia: crianca.preferenciaVoz,
    velocidade: crianca.velocidadeVoz,
    tom: config.tomVoz,
    vozFeminina: config.vozPreferidaFeminina,
    vozMasculina: config.vozPreferidaMasculina,
  }

  function tocarCartao(cartao: Cartao) {
    setFrase((f) => [...f, { chave: uid(), cartao }])
    setTocado(cartao.id)
    setTimeout(() => setTocado(null), 260)
    if (config.falarAoTocar) falar(cartao.texto, opcoesVoz)
    registrarUso(crianca!.id, cartao, sessaoId)
  }

  function falarFrase() {
    if (frase.length === 0) {
      avisar('Toque nos cartões para montar a frase.', 'aviso')
      return
    }
    const texto = frase.map((i) => i.cartao.texto).join(' ')
    const ok = falar(texto, opcoesVoz)
    if (!ok) avisar('Este navegador não tem síntese de voz.', 'aviso')
    registrarFrase(crianca!.id, texto)
    setFalando(true)
    setTimeout(() => setFalando(false), 1200)
  }

  const cartoesDaCategoria = categoriaAtual
    ? cartoes.filter((c) => disponivel(c) && c.categoriaId === categoriaAtual.id && !c.atalho)
    : []

  return (
    <div className={cn('flex min-h-screen flex-col', contraste ? 'bg-black text-white' : 'bg-fundo')}>
      {/* Cabeçalho */}
      <header className={cn('flex items-center gap-3 px-3 py-2.5 sm:px-5', contraste ? 'bg-black' : 'bg-white shadow-sm')}>
        <BotaoSegurar
          rotulo={categoriaAtual ? 'Voltar às categorias' : 'Sair da prancha (segure)'}
          exigeSegurar={!categoriaAtual}
          aoAcionar={categoriaAtual ? voltarAsCategorias : sairDaPrancha}
          aoToqueCurto={() => avisar('Segure o botão para sair da prancha.', 'info')}
          contraste={contraste}
        >
          <ArrowLeft className="size-6" />
        </BotaoSegurar>
        <span className={cn('pictograma flex size-10 items-center justify-center rounded-full text-2xl', categoriaAtual ? CORES[categoriaAtual.cor].fundo : 'bg-primaria-50')}>
          {categoriaAtual?.emoji ?? crianca.avatar}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="truncate font-extrabold">{categoriaAtual ? categoriaAtual.nome : `Prancha de ${crianca.nomeApelido}`}</h1>
          <p className={cn('truncate text-xs', contraste ? 'text-slate-300' : 'text-slate-500')}>
            {categoriaAtual ? `${cartoesDaCategoria.length + atalhos.length} cartões disponíveis` : 'Toque nos cartões para falar'}
          </p>
        </div>
        {categoriaAtual && (
          <button
            onClick={() => (frase.length ? setVerFrase(true) : avisar('A frase ainda está vazia.', 'info'))}
            className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold', contraste ? 'bg-white text-black' : 'bg-primaria-50 text-primaria-700')}
          >
            <Maximize2 className="size-3.5" /> Ver frase
          </button>
        )}
        {/* Na demonstração a pessoa não entra no painel da conta de exemplo */}
        {!categoriaAtual && !demonstracao && (
          <BotaoSegurar
            rotulo="Configurar prancha (segure)"
            exigeSegurar
            aoAcionar={() => navegar(`/painel/criancas/${crianca.id}`)}
            aoToqueCurto={() => avisar('Segure o botão para abrir as configurações.', 'info')}
            contraste={contraste}
          >
            <Settings className="size-5" />
          </BotaoSegurar>
        )}
      </header>

      {!online && (
        <div className={cn('px-4 py-1.5 text-center text-xs font-bold', contraste ? 'bg-yellow-300 text-black' : 'bg-yellow-100 text-yellow-900')}>
          Você está offline — a prancha continua funcionando com os recursos já carregados.
        </div>
      )}

      {/* Barra da frase em construção */}
      <div className="px-3 pt-3 sm:px-5">
        <div
          className={cn(
            'flex min-h-16 items-center gap-2 rounded-2xl border-2 p-2 transition-colors',
            contraste ? 'border-yellow-300 bg-black' : 'border-slate-200 bg-white',
            falando && (contraste ? 'border-white' : 'border-primaria-500 bg-primaria-50'),
          )}
        >
          <div className="flex flex-1 gap-1.5 overflow-x-auto py-0.5" aria-live="polite" aria-label="Frase em construção">
            {frase.length === 0 && <span className={cn('px-2 text-sm', contraste ? 'text-slate-300' : 'text-slate-400')}><span className="hidden sm:inline">Toque nos cartões para montar a frase…</span><span className="sm:hidden">Monte a frase…</span></span>}
            {frase.map((i) => (
              <button
                key={i.chave}
                onClick={() => falar(i.cartao.texto, opcoesVoz)}
                className={cn('animar-surgir flex shrink-0 flex-col items-center rounded-xl px-2 py-1', contraste ? 'bg-white text-black' : 'bg-slate-50')}
                title={`Ouvir "${i.cartao.texto}"`}
              >
                <Pictograma imagem={i.cartao.imagemUrl} texto={i.cartao.texto} className="size-7 text-2xl" />
                {crianca.mostrarTexto && <span className="text-[11px] font-bold">{i.cartao.texto}</span>}
              </button>
            ))}
          </div>
          <button
            onClick={() => setFrase((f) => f.slice(0, -1))}
            className={cn('flex size-11 shrink-0 items-center justify-center rounded-full', contraste ? 'bg-white text-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
            aria-label="Apagar último cartão"
            title="Apagar último"
          >
            <Delete className="size-5" />
          </button>
          <button
            onClick={() => setFrase([])}
            className={cn('flex h-11 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-bold', contraste ? 'bg-white text-red-700' : 'bg-red-50 text-red-600 hover:bg-red-100')}
            aria-label="Limpar frase"
            title="Limpar tudo"
          >
            <Trash2 className="size-5" /> <span className="hidden sm:inline">Limpar</span>
          </button>
          <button
            onClick={falarFrase}
            className={cn(
              'flex h-11 shrink-0 items-center gap-1.5 rounded-full px-4 font-extrabold text-white sm:px-5',
              contraste ? 'bg-yellow-400 text-black' : frase.length ? 'bg-primaria-600 hover:bg-primaria-700' : 'bg-primaria-200',
            )}
          >
            <Volume2 className="size-5" /> Falar
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <main className="flex-1 p-3 sm:p-5">
        {!categoriaAtual ? (
          <div className={cn('grid gap-3', GRADE[crianca.tamanhoCartao])}>
            {categoriasVisiveis.map((c) => (
              <BlocoCategoria key={c.id} categoria={c} crianca={crianca} qtd={cartoes.filter((k) => disponivel(k) && k.categoriaId === c.id && !k.atalho).length} aoAbrir={() => navegar(`/prancha/${crianca.id}/${c.id}`, { state: { doQuadro: true } })} />
            ))}
            {atalhos.map((c) => (
              <BlocoCartao key={c.id} cartao={c} crianca={crianca} categoria={categorias.find((k) => k.id === c.categoriaId)} tocado={tocado === c.id} aoTocar={() => tocarCartao(c)} formato="aspect-[4/3]" />
            ))}
            {categoriasVisiveis.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm opacity-70">Nenhuma categoria visível. O mediador pode escolhê-las no perfil da criança.</p>
            )}
          </div>
        ) : (
          <div className={cn('grid gap-3', GRADE[crianca.tamanhoCartao])}>
            {[...atalhos, ...cartoesDaCategoria].map((c) => (
              <BlocoCartao key={c.id} cartao={c} crianca={crianca} categoria={categorias.find((k) => k.id === c.categoriaId)} tocado={tocado === c.id} aoTocar={() => tocarCartao(c)} />
            ))}
            {cartoesDaCategoria.length === 0 && (
              <p className="col-span-full py-10 text-center text-sm opacity-70">Ainda não há cartões nesta categoria. O mediador pode criá-los em Cartões › Novo cartão.</p>
            )}
          </div>
        )}
      </main>

      {/* "Ver frase": frase grande para mostrar ao parceiro de comunicação */}
      {verFrase && (
        <div className={cn('fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 p-6', contraste ? 'bg-black' : 'bg-white')} onClick={() => setVerFrase(false)}>
          <div className="flex flex-wrap items-end justify-center gap-4">
            {frase.map((i) => (
              <div key={i.chave} className="flex flex-col items-center gap-2">
                <Pictograma imagem={i.cartao.imagemUrl} texto={i.cartao.texto} className="size-24 text-8xl" />
                <span className="text-2xl font-black">{i.cartao.texto}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation()
                falarFrase()
              }}
              className="inline-flex items-center gap-2 rounded-full bg-primaria-600 px-6 py-3 text-lg font-extrabold text-white"
            >
              <Volume2 className="size-6" /> Falar
            </button>
            <button className={cn('rounded-full px-6 py-3 text-lg font-bold', contraste ? 'bg-white text-black' : 'bg-slate-100')}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  )
}

function BlocoCategoria({ categoria, crianca, qtd, aoAbrir }: { categoria: Categoria; crianca: PerfilCrianca; qtd: number; aoAbrir: () => void }) {
  const cor = CORES[categoria.cor]
  const t = crianca.tamanhoCartao
  return (
    <button
      onClick={aoAbrir}
      className={cn(
        'flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-3xl p-2 text-center transition-transform active:scale-95',
        crianca.altoContraste ? 'border-4 border-yellow-300 bg-white text-black' : cn('border-2', cor.fundo, cor.borda),
      )}
    >
      <Pictograma imagem={categoria.emoji} texto={categoria.nome} className={ICONE[t]} />
      {crianca.mostrarTexto && <span className={cn('font-extrabold', TEXTO[t])}>{categoria.nome}</span>}
      <span className={cn('text-xs', crianca.altoContraste ? 'text-slate-700' : 'text-slate-500')}>{qtd} cartões</span>
    </button>
  )
}

function BlocoCartao({ cartao, crianca, categoria, tocado, aoTocar, formato = 'aspect-square' }: {
  cartao: Cartao
  crianca: PerfilCrianca
  categoria?: Categoria
  tocado: boolean
  aoTocar: () => void
  formato?: string
}) {
  const cor = CORES[categoria?.cor ?? 'cinza']
  const t = crianca.tamanhoCartao
  const vermelho = cartao.texto.toLowerCase().startsWith('não')
  return (
    <button
      onClick={aoTocar}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-3xl p-2 text-center shadow-sm',
        formato,
        tocado && 'animar-toque ring-4 ring-primaria-500',
        crianca.altoContraste ? 'border-4 border-white bg-white text-black' : cn('border-2', cor.fundo, cor.borda),
      )}
    >
      <Pictograma imagem={cartao.imagemUrl} texto={cartao.texto} className={ICONE[t]} />
      {crianca.mostrarTexto && <span className={cn('leading-tight font-extrabold', TEXTO[t], vermelho && !crianca.altoContraste && 'text-red-600')}>{cartao.texto}</span>}
    </button>
  )
}

/**
 * Botão que precisa ser segurado para agir. Evita que a criança saia da prancha
 * ou abra as configurações sem querer (prevenção de erros, heurística de Nielsen).
 */
function BotaoSegurar({ children, rotulo, aoAcionar, aoToqueCurto, exigeSegurar, contraste }: {
  children: React.ReactNode
  rotulo: string
  aoAcionar: () => void
  aoToqueCurto: () => void
  exigeSegurar: boolean
  contraste: boolean
}) {
  const [segurando, setSegurando] = useState(false)
  const timer = useRef<number | null>(null)
  const acionou = useRef(false)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const iniciar = () => {
    if (!exigeSegurar) return
    acionou.current = false
    setSegurando(true)
    timer.current = window.setTimeout(() => {
      acionou.current = true
      setSegurando(false)
      aoAcionar()
    }, 1200)
  }
  const cancelar = () => {
    if (timer.current) clearTimeout(timer.current)
    setSegurando(false)
  }

  return (
    <button
      aria-label={rotulo}
      title={rotulo}
      onPointerDown={iniciar}
      onPointerUp={cancelar}
      onPointerLeave={cancelar}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (!exigeSegurar) return aoAcionar()
        if (!acionou.current) aoToqueCurto()
      }}
      className={cn('relative flex size-11 shrink-0 items-center justify-center rounded-full select-none', contraste ? 'bg-white text-black' : 'bg-slate-100 text-slate-700')}
    >
      {segurando && (
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="20" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="126" strokeDashoffset="126" className="text-primaria-500" style={{ animation: 'segurar 1.2s linear forwards' }} />
        </svg>
      )}
      {children}
    </button>
  )
}
