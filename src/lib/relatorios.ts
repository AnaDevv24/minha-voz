/** Monta o RelatorioUso (Diagrama de Classes) a partir dos eventos de toque nos cartões. RF07. */
import type { BancoDeDados, RelatorioUso } from '../types'

export type Periodo = 'hoje' | 'semana' | 'mes' | 'total'

export const PERIODOS: { id: Periodo; rotulo: string }[] = [
  { id: 'hoje', rotulo: 'Hoje' },
  { id: 'semana', rotulo: 'Esta semana' },
  { id: 'mes', rotulo: 'Este mês' },
  { id: 'total', rotulo: 'Total' },
]

export function inicioDoPeriodo(periodo: Periodo, agora = new Date()): Date {
  const d = new Date(agora)
  d.setHours(0, 0, 0, 0)
  if (periodo === 'hoje') return d
  if (periodo === 'semana') {
    d.setDate(d.getDate() - 6)
    return d
  }
  if (periodo === 'mes') {
    d.setDate(d.getDate() - 29)
    return d
  }
  return new Date(0)
}

export function gerarRelatorio(banco: BancoDeDados, criancaIds: string[], periodo: Periodo): RelatorioUso {
  const fim = new Date()
  const inicio = inicioDoPeriodo(periodo, fim)
  const eventos = banco.eventos.filter((e) => criancaIds.includes(e.criancaId) && new Date(e.data) >= inicio)
  const frases = banco.frases.filter((f) => criancaIds.includes(f.criancaId) && new Date(f.data) >= inicio)

  const porCartao = new Map<string, number>()
  const porCategoria = new Map<string, number>()
  const sessoes = new Set<string>()
  for (const e of eventos) {
    porCartao.set(e.cartaoId, (porCartao.get(e.cartaoId) ?? 0) + 1)
    porCategoria.set(e.categoriaId, (porCategoria.get(e.categoriaId) ?? 0) + 1)
    sessoes.add(e.sessaoId)
  }

  const cartoesMaisUsados = [...porCartao.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cartaoId, total]) => {
      const c = banco.cartoes.find((k) => k.id === cartaoId)
      const ev = eventos.find((e) => e.cartaoId === cartaoId)
      return { cartaoId, texto: c?.texto ?? ev?.texto ?? 'Cartão removido', imagemUrl: c?.imagemUrl ?? '❔', total }
    })

  const categoriasMaisUsadas = [...porCategoria.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([categoriaId, total]) => {
      const c = banco.categorias.find((k) => k.id === categoriaId)
      return { categoriaId, nome: c?.nome ?? 'Categoria removida', cor: c?.cor ?? 'cinza', total }
    })

  return {
    periodoInicio: inicio,
    periodoFim: fim,
    totalCliques: eventos.length,
    cartoesDistintos: porCartao.size,
    sessoes: sessoes.size,
    frasesFaladas: frases.length,
    cartoesMaisUsados,
    categoriasMaisUsadas,
  }
}

export function relatorioEmCSV(r: RelatorioUso, titulo: string): string {
  const linhas = [
    `Relatório de uso - Minha Voz CAA;${titulo}`,
    `Período;${r.periodoInicio.getTime() === 0 ? 'Desde o início' : r.periodoInicio.toLocaleDateString('pt-BR')} a ${r.periodoFim.toLocaleDateString('pt-BR')}`,
    `Total de cliques;${r.totalCliques}`,
    `Cartões distintos;${r.cartoesDistintos}`,
    `Sessões de uso;${r.sessoes}`,
    `Frases faladas;${r.frasesFaladas}`,
    '',
    'Cartão;Usos',
    ...r.cartoesMaisUsados.map((c) => `${c.texto};${c.total}`),
    '',
    'Categoria;Acessos',
    ...r.categoriasMaisUsadas.map((c) => `${c.nome};${c.total}`),
  ]
  return '﻿' + linhas.join('\n')
}
