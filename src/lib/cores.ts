import type { CorCategoria } from '../types'

/** Cores suaves (seção 8.7 do TCC) usadas nas categorias e nos cartões. */
export const CORES: Record<
  CorCategoria,
  { nome: string; fundo: string; borda: string; texto: string; ponto: string; contraste: string }
> = {
  laranja: { nome: 'Laranja', fundo: 'bg-orange-50', borda: 'border-orange-200', texto: 'text-orange-800', ponto: 'bg-orange-400', contraste: 'bg-orange-500' },
  rosa: { nome: 'Rosa', fundo: 'bg-pink-50', borda: 'border-pink-200', texto: 'text-pink-800', ponto: 'bg-pink-400', contraste: 'bg-pink-600' },
  verde: { nome: 'Verde', fundo: 'bg-green-50', borda: 'border-green-200', texto: 'text-green-800', ponto: 'bg-green-500', contraste: 'bg-green-600' },
  azul: { nome: 'Azul', fundo: 'bg-sky-50', borda: 'border-sky-200', texto: 'text-sky-800', ponto: 'bg-sky-500', contraste: 'bg-sky-600' },
  roxo: { nome: 'Roxo', fundo: 'bg-purple-50', borda: 'border-purple-200', texto: 'text-purple-800', ponto: 'bg-purple-500', contraste: 'bg-purple-600' },
  ciano: { nome: 'Ciano', fundo: 'bg-teal-50', borda: 'border-teal-200', texto: 'text-teal-800', ponto: 'bg-teal-500', contraste: 'bg-teal-600' },
  amarelo: { nome: 'Amarelo', fundo: 'bg-yellow-50', borda: 'border-yellow-200', texto: 'text-yellow-800', ponto: 'bg-yellow-400', contraste: 'bg-yellow-500' },
  vermelho: { nome: 'Vermelho', fundo: 'bg-red-50', borda: 'border-red-200', texto: 'text-red-700', ponto: 'bg-red-500', contraste: 'bg-red-600' },
  cinza: { nome: 'Cinza', fundo: 'bg-slate-50', borda: 'border-slate-200', texto: 'text-slate-700', ponto: 'bg-slate-400', contraste: 'bg-slate-600' },
}

export const LISTA_CORES = Object.keys(CORES) as CorCategoria[]
