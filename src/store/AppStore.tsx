/*
 * Estado global da aplicação (React Context).
 *
 * Offline-first: cada ação grava primeiro no aparelho (localStorage) e, se a API Flask
 * estiver ligada, a alteração é enviada para ela (PUT/DELETE/POST em /api/...).
 * Sem servidor, tudo continua funcionando em "modo local"; o que ficou pendente é
 * enviado quando a conexão voltar.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { BancoDeDados, Cartao, Categoria, Configuracoes, EventoUso, Mediador, PerfilCrianca } from '../types'
import { apagarArmazenamento, carregarBanco, gravarSessao, lerSessao, salvarBanco } from './armazenamento'
import { criarBancoInicial } from '../data/seed'
import { conferirSenha, gerarHash } from '../lib/hash'
import { uid } from '../lib/utils'
import {
  definirToken, descarregarFila, enfileirar, filaPendente, limparFila, obterToken, requisicao, SemConexao, servidorDisponivel,
  type Operacao,
} from '../lib/api'

export const CONFIG_PADRAO: Configuracoes = {
  tomVoz: 1,
  tamanhoFonte: 'Normal',
  falarAoTocar: true,
  vozPreferidaFeminina: '',
  vozPreferidaMasculina: '',
}

export type EstadoConexao = 'verificando' | 'servidor' | 'local'

type Resultado = { ok: true } | { ok: false; erro: string }

interface AppStore {
  banco: BancoDeDados
  mediador: Mediador | null
  criancas: PerfilCrianca[]
  categorias: Categoria[]
  cartoes: Cartao[]
  config: Configuracoes
  conexao: EstadoConexao
  pendentes: number
  verificarConexao(): Promise<void>

  // UC-05 Autenticar no sistema / RF01
  entrar(email: string, senha: string): Promise<Resultado>
  cadastrar(dados: { nome: string; email: string; senha: string; papel: string }): Promise<Resultado>
  sair(): void
  atualizarMediador(dados: Partial<Pick<Mediador, 'nome' | 'papel' | 'telefone'>>): void
  alterarSenha(atual: string, nova: string): Promise<Resultado>

  // UC-03 Gerenciar perfil da criança / RF02
  salvarCrianca(crianca: PerfilCrianca): void
  excluirCrianca(id: string): void

  // UC-01 Gerenciar categorias / RF05
  salvarCategoria(categoria: Categoria): void
  excluirCategoria(id: string): void
  moverCategoria(id: string, direcao: -1 | 1): void
  reordenarCategorias(ids: string[]): void

  // UC-02 Gerenciar cartões / RF05
  salvarCartao(cartao: Cartao): void
  excluirCartao(id: string): void
  moverCartao(id: string, direcao: -1 | 1): void
  reordenarCartoes(ids: string[]): void

  // UC-07 Selecionar e vocalizar cartão / RF07
  registrarUso(criancaId: string, cartao: Cartao, sessaoId: string): void
  registrarFrase(criancaId: string, texto: string): void
  contarRelatorioGerado(): void

  salvarConfig(c: Partial<Configuracoes>): void

  // RF06 LGPD
  exportarMeusDados(): string
  excluirMinhaConta(): Promise<void>
  restaurarDemonstracao(): void
}

const Contexto = createContext<AppStore | null>(null)

const COLECOES = ['criancas', 'categorias', 'cartoes'] as const

/** Compara o banco antes/depois de uma ação e gera as chamadas REST correspondentes. */
function gerarOperacoes(antes: BancoDeDados, depois: BancoDeDados, mediadorId: string): Operacao[] {
  const ops: Operacao[] = []
  for (const col of COLECOES) {
    const docsAntes = new Map((antes[col] as { id: string; mediadorId: string }[]).filter((d) => d.mediadorId === mediadorId).map((d) => [d.id, d]))
    const docsDepois = (depois[col] as { id: string; mediadorId: string }[]).filter((d) => d.mediadorId === mediadorId)
    for (const d of docsDepois) {
      const a = docsAntes.get(d.id)
      if (!a || JSON.stringify(a) !== JSON.stringify(d)) ops.push({ metodo: 'PUT', caminho: `/${col}/${d.id}`, corpo: d })
      docsAntes.delete(d.id)
    }
    for (const id of docsAntes.keys()) ops.push({ metodo: 'DELETE', caminho: `/${col}/${id}` })
  }
  const minhas = new Set(depois.criancas.filter((c) => c.mediadorId === mediadorId).map((c) => c.id))
  for (const tipo of ['eventos', 'frases'] as const) {
    const ja = new Set(antes[tipo].map((e) => e.id))
    const novos = (depois[tipo] as { id: string; criancaId: string }[]).filter((e) => !ja.has(e.id) && minhas.has(e.criancaId))
    if (novos.length) ops.push({ metodo: 'POST', caminho: `/${tipo}`, corpo: novos })
  }
  const mA = antes.mediadores.find((m) => m.id === mediadorId)
  const mD = depois.mediadores.find((m) => m.id === mediadorId)
  if (mA && mD && (mA.nome !== mD.nome || mA.papel !== mD.papel || mA.telefone !== mD.telefone)) {
    ops.push({ metodo: 'PUT', caminho: '/conta', corpo: { nome: mD.nome, papel: mD.papel, telefone: mD.telefone } })
  }
  return ops
}

/** Todas as operações para enviar a conta inteira (primeira sincronização). */
function operacoesCompletas(b: BancoDeDados, mediadorId: string): Operacao[] {
  const vazio: BancoDeDados = { ...b, mediadores: [], criancas: [], categorias: [], cartoes: [], eventos: [], frases: [] }
  // categorias antes de cartões (o servidor valida a categoria do cartão)
  return gerarOperacoes(vazio, b, mediadorId).sort((x, y) => ordemOp(x) - ordemOp(y))
}
function ordemOp(o: Operacao) {
  return ['/categorias', '/cartoes', '/criancas', '/eventos', '/frases'].findIndex((p) => o.caminho.startsWith(p))
}

interface DadosServidor {
  conta: Omit<Mediador, 'senhaHash'>
  criancas: PerfilCrianca[]
  categorias: Categoria[]
  cartoes: Cartao[]
  eventos: EventoUso[]
  frases: BancoDeDados['frases']
}

/** Substitui os dados locais do mediador pelos que vieram do servidor (GET /api/meus-dados). */
function aplicarDadosServidor(b: BancoDeDados, d: DadosServidor, senhaHash: string): BancoDeDados {
  const id = d.conta.id
  const meusFilhosAntigos = new Set(b.criancas.filter((c) => c.mediadorId === id).map((c) => c.id))
  const novosFilhos = new Set(d.criancas.map((c) => c.id))
  const outros = <T extends { mediadorId: string }>(l: T[]) => l.filter((x) => x.mediadorId !== id)
  const fora = <T extends { criancaId: string }>(l: T[]) => l.filter((x) => !meusFilhosAntigos.has(x.criancaId) && !novosFilhos.has(x.criancaId))
  const conta: Mediador = { ...d.conta, senhaHash }
  return {
    ...b,
    mediadores: [...b.mediadores.filter((m) => m.id !== id), conta],
    criancas: [...outros(b.criancas), ...d.criancas],
    categorias: [...outros(b.categorias), ...d.categorias],
    cartoes: [...outros(b.cartoes), ...d.cartoes],
    eventos: [...fora(b.eventos), ...d.eventos],
    frases: [...fora(b.frases), ...d.frases],
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [banco, setBanco] = useState<BancoDeDados>(() => carregarBanco())
  const [mediadorId, setMediadorId] = useState<string | null>(() => lerSessao())
  const [conexao, setConexao] = useState<EstadoConexao>('verificando')
  const [pendentes, setPendentes] = useState(() => filaPendente().length)
  const ultimoSincronizado = useRef(banco)

  useEffect(() => {
    salvarBanco(banco)
  }, [banco])

  useEffect(() => {
    gravarSessao(mediadorId)
  }, [mediadorId])

  const enviarPendentes = useCallback(async () => {
    const r = await descarregarFila()
    setPendentes(filaPendente().length)
    if (r === 'sem-conexao') setConexao('local')
    return r
  }, [])

  // A cada alteração no banco, gera as operações REST e envia (ou guarda na fila).
  useEffect(() => {
    const antes = ultimoSincronizado.current
    ultimoSincronizado.current = banco
    if (antes === banco || !mediadorId || !obterToken()) return
    const ops = gerarOperacoes(antes, banco, mediadorId)
    if (!ops.length) return
    enfileirar(ops)
    setPendentes(filaPendente().length)
    if (conexao === 'servidor') void enviarPendentes()
  }, [banco, mediadorId, conexao, enviarPendentes])

  const verificarConexao = useCallback(async () => {
    const ok = await servidorDisponivel()
    setConexao(ok ? 'servidor' : 'local')
    if (ok && obterToken()) await enviarPendentes()
  }, [enviarPendentes])

  // Verifica o servidor ao abrir, quando a internet volta e a cada 30 segundos.
  useEffect(() => {
    void verificarConexao()
    const aoVoltar = () => void verificarConexao()
    window.addEventListener('online', aoVoltar)
    const t = setInterval(() => void verificarConexao(), 30000)
    return () => {
      window.removeEventListener('online', aoVoltar)
      clearInterval(t)
    }
  }, [verificarConexao])

  const mediador = banco.mediadores.find((m) => m.id === mediadorId) ?? null
  const meuId = mediador?.id ?? ''

  const criancas = useMemo(() => banco.criancas.filter((c) => c.mediadorId === meuId), [banco.criancas, meuId])
  const categorias = useMemo(
    () => banco.categorias.filter((c) => c.mediadorId === meuId).sort((a, b) => a.ordem - b.ordem),
    [banco.categorias, meuId],
  )
  const cartoes = useMemo(
    () => banco.cartoes.filter((c) => c.mediadorId === meuId).sort((a, b) => a.ordem - b.ordem),
    [banco.cartoes, meuId],
  )
  const config = { ...CONFIG_PADRAO, ...(banco.configuracoes[meuId] ?? {}) }

  // Tamanho da fonte do sistema (Configurações > Acessibilidade)
  useEffect(() => {
    document.documentElement.style.fontSize = config.tamanhoFonte === 'Grande' ? '112.5%' : config.tamanhoFonte === 'Muito grande' ? '125%' : ''
  }, [config.tamanhoFonte])

  const atualizar = useCallback((fn: (b: BancoDeDados) => BancoDeDados) => setBanco((b) => fn(b)), [])

  /** Baixa os dados do servidor e coloca no aparelho sem gerar novas operações. */
  async function baixarDoServidor(senhaHash: string) {
    const r = await requisicao<DadosServidor>('GET', '/meus-dados')
    if (!r.ok) return
    setBanco((b) => {
      const novo = aplicarDadosServidor(b, r.dados, senhaHash)
      ultimoSincronizado.current = novo
      return novo
    })
  }

  const entrar: AppStore['entrar'] = async (email, senha) => {
    const e = email.trim().toLowerCase()
    const local = banco.mediadores.find((x) => x.email.toLowerCase() === e)
    const senhaLocalOk = !!local && (await conferirSenha(senha, local.senhaHash))

    if (await servidorDisponivel()) {
      setConexao('servidor')
      try {
        const r = await requisicao<{ token: string; mediador: Mediador; erro?: string }>('POST', '/auth/login', { email: e, senha })
        if (r.ok) {
          definirToken(r.dados.token)
          await enviarPendentes()
          await baixarDoServidor(await gerarHash(senha))
          setMediadorId(r.dados.mediador.id)
          return { ok: true }
        }
        if (r.status === 401 && local && senhaLocalOk) {
          // Conta existe só neste aparelho: cria no servidor e envia tudo (primeira sincronização).
          const c = await requisicao<{ token: string; erro?: string }>('POST', '/auth/cadastro', {
            id: local.id, nome: local.nome, email: e, senha, papel: local.papel, telefone: local.telefone, consentimentoLGPD: local.consentimentoLGPD,
          })
          if (c.ok) {
            definirToken(c.dados.token)
            limparFila()
            enfileirar(operacoesCompletas(banco, local.id))
            ultimoSincronizado.current = banco
            setMediadorId(local.id)
            await enviarPendentes()
            return { ok: true }
          }
          return { ok: false, erro: c.dados.erro ?? 'Não foi possível sincronizar a conta com o servidor.' }
        }
        return { ok: false, erro: r.dados.erro ?? 'E-mail ou senha incorretos.' }
      } catch (err) {
        if (!(err instanceof SemConexao)) throw err
      }
    }

    // Modo local (servidor desligado ou sem internet)
    setConexao('local')
    if (!local || !senhaLocalOk) return { ok: false, erro: 'E-mail ou senha incorretos.' }
    setMediadorId(local.id)
    return { ok: true }
  }

  const cadastrar: AppStore['cadastrar'] = async ({ nome, email, senha, papel }) => {
    const e = email.trim().toLowerCase()
    if (banco.mediadores.some((m) => m.email.toLowerCase() === e)) return { ok: false, erro: 'Já existe uma conta com este e-mail.' }
    const novo: Mediador = {
      id: uid('med-'), nome: nome.trim(), email: e, senhaHash: await gerarHash(senha),
      papel, telefone: '', consentimentoLGPD: new Date().toISOString(),
    }
    if (await servidorDisponivel()) {
      try {
        const r = await requisicao<{ token: string; erro?: string }>('POST', '/auth/cadastro', { ...novo, senha })
        if (!r.ok) return { ok: false, erro: r.dados.erro ?? 'Não foi possível criar a conta.' }
        definirToken(r.dados.token)
        setConexao('servidor')
      } catch {
        setConexao('local')
      }
    }
    // Uma conta nova começa com as mesmas categorias e cartões da demonstração, sem crianças.
    const modelo = criarBancoInicial()
    const mapa = new Map<string, string>()
    const cats = modelo.categorias.map((c) => {
      const id = uid('cat-')
      mapa.set(c.id, id)
      return { ...c, id, mediadorId: novo.id }
    })
    const cards = modelo.cartoes.map((c) => ({ ...c, id: uid('car-'), mediadorId: novo.id, categoriaId: mapa.get(c.categoriaId)! }))
    atualizar((b) => ({ ...b, mediadores: [...b.mediadores, novo], categorias: [...b.categorias, ...cats], cartoes: [...b.cartoes, ...cards] }))
    setMediadorId(novo.id)
    return { ok: true }
  }

  const sair = () => {
    if (obterToken() && conexao === 'servidor' && filaPendente().length === 0) {
      void requisicao('POST', '/auth/sair').catch(() => {})
      definirToken(null)
    }
    setMediadorId(null)
  }

  const atualizarMediador: AppStore['atualizarMediador'] = (dados) =>
    atualizar((b) => ({ ...b, mediadores: b.mediadores.map((m) => (m.id === meuId ? { ...m, ...dados } : m)) }))

  const alterarSenha: AppStore['alterarSenha'] = async (atual, nova) => {
    if (!mediador || !(await conferirSenha(atual, mediador.senhaHash))) return { ok: false, erro: 'Senha atual incorreta.' }
    if (obterToken()) {
      try {
        const r = await requisicao<{ erro?: string }>('PUT', '/conta/senha', { atual, nova })
        if (!r.ok) return { ok: false, erro: r.dados?.erro ?? 'O servidor recusou a troca de senha.' }
      } catch {
        return { ok: false, erro: 'Para trocar a senha, o servidor precisa estar conectado.' }
      }
    }
    const senhaHash = await gerarHash(nova)
    atualizar((b) => ({ ...b, mediadores: b.mediadores.map((m) => (m.id === meuId ? { ...m, senhaHash } : m)) }))
    return { ok: true }
  }

  const salvarCrianca: AppStore['salvarCrianca'] = (crianca) =>
    atualizar((b) => ({
      ...b,
      criancas: b.criancas.some((c) => c.id === crianca.id)
        ? b.criancas.map((c) => (c.id === crianca.id ? crianca : c))
        : [...b.criancas, crianca],
    }))

  const excluirCrianca: AppStore['excluirCrianca'] = (id) =>
    atualizar((b) => ({
      ...b,
      criancas: b.criancas.filter((c) => c.id !== id),
      eventos: b.eventos.filter((e) => e.criancaId !== id),
      frases: b.frases.filter((f) => f.criancaId !== id),
    }))

  const salvarCategoria: AppStore['salvarCategoria'] = (categoria) =>
    atualizar((b) => {
      const existe = b.categorias.some((c) => c.id === categoria.id)
      return {
        ...b,
        categorias: existe ? b.categorias.map((c) => (c.id === categoria.id ? categoria : c)) : [...b.categorias, categoria],
        // categoria nova aparece em todas as pranchas do mediador
        criancas: existe
          ? b.criancas
          : b.criancas.map((c) =>
              c.mediadorId === categoria.mediadorId
                ? { ...c, prancha: { ...c.prancha, categoriasVisiveis: [...c.prancha.categoriasVisiveis, categoria.id] } }
                : c,
            ),
      }
    })

  const excluirCategoria: AppStore['excluirCategoria'] = (id) =>
    atualizar((b) => ({
      ...b,
      categorias: b.categorias.filter((c) => c.id !== id),
      cartoes: b.cartoes.filter((c) => c.categoriaId !== id),
      criancas: b.criancas.map((c) =>
        c.prancha.categoriasVisiveis.includes(id)
          ? { ...c, prancha: { ...c.prancha, categoriasVisiveis: c.prancha.categoriasVisiveis.filter((x) => x !== id) } }
          : c,
      ),
    }))

  const reordenarCategorias: AppStore['reordenarCategorias'] = (ids) =>
    atualizar((b) => {
      const ordem = new Map(ids.map((id, k) => [id, k]))
      return { ...b, categorias: b.categorias.map((c) => (ordem.has(c.id) && c.ordem !== ordem.get(c.id) ? { ...c, ordem: ordem.get(c.id)! } : c)) }
    })

  const moverCategoria: AppStore['moverCategoria'] = (id, direcao) => {
    const lista = categorias.map((c) => c.id)
    const i = lista.indexOf(id)
    const j = i + direcao
    if (i < 0 || j < 0 || j >= lista.length) return
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
    reordenarCategorias(lista)
  }

  const salvarCartao: AppStore['salvarCartao'] = (cartao) =>
    atualizar((b) => ({
      ...b,
      cartoes: b.cartoes.some((c) => c.id === cartao.id)
        ? b.cartoes.map((c) => (c.id === cartao.id ? cartao : c))
        : [...b.cartoes, cartao],
    }))

  const excluirCartao: AppStore['excluirCartao'] = (id) =>
    atualizar((b) => ({ ...b, cartoes: b.cartoes.filter((c) => c.id !== id) }))

  const reordenarCartoes: AppStore['reordenarCartoes'] = (ids) =>
    atualizar((b) => {
      const ordem = new Map(ids.map((id, k) => [id, k]))
      return { ...b, cartoes: b.cartoes.map((c) => (ordem.has(c.id) && c.ordem !== ordem.get(c.id) ? { ...c, ordem: ordem.get(c.id)! } : c)) }
    })

  const moverCartao: AppStore['moverCartao'] = (id, direcao) => {
    const alvo = cartoes.find((c) => c.id === id)
    if (!alvo) return
    const lista = cartoes.filter((c) => c.categoriaId === alvo.categoriaId).map((c) => c.id)
    const i = lista.indexOf(id)
    const j = i + direcao
    if (j < 0 || j >= lista.length) return
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
    reordenarCartoes(lista)
  }

  const registrarUso: AppStore['registrarUso'] = (criancaId, cartao, sessaoId) =>
    atualizar((b) => ({
      ...b,
      eventos: [
        ...b.eventos,
        { id: uid('ev-'), criancaId, cartaoId: cartao.id, categoriaId: cartao.categoriaId, texto: cartao.texto, sessaoId, data: new Date().toISOString() },
      ],
    }))

  const registrarFrase: AppStore['registrarFrase'] = (criancaId, texto) =>
    atualizar((b) => ({ ...b, frases: [...b.frases, { id: uid('fr-'), criancaId, texto, data: new Date().toISOString() }] }))

  const contarRelatorioGerado = () => atualizar((b) => ({ ...b, relatoriosGerados: b.relatoriosGerados + 1 }))

  const salvarConfig: AppStore['salvarConfig'] = (c) =>
    atualizar((b) => ({ ...b, configuracoes: { ...b.configuracoes, [meuId]: { ...CONFIG_PADRAO, ...(b.configuracoes[meuId] ?? {}), ...c } } }))

  const exportarMeusDados = () => {
    const ids = new Set(criancas.map((c) => c.id))
    const conta = mediador ? { ...mediador, senhaHash: undefined } : null
    return JSON.stringify(
      {
        exportadoEm: new Date().toISOString(),
        conta,
        criancas,
        categorias,
        cartoes,
        eventosDeUso: banco.eventos.filter((e) => ids.has(e.criancaId)),
        frases: banco.frases.filter((f) => ids.has(f.criancaId)),
        configuracoes: config,
      },
      null,
      2,
    )
  }

  const excluirMinhaConta = async () => {
    if (obterToken()) {
      try {
        await requisicao('DELETE', '/meus-dados')
      } catch {
        /* sem servidor: apaga só deste aparelho */
      }
    }
    definirToken(null)
    limparFila()
    setPendentes(0)
    const ids = new Set(criancas.map((c) => c.id))
    atualizar((b) => ({
      ...b,
      mediadores: b.mediadores.filter((m) => m.id !== meuId),
      criancas: b.criancas.filter((c) => c.mediadorId !== meuId),
      categorias: b.categorias.filter((c) => c.mediadorId !== meuId),
      cartoes: b.cartoes.filter((c) => c.mediadorId !== meuId),
      eventos: b.eventos.filter((e) => !ids.has(e.criancaId)),
      frases: b.frases.filter((f) => !ids.has(f.criancaId)),
    }))
    setMediadorId(null)
  }

  const restaurarDemonstracao = () => {
    apagarArmazenamento()
    definirToken(null)
    limparFila()
    setPendentes(0)
    const novo = criarBancoInicial()
    ultimoSincronizado.current = novo
    setBanco(novo)
    setMediadorId(null)
  }

  const valor: AppStore = {
    banco, mediador, criancas, categorias, cartoes, config, conexao, pendentes, verificarConexao,
    entrar, cadastrar, sair, atualizarMediador, alterarSenha,
    salvarCrianca, excluirCrianca,
    salvarCategoria, excluirCategoria, moverCategoria, reordenarCategorias,
    salvarCartao, excluirCartao, moverCartao, reordenarCartoes,
    registrarUso, registrarFrase, contarRelatorioGerado,
    salvarConfig, exportarMeusDados, excluirMinhaConta, restaurarDemonstracao,
  }

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useApp(): AppStore {
  const ctx = useContext(Contexto)
  if (!ctx) throw new Error('useApp precisa estar dentro de <AppProvider>')
  return ctx
}
