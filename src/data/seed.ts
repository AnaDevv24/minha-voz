/*
 * Dados iniciais da demonstração, baseados nas telas do protótipo do TCC
 * (mediadora Ana Silva, crianças Lucas, Sofia e Miguel, categorias e cartões).
 * Login da demo: mediador@escola.com  /  senha 12345678
 */
import type { BancoDeDados, Cartao, Categoria, CorCategoria, EventoUso, NivelPrancha, PerfilCrianca } from '../types'

export const EMAIL_DEMO = 'mediador@escola.com'
export const SENHA_DEMO = '12345678'
// hash SHA-256 de "minha-voz::12345678" (ver lib/hash.ts)
const HASH_DEMO = 'sha256:82c324ab7088ae35a571ac0990d96288764868b0b9c4f5160815146687e79d6c'
export const MEDIADOR_DEMO_ID = 'med-ana'

type CartaoSemente = [texto: string, emoji: string, atalho?: boolean]

const CATEGORIAS: { id: string; nome: string; emoji: string; cor: CorCategoria; ativa: boolean; cartoes: CartaoSemente[] }[] = [
  {
    id: 'cat-alimentacao', nome: 'Alimentação', emoji: '🍽️', cor: 'laranja', ativa: true,
    cartoes: [['Água', '💧'], ['Comer', '🍽️'], ['Lanche', '🥪'], ['Fruta', '🍎'], ['Leite', '🥛'], ['Pão', '🍞'], ['Suco', '🧃'], ['Banana', '🍌'], ['Arroz e feijão', '🍛'], ['Biscoito', '🍪'], ['Sorvete', '🍦'], ['Bolo', '🍰']],
  },
  {
    id: 'cat-sentimentos', nome: 'Sentimentos', emoji: '😊', cor: 'rosa', ativa: true,
    cartoes: [['Feliz', '😊'], ['Triste', '😢'], ['Bravo', '😠'], ['Com medo', '😨'], ['Cansado', '😴'], ['Com dor', '🤕'], ['Animado', '🤩'], ['Calmo', '😌']],
  },
  {
    id: 'cat-acoes', nome: 'Ações', emoji: '🏃', cor: 'verde', ativa: true,
    cartoes: [['Correr', '🏃'], ['Brincar', '🧸'], ['Dormir', '😴'], ['Ler', '📖'], ['Desenhar', '🖍️'], ['Assistir', '📺'], ['Pular', '🤸'], ['Cantar', '🎤'], ['Tomar banho', '🛁'], ['Passear', '🚶']],
  },
  {
    id: 'cat-pessoas', nome: 'Pessoas', emoji: '👫', cor: 'azul', ativa: true,
    cartoes: [['Mãe', '👩'], ['Pai', '👨'], ['Vovó', '👵'], ['Vovô', '👴'], ['Professora', '👩‍🏫'], ['Amigo', '🧒']],
  },
  {
    id: 'cat-objetos', nome: 'Objetos', emoji: '📦', cor: 'roxo', ativa: true,
    cartoes: [['Bola', '⚽'], ['Boneca', '🪆'], ['Carrinho', '🚗'], ['Celular', '📱'], ['Livro', '📚'], ['Lápis', '✏️'], ['Mochila', '🎒'], ['Copo', '🥤'], ['Roupa', '👕'], ['Sapato', '👟'], ['Brinquedo', '🧸'], ['Massinha', '🎨'], ['Música', '🎵'], ['Óculos', '👓']],
  },
  {
    id: 'cat-lugares', nome: 'Lugares', emoji: '🏠', cor: 'ciano', ativa: true,
    cartoes: [['Casa', '🏠'], ['Escola', '🏫'], ['Parque', '🛝'], ['Quarto', '🛏️'], ['Mercado', '🛒'], ['Hospital', '🏥'], ['Praia', '🏖️']],
  },
  {
    id: 'cat-necessidades', nome: 'Necessidades', emoji: '🙏', cor: 'amarelo', ativa: true,
    cartoes: [['Eu', '🙋', true], ['Quero', '✋', true], ['Não quero', '🙅', true], ['Ajuda', '🙏'], ['Banheiro', '🚽'], ['Sim', '👍'], ['Não', '👎'], ['Mais', '➕'], ['Acabou', '✅'], ['Esperar', '⏳']],
  },
  {
    id: 'cat-rotina', nome: 'Rotina', emoji: '📅', cor: 'vermelho', ativa: true,
    cartoes: [['Acordar', '⏰'], ['Escovar os dentes', '🪥'], ['Café da manhã', '☕'], ['Ir para a escola', '🚌'], ['Almoço', '🍲'], ['Lição de casa', '📝'], ['Jantar', '🍝'], ['Banho', '🛁'], ['Hora de dormir', '🌙']],
  },
]

/** Categorias visíveis por nível de prancha (o mediador pode ajustar depois). */
export function categoriasDoNivel(nivel: NivelPrancha, todas: { id: string; nome: string }[]): string[] {
  if (nivel === 'Iniciante') return todas.filter((c) => ['Alimentação', 'Sentimentos', 'Necessidades', 'Pessoas'].includes(c.nome)).map((c) => c.id)
  if (nivel === 'Básica') return todas.filter((c) => c.nome !== 'Rotina').map((c) => c.id)
  return todas.map((c) => c.id)
}

// Gerador pseudoaleatório com semente fixa, para os relatórios da demo serem sempre iguais.
function prng(semente: number) {
  return () => {
    semente = (semente * 1664525 + 1013904223) % 4294967296
    return semente / 4294967296
  }
}

export function criarBancoInicial(): BancoDeDados {
  const agora = new Date()
  const categorias: Categoria[] = CATEGORIAS.map((c, i) => ({
    id: c.id, mediadorId: MEDIADOR_DEMO_ID, nome: c.nome, emoji: c.emoji, cor: c.cor, ordem: i, ativa: c.ativa,
  }))
  const cartoes: Cartao[] = CATEGORIAS.flatMap((c) =>
    c.cartoes.map(([texto, emoji, atalho], i) => ({
      id: `${c.id.replace('cat-', 'car-')}-${i}`,
      mediadorId: MEDIADOR_DEMO_ID,
      categoriaId: c.id,
      texto,
      imagemUrl: emoji,
      descricao: '',
      ativo: true,
      ordem: i,
      atalho: !!atalho,
    })),
  )

  const crianca = (id: string, nome: string, avatar: string, faixa: PerfilCrianca['faixaEtaria'], nivel: NivelPrancha, voz: PerfilCrianca['preferenciaVoz'], tam: PerfilCrianca['tamanhoCartao'], contraste: boolean, obs: string): PerfilCrianca => ({
    id, mediadorId: MEDIADOR_DEMO_ID, nomeApelido: nome, avatar, faixaEtaria: faixa, observacoes: obs,
    preferenciaVoz: voz, tamanhoCartao: tam, altoContraste: contraste, mostrarTexto: true, velocidadeVoz: 0.95, criadoEm: agora.toISOString(),
    prancha: { id: `pr-${id}`, nome: `Prancha ${nivel}`, nivel, dataCriacao: agora.toISOString(), ativa: true, categoriasVisiveis: categoriasDoNivel(nivel, categorias), cartoesOcultos: [] },
  })

  const criancas: PerfilCrianca[] = [
    crianca('cri-lucas', 'Lucas', '👦', '6-8 anos', 'Básica', 'Feminina', 'Grande', false, 'Prefere sons suaves.'),
    crianca('cri-sofia', 'Sofia', '👧', '4-6 anos', 'Iniciante', 'Masculina', 'Médio', true, 'Dificuldade com muitas cores na tela.'),
    crianca('cri-miguel', 'Miguel', '🧒', '8-10 anos', 'Avançada', 'Feminina', 'Médio', false, ''),
  ]

  // Histórico de uso simulado dos últimos 30 dias (alimenta a tela de Relatórios).
  const rnd = prng(2026)
  const favoritos = ['car-alimentacao-0', 'car-alimentacao-1', 'car-necessidades-1', 'car-sentimentos-0', 'car-lugares-0', 'car-necessidades-4', 'car-acoes-1', 'car-pessoas-0']
  const eventos: EventoUso[] = []
  for (const c of criancas) {
    const permitidos = cartoes.filter((k) => c.prancha.categoriasVisiveis.includes(k.categoriaId) || k.atalho)
    for (let dia = 29; dia >= 0; dia--) {
      if (rnd() < 0.35) continue
      const sessoes = 1 + Math.floor(rnd() * 2)
      for (let s = 0; s < sessoes; s++) {
        const sessaoId = `ses-${c.id}-${dia}-${s}`
        const base = new Date(agora)
        base.setDate(base.getDate() - dia)
        base.setHours(8 + Math.floor(rnd() * 10), Math.floor(rnd() * 60), 0, 0)
        if (base > agora) base.setTime(agora.getTime() - 2 * 3600 * 1000)
        const toques = 2 + Math.floor(rnd() * 5)
        for (let t = 0; t < toques; t++) {
          const fav = permitidos.filter((k) => favoritos.includes(k.id))
          const lista = rnd() < 0.6 && fav.length ? fav : permitidos
          const cartao = lista[Math.floor(rnd() * lista.length)]
          eventos.push({
            id: `ev-${c.id}-${dia}-${s}-${t}`, criancaId: c.id, cartaoId: cartao.id, categoriaId: cartao.categoriaId,
            texto: cartao.texto, sessaoId, data: new Date(base.getTime() + t * 20000).toISOString(),
          })
        }
      }
    }
  }

  return {
    versao: 2,
    mediadores: [
      {
        id: MEDIADOR_DEMO_ID, nome: 'Ana Silva', email: EMAIL_DEMO, senhaHash: HASH_DEMO,
        papel: 'Mediador(a)', telefone: '', consentimentoLGPD: agora.toISOString(),
      },
    ],
    criancas,
    categorias,
    cartoes,
    eventos,
    frases: [],
    relatoriosGerados: 12,
    configuracoes: {},
  }
}
