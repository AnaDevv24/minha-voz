/*
 * Entidades do sistema, seguindo o Diagrama de Classes do TCC (Figura 3).
 * Usuario <- Mediador  1 — 0..*  PerfilCrianca  1 — 0..*  PranchaComunicacao
 * PranchaComunicacao 1 — 0..* Categoria 1 — 0..* Cartao
 * PerfilCrianca 1 — 0..* RelatorioUso (gerado a partir dos EventoUso)
 */

export interface Usuario {
  id: string
  nome: string
  email: string
  senhaHash: string
}

export interface Mediador extends Usuario {
  papel: string // ex.: Responsável, Professor(a), Fonoaudiólogo(a)
  telefone: string
  consentimentoLGPD: string // data/hora em que aceitou os termos
}

export type FaixaEtaria = '2-4 anos' | '4-6 anos' | '6-8 anos' | '8-10 anos' | '10-12 anos' | '12+ anos'
export type PreferenciaVoz = 'Feminina' | 'Masculina'
export type TamanhoCartao = 'Pequeno' | 'Médio' | 'Grande'
export type NivelPrancha = 'Iniciante' | 'Básica' | 'Avançada'

export interface PranchaComunicacao {
  id: string
  nome: string
  nivel: NivelPrancha
  dataCriacao: string
  ativa: boolean
  /** categorias visíveis nesta prancha (RF05: esconder/mostrar por criança) */
  categoriasVisiveis: string[]
  /** cartões escondidos só para esta criança */
  cartoesOcultos: string[]
}

export interface PerfilCrianca {
  id: string
  mediadorId: string
  /** RNF06: apenas apelido, nunca nome completo */
  nomeApelido: string
  avatar: string
  faixaEtaria: FaixaEtaria
  observacoes: string
  preferenciaVoz: PreferenciaVoz
  tamanhoCartao: TamanhoCartao
  altoContraste: boolean
  /** mostrar o texto embaixo dos pictogramas */
  mostrarTexto: boolean
  /** velocidade da fala para esta criança (0.5 – 1.5) */
  velocidadeVoz: number
  prancha: PranchaComunicacao
  criadoEm: string
}

export interface Categoria {
  id: string
  mediadorId: string
  nome: string
  emoji: string
  cor: CorCategoria
  ordem: number
  ativa: boolean
}

export interface Cartao {
  id: string
  mediadorId: string
  categoriaId: string
  texto: string
  /** emoji (ex.: "💧") ou imagem enviada (data URL) */
  imagemUrl: string
  descricao: string
  ativo: boolean
  ordem: number
  /** aparece também como atalho na prancha principal (ex.: "Quero", "Não quero") */
  atalho: boolean
}

/** Cada toque em um cartão vira um evento; os relatórios são calculados a partir deles. */
export interface EventoUso {
  id: string
  criancaId: string
  cartaoId: string
  categoriaId: string
  texto: string
  sessaoId: string
  data: string // ISO
}

export interface RelatorioUso {
  periodoInicio: Date
  periodoFim: Date
  totalCliques: number
  cartoesDistintos: number
  sessoes: number
  frasesFaladas: number
  cartoesMaisUsados: { cartaoId: string; texto: string; imagemUrl: string; total: number }[]
  categoriasMaisUsadas: { categoriaId: string; nome: string; cor: CorCategoria; total: number }[]
}

export interface Configuracoes {
  tomVoz: number // 0.5 – 1.5
  tamanhoFonte: 'Normal' | 'Grande' | 'Muito grande'
  falarAoTocar: boolean
  vozPreferidaFeminina: string // nome da voz do sistema (opcional)
  vozPreferidaMasculina: string
}

export type CorCategoria =
  | 'laranja'
  | 'rosa'
  | 'verde'
  | 'azul'
  | 'roxo'
  | 'ciano'
  | 'amarelo'
  | 'vermelho'
  | 'cinza'

export interface BancoDeDados {
  versao: number
  mediadores: Mediador[]
  criancas: PerfilCrianca[]
  categorias: Categoria[]
  cartoes: Cartao[]
  eventos: EventoUso[]
  /** frases faladas pelo botão "Falar" */
  frases: { id: string; criancaId: string; texto: string; data: string }[]
  relatoriosGerados: number
  configuracoes: Record<string, Configuracoes> // por mediador
}
