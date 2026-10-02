import { cn, ehImagem } from '../lib/utils'

/** Mostra o pictograma do cartão: um emoji ou a imagem enviada pelo mediador. */
export function Pictograma({ imagem, texto = '', className }: { imagem: string; texto?: string; className?: string }) {
  if (ehImagem(imagem)) {
    return <img src={imagem} alt={texto} className={cn('object-contain', className)} draggable={false} />
  }
  return (
    <span className={cn('pictograma inline-flex items-center justify-center', className)} role="img" aria-label={texto}>
      {imagem}
    </span>
  )
}
