import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Volume2 } from 'lucide-react'
import { AreaTexto, Botao, Entrada, Rotulo, Selecao } from '../components/Campo'
import { Interruptor } from '../components/Interruptor'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useConfirmar } from '../components/Confirmacao'
import { categoriasDoNivel } from '../data/seed'
import { falar } from '../lib/fala'
import { CORES } from '../lib/cores'
import { cn, uid } from '../lib/utils'
import type { FaixaEtaria, NivelPrancha, PerfilCrianca, PreferenciaVoz, TamanhoCartao } from '../types'

const AVATARES = ['👦', '👧', '🧒', '👶', '🧑', '👱', '👦🏽', '👧🏽', '👦🏿', '👧🏿', '🐻', '🦁', '🐼', '🦊', '🐸', '🦄']
const FAIXAS: FaixaEtaria[] = ['2-4 anos', '4-6 anos', '6-8 anos', '8-10 anos', '10-12 anos', '12+ anos']
const NIVEIS: { id: NivelPrancha; texto: string }[] = [
  { id: 'Iniciante', texto: 'Poucas categorias, para começar' },
  { id: 'Básica', texto: 'Categorias do dia a dia' },
  { id: 'Avançada', texto: 'Todas as categorias' },
]

/** Configuração do perfil da criança (Figura 8) — UC-03 / RF02 / RF05 / RNF06. */
export default function PerfilCriancaPage() {
  const { id } = useParams()
  const { criancas, categorias, cartoes, mediador, salvarCrianca, excluirCrianca, config } = useApp()
  const navegar = useNavigate()
  const avisar = useToast()
  const confirmar = useConfirmar()
  const existente = criancas.find((c) => c.id === id)

  const [p, setP] = useState<PerfilCrianca>(
    () =>
      existente ?? {
        id: uid('cri-'),
        mediadorId: mediador!.id,
        nomeApelido: '',
        avatar: '👦',
        faixaEtaria: '4-6 anos',
        observacoes: '',
        preferenciaVoz: 'Feminina',
        tamanhoCartao: 'Médio',
        altoContraste: false,
        mostrarTexto: true,
        velocidadeVoz: 0.95,
        criadoEm: new Date().toISOString(),
        prancha: {
          id: uid('pr-'),
          nome: 'Prancha Iniciante',
          nivel: 'Iniciante',
          dataCriacao: new Date().toISOString(),
          ativa: true,
          categoriasVisiveis: categoriasDoNivel('Iniciante', categorias),
          cartoesOcultos: [],
        },
      },
  )
  const [escolherAvatar, setEscolherAvatar] = useState(false)

  if (id && !existente) {
    return (
      <p className="text-slate-600">
        Criança não encontrada. <Link to="/painel/criancas" className="font-bold text-primaria-700">Voltar</Link>
      </p>
    )
  }

  const mudar = <K extends keyof PerfilCrianca>(k: K, v: PerfilCrianca[K]) => setP((x) => ({ ...x, [k]: v }))
  const mudarNivel = (nivel: NivelPrancha) =>
    setP((x) => ({ ...x, prancha: { ...x.prancha, nivel, nome: `Prancha ${nivel}`, categoriasVisiveis: categoriasDoNivel(nivel, categorias) } }))
  const alternarCategoria = (catId: string) =>
    setP((x) => {
      const vis = x.prancha.categoriasVisiveis
      return { ...x, prancha: { ...x.prancha, categoriasVisiveis: vis.includes(catId) ? vis.filter((c) => c !== catId) : [...vis, catId] } }
    })

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!p.nomeApelido.trim()) return
    salvarCrianca({ ...p, nomeApelido: p.nomeApelido.trim() })
    avisar('Perfil salvo.')
    navegar('/painel/criancas')
  }

  async function excluir() {
    if (!existente) return
    const ok = await confirmar({ titulo: 'Excluir perfil', mensagem: `Excluir o perfil de ${existente.nomeApelido}? O histórico de uso também será apagado.` })
    if (!ok) return
    excluirCrianca(existente.id)
    avisar('Perfil excluído.')
    navegar('/painel/criancas')
  }

  return (
    <div className="mx-auto max-w-xl">
      <button onClick={() => navegar(-1)} className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-tinta">
        <ArrowLeft className="size-4" /> Voltar
      </button>
      <h1 className="text-2xl font-extrabold">{existente ? 'Editar perfil da criança' : 'Cadastrar criança'}</h1>
      <p className="mb-5 text-sm text-slate-500">Configure as preferências de acessibilidade</p>

      <form onSubmit={salvar} className="space-y-5 rounded-3xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col items-center">
          <button type="button" onClick={() => setEscolherAvatar((v) => !v)} className="pictograma flex size-20 items-center justify-center rounded-2xl bg-primaria-50 text-5xl hover:ring-2 hover:ring-primaria-200">
            {p.avatar}
          </button>
          <span className="mt-1 text-xs text-slate-500">Toque para alterar</span>
          {escolherAvatar && (
            <div className="mt-3 grid grid-cols-8 gap-1 rounded-2xl border border-slate-200 p-2">
              {AVATARES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    mudar('avatar', a)
                    setEscolherAvatar(false)
                  }}
                  className={cn('pictograma rounded-lg p-1 text-2xl hover:bg-primaria-50', p.avatar === a && 'bg-primaria-100')}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
        </div>

        <Rotulo texto="Apelido" dica="Por privacidade (LGPD), use apenas um apelido — não o nome completo.">
          <Entrada value={p.nomeApelido} onChange={(e) => mudar('nomeApelido', e.target.value)} required maxLength={20} placeholder="Ex.: Lucas" />
        </Rotulo>
        <Rotulo texto="Faixa etária">
          <Selecao value={p.faixaEtaria} onChange={(e) => mudar('faixaEtaria', e.target.value as FaixaEtaria)}>
            {FAIXAS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Selecao>
        </Rotulo>
        <Rotulo texto="Observações assistivas" dica="Evite dados clínicos ou laudos; anote só o que ajuda no uso da prancha.">
          <AreaTexto value={p.observacoes} onChange={(e) => mudar('observacoes', e.target.value)} placeholder="Ex.: prefere sons suaves, dificuldade com muitas cores…" maxLength={300} />
        </Rotulo>

        <Rotulo texto="Preferência de voz">
          <div className="flex gap-2">
            <Selecao value={p.preferenciaVoz} onChange={(e) => mudar('preferenciaVoz', e.target.value as PreferenciaVoz)}>
              <option>Feminina</option>
              <option>Masculina</option>
            </Selecao>
            <Botao
              type="button"
              variante="contorno"
              className="shrink-0"
              onClick={() =>
                falar(`Olá, eu sou ${p.nomeApelido || 'a Minha Voz'}`, {
                  preferencia: p.preferenciaVoz,
                  velocidade: p.velocidadeVoz,
                  tom: config.tomVoz,
                  vozFeminina: config.vozPreferidaFeminina,
                  vozMasculina: config.vozPreferidaMasculina,
                })
              }
              aria-label="Ouvir voz"
            >
              <Volume2 className="size-4" />
            </Botao>
          </div>
        </Rotulo>

        <div>
          <span className="mb-1.5 block text-sm font-bold">Tamanho dos cartões</span>
          <div className="grid grid-cols-3 gap-2">
            {(['Pequeno', 'Médio', 'Grande'] as TamanhoCartao[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => mudar('tamanhoCartao', t)}
                className={cn('rounded-xl border py-2 text-sm font-bold', p.tamanhoCartao === t ? 'border-primaria-600 bg-primaria-50 text-primaria-700' : 'border-slate-200 text-slate-500')}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
          <div>
            <div className="text-sm font-bold">Alto contraste</div>
            <div className="text-xs text-slate-500">Melhora a visibilidade dos cartões</div>
          </div>
          <Interruptor ligado={p.altoContraste} aoMudar={(v) => mudar('altoContraste', v)} rotulo="Alto contraste" />
        </div>

        <div className="border-t border-slate-100 pt-5">
          <span className="mb-1.5 block text-sm font-bold">Nível da prancha (categorias iniciais)</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {NIVEIS.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => mudarNivel(n.id)}
                className={cn('rounded-xl border p-2.5 text-left', p.prancha.nivel === n.id ? 'border-primaria-600 bg-primaria-50' : 'border-slate-200')}
              >
                <div className="text-sm font-bold">{n.id}</div>
                <div className="text-xs text-slate-500">{n.texto}</div>
              </button>
            ))}
          </div>
          <span className="mt-4 mb-1.5 block text-sm font-bold">Categorias visíveis nesta prancha</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {categorias.map((c) => {
              const marcado = p.prancha.categoriasVisiveis.includes(c.id)
              const qtd = cartoes.filter((k) => k.categoriaId === c.id && k.ativo).length
              return (
                <label key={c.id} className={cn('flex cursor-pointer items-center gap-2 rounded-xl border p-2', marcado ? CORES[c.cor].borda + ' ' + CORES[c.cor].fundo : 'border-slate-200')}>
                  <input type="checkbox" checked={marcado} onChange={() => alternarCategoria(c.id)} className="size-4 accent-primaria-600" />
                  <span className="pictograma text-xl">{c.emoji}</span>
                  <span className="flex-1 text-sm font-semibold">{c.nome}</span>
                  <span className="text-xs text-slate-500">{c.ativa ? `${qtd} cartões` : 'desativada'}</span>
                </label>
              )
            })}
          </div>
        </div>

        <Botao type="submit" className="w-full">
          <Save className="size-4" /> Salvar perfil
        </Botao>
        {existente && (
          <Link to={`/painel/criancas/${existente.id}/personalizar`} className="block w-full rounded-xl border border-primaria-600 py-2.5 text-center text-sm font-bold text-primaria-700 hover:bg-primaria-50">
            Personalizar prancha (ordem, cartões ocultos, texto, velocidade)
          </Link>
        )}
        {existente && (
          <Botao type="button" variante="perigo" className="w-full" onClick={excluir}>
            <Trash2 className="size-4" /> Excluir perfil
          </Botao>
        )}
      </form>
    </div>
  )
}
