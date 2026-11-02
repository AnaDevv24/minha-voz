import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, GripVertical, Play, Volume2 } from 'lucide-react'
import { Botao, Selecao } from '../components/Campo'
import { Interruptor } from '../components/Interruptor'
import { Pictograma } from '../components/Pictograma'
import { useApp } from '../store/AppStore'
import { falar } from '../lib/fala'
import { CORES } from '../lib/cores'
import { cn } from '../lib/utils'
import type { PerfilCrianca, PreferenciaVoz, TamanhoCartao } from '../types'

/**
 * Personalização da prancha (tela 15 / "Personalização da Prancha") — RF05.
 * Tamanho, contraste, texto, voz e velocidade; categorias e cartões visíveis;
 * reorganização por arrastar e soltar (ou pelas setas, no celular).
 */
export default function PersonalizarPrancha() {
  const { id } = useParams()
  const { criancas, categorias, cartoes, salvarCrianca, reordenarCategorias, reordenarCartoes, config } = useApp()
  const navegar = useNavigate()
  const crianca = criancas.find((c) => c.id === id)
  const [categoriaAberta, setCategoriaAberta] = useState(categorias[0]?.id ?? '')

  if (!crianca) {
    return (
      <p>
        Criança não encontrada. <Link to="/painel/criancas" className="font-bold text-primaria-700">Voltar</Link>
      </p>
    )
  }

  const atualizar = (parcial: Partial<PerfilCrianca>) => salvarCrianca({ ...crianca, ...parcial })
  const atualizarPrancha = (parcial: Partial<PerfilCrianca['prancha']>) => atualizar({ prancha: { ...crianca.prancha, ...parcial } })
  const visiveis = crianca.prancha.categoriasVisiveis
  const ocultos = crianca.prancha.cartoesOcultos
  const cartoesDaCategoria = cartoes.filter((c) => c.categoriaId === categoriaAberta)

  return (
    <div className="mx-auto max-w-3xl">
      <button onClick={() => navegar(-1)} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-tinta">
        <ArrowLeft className="size-4" /> Voltar
      </button>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="pictograma flex size-14 items-center justify-center rounded-2xl bg-primaria-50 text-4xl">{crianca.avatar}</span>
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold">Personalizar prancha</h1>
          <p className="text-sm text-slate-500">
            {crianca.nomeApelido} · as alterações são salvas automaticamente
          </p>
        </div>
        <Link to={`/prancha/${crianca.id}`} state={{ voltar: true }} className="inline-flex items-center gap-1.5 rounded-full bg-primaria-600 px-4 py-2 text-sm font-bold text-white">
          <Play className="size-4" /> Abrir prancha
        </Link>
      </div>

      <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-extrabold">Aparência e voz</h2>
        <div>
          <span className="mb-1.5 block text-sm font-bold">Tamanho dos cartões</span>
          <div className="grid grid-cols-3 gap-2">
            {(['Pequeno', 'Médio', 'Grande'] as TamanhoCartao[]).map((t) => (
              <button
                key={t}
                onClick={() => atualizar({ tamanhoCartao: t })}
                className={cn('rounded-xl border py-2 text-sm font-bold', crianca.tamanhoCartao === t ? 'border-primaria-600 bg-primaria-50 text-primaria-700' : 'border-slate-200 text-slate-500')}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <Opcao titulo="Alto contraste" texto="Fundo escuro e cartões com borda forte">
          <Interruptor ligado={crianca.altoContraste} aoMudar={(v) => atualizar({ altoContraste: v })} rotulo="Alto contraste" />
        </Opcao>
        <Opcao titulo="Mostrar texto nos cartões" texto="Desligue para usar só as figuras">
          <Interruptor ligado={crianca.mostrarTexto} aoMudar={(v) => atualizar({ mostrarTexto: v })} rotulo="Mostrar texto" />
        </Opcao>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Preferência de voz</span>
            <Selecao value={crianca.preferenciaVoz} onChange={(e) => atualizar({ preferenciaVoz: e.target.value as PreferenciaVoz })}>
              <option>Feminina</option>
              <option>Masculina</option>
            </Selecao>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-bold">Velocidade da fala: {crianca.velocidadeVoz.toFixed(2)}x</span>
            <input type="range" min={0.5} max={1.5} step={0.05} value={crianca.velocidadeVoz} onChange={(e) => atualizar({ velocidadeVoz: Number(e.target.value) })} className="mt-2 w-full accent-primaria-600" />
          </label>
        </div>
        <Botao
          variante="contorno"
          onClick={() =>
            falar('Eu quero água', {
              preferencia: crianca.preferenciaVoz,
              velocidade: crianca.velocidadeVoz,
              tom: config.tomVoz,
              vozFeminina: config.vozPreferidaFeminina,
              vozMasculina: config.vozPreferidaMasculina,
            })
          }
        >
          <Volume2 className="size-4" /> Testar voz
        </Botao>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-extrabold">Categorias</h2>
        <p className="mb-3 text-xs text-slate-500">Marque as que aparecem para {crianca.nomeApelido}. Arraste (ou use as setas) para mudar a ordem.</p>
        <ListaArrastavel
          ids={categorias.map((c) => c.id)}
          aoReordenar={reordenarCategorias}
          renderizar={(catId, controles) => {
            const c = categorias.find((k) => k.id === catId)!
            const marcado = visiveis.includes(c.id)
            return (
              <div className={cn('flex items-center gap-3 rounded-2xl border p-2.5', marcado ? cn(CORES[c.cor].fundo, CORES[c.cor].borda) : 'border-slate-200 opacity-70')}>
                {controles}
                <span className="pictograma text-2xl">{c.emoji}</span>
                <span className="flex-1 font-bold">
                  {c.nome}
                  {!c.ativa && <span className="ml-2 text-xs font-normal text-slate-500">(desativada para todos)</span>}
                </span>
                <Interruptor
                  ligado={marcado}
                  aoMudar={(v) => atualizarPrancha({ categoriasVisiveis: v ? [...visiveis, c.id] : visiveis.filter((x) => x !== c.id) })}
                  rotulo={`Mostrar ${c.nome}`}
                />
              </div>
            )
          }}
        />
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-extrabold">Cartões</h2>
        <p className="mb-3 text-xs text-slate-500">Toque no olho para mostrar/ocultar só para {crianca.nomeApelido}. Arraste para reorganizar.</p>
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {categorias.map((c) => (
            <button
              key={c.id}
              onClick={() => setCategoriaAberta(c.id)}
              className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold', categoriaAberta === c.id ? 'bg-primaria-600 text-white' : 'bg-slate-100 text-slate-600')}
            >
              {c.emoji} {c.nome}
            </button>
          ))}
        </div>
        {cartoesDaCategoria.length === 0 && <p className="py-6 text-center text-sm text-slate-500">Esta categoria ainda não tem cartões.</p>}
        <ListaArrastavel
          ids={cartoesDaCategoria.map((c) => c.id)}
          aoReordenar={reordenarCartoes}
          grade
          renderizar={(cartaoId, controles) => {
            const c = cartoes.find((k) => k.id === cartaoId)!
            const oculto = ocultos.includes(c.id) || !c.ativo
            return (
              <div className={cn('flex items-center gap-2 rounded-2xl border border-slate-200 p-2', oculto && 'opacity-50')}>
                {controles}
                <Pictograma imagem={c.imagemUrl} texto={c.texto} className="size-8 text-2xl" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{c.texto}</span>
                <button
                  disabled={!c.ativo}
                  onClick={() => atualizarPrancha({ cartoesOcultos: ocultos.includes(c.id) ? ocultos.filter((x) => x !== c.id) : [...ocultos, c.id] })}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed"
                  title={!c.ativo ? 'Cartão oculto para todos (em Cartões)' : oculto ? 'Mostrar' : 'Ocultar'}
                  aria-label={oculto ? `Mostrar ${c.texto}` : `Ocultar ${c.texto}`}
                >
                  {oculto ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            )
          }}
        />
      </section>
    </div>
  )
}

function Opcao({ titulo, texto, children }: { titulo: string; texto: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
      <div>
        <div className="text-sm font-bold">{titulo}</div>
        <div className="text-xs text-slate-500">{texto}</div>
      </div>
      {children}
    </div>
  )
}

/** Lista com arrastar e soltar (mouse) e setas (toque/teclado). */
function ListaArrastavel({ ids, aoReordenar, renderizar, grade = false }: {
  ids: string[]
  aoReordenar: (ids: string[]) => void
  renderizar: (id: string, controles: ReactNode) => ReactNode
  grade?: boolean
}) {
  const [arrastando, setArrastando] = useState<string | null>(null)
  const [sobre, setSobre] = useState<string | null>(null)

  const mover = (de: number, para: number) => {
    if (para < 0 || para >= ids.length) return
    const nova = [...ids]
    const [item] = nova.splice(de, 1)
    nova.splice(para, 0, item)
    aoReordenar(nova)
  }

  return (
    <ul className={cn(grade ? 'grid gap-2 sm:grid-cols-2' : 'space-y-2')}>
      {ids.map((id, i) => (
        <li
          key={id}
          draggable
          onDragStart={(e) => {
            setArrastando(id)
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setSobre(id)
          }}
          onDragLeave={() => setSobre((s) => (s === id ? null : s))}
          onDrop={(e) => {
            e.preventDefault()
            if (arrastando && arrastando !== id) mover(ids.indexOf(arrastando), i)
            setArrastando(null)
            setSobre(null)
          }}
          onDragEnd={() => {
            setArrastando(null)
            setSobre(null)
          }}
          className={cn('rounded-2xl transition', arrastando === id && 'opacity-40', sobre === id && arrastando !== id && 'ring-2 ring-primaria-500')}
        >
          {renderizar(
            id,
            <span className="flex shrink-0 items-center">
              <GripVertical className="hidden size-4 cursor-grab text-slate-400 sm:block" aria-hidden />
              <span className="flex flex-col">
                <button onClick={() => mover(i, i - 1)} disabled={i === 0} className="rounded p-0.5 text-slate-400 hover:text-tinta disabled:opacity-30" aria-label="Mover para cima">
                  <ArrowUp className="size-3.5" />
                </button>
                <button onClick={() => mover(i, i + 1)} disabled={i === ids.length - 1} className="rounded p-0.5 text-slate-400 hover:text-tinta disabled:opacity-30" aria-label="Mover para baixo">
                  <ArrowDown className="size-3.5" />
                </button>
              </span>
            </span>,
          )}
        </li>
      ))}
    </ul>
  )
}
