import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

export const estiloCampo =
  'w-full rounded-xl border border-transparent bg-primaria-50 px-3.5 py-2.5 text-sm text-tinta placeholder:text-slate-400 focus:border-primaria-500 focus:bg-white focus:outline-none'

export function Rotulo({ texto, children, dica }: { texto: string; children: ReactNode; dica?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-tinta">{texto}</span>
      {children}
      {dica && <span className="mt-1 block text-xs text-slate-500">{dica}</span>}
    </label>
  )
}

export function Entrada({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cn(estiloCampo, className)} />
}

export function Selecao({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={cn(estiloCampo, 'appearance-auto', className)}>
      {children}
    </select>
  )
}

export function AreaTexto({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cn(estiloCampo, 'min-h-20 resize-y', className)} />
}

export function Botao({ variante = 'primario', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'primario' | 'contorno' | 'suave' | 'perigo' }) {
  const estilos = {
    primario: 'bg-primaria-600 text-white hover:bg-primaria-700 shadow-sm',
    contorno: 'border border-primaria-600 text-primaria-700 hover:bg-primaria-50 bg-white',
    suave: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    perigo: 'bg-red-50 text-red-700 hover:bg-red-100',
  }
  return (
    <button
      {...p}
      className={cn('inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50', estilos[variante], className)}
    />
  )
}
