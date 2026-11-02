import { useEffect, useRef, useState } from 'react'
import { ImageUp, Smile, Volume2 } from 'lucide-react'
import { Modal } from './Modal'
import { Botao, Entrada, Rotulo, Selecao } from './Campo'
import { Pictograma } from './Pictograma'
import { SeletorEmoji } from './SeletorEmoji'
import { useApp } from '../store/AppStore'
import { useToast } from './Toast'
import { falar } from '../lib/fala'
import { redimensionarImagem } from '../lib/imagem'
import { uid } from '../lib/utils'
import type { Cartao } from '../types'

/** Modal de cadastro/edição de cartão (Figura 13): imagem, texto, categoria, descrição e "Testar voz". */
export function FormCartao({ aberto, aoFechar, cartao, categoriaInicial }: {
  aberto: boolean
  aoFechar: () => void
  cartao?: Cartao | null
  categoriaInicial?: string
}) {
  const { categorias, cartoes, mediador, salvarCartao, config } = useApp()
  const avisar = useToast()
  const [texto, setTexto] = useState('')
  const [imagem, setImagem] = useState('💧')
  const [categoriaId, setCategoriaId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [atalho, setAtalho] = useState(false)
  const [mostrarEmojis, setMostrarEmojis] = useState(false)
  const arquivoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!aberto) return
    setTexto(cartao?.texto ?? '')
    setImagem(cartao?.imagemUrl ?? '⭐')
    setCategoriaId(cartao?.categoriaId ?? categoriaInicial ?? categorias[0]?.id ?? '')
    setDescricao(cartao?.descricao ?? '')
    setAtalho(cartao?.atalho ?? false)
    setMostrarEmojis(!cartao)
  }, [aberto, cartao, categoriaInicial, categorias])

  async function enviarImagem(arquivo?: File) {
    if (!arquivo) return
    try {
      setImagem(await redimensionarImagem(arquivo))
      setMostrarEmojis(false)
    } catch (e) {
      avisar((e as Error).message, 'aviso')
    }
  }

  function salvar(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim() || !categoriaId || !mediador) return
    const ordem = cartao?.categoriaId === categoriaId ? cartao.ordem : cartoes.filter((c) => c.categoriaId === categoriaId).length
    salvarCartao({
      id: cartao?.id ?? uid('car-'),
      mediadorId: mediador.id,
      categoriaId,
      texto: texto.trim(),
      imagemUrl: imagem,
      descricao: descricao.trim(),
      ativo: cartao?.ativo ?? true,
      ordem,
      atalho,
    })
    avisar(cartao ? 'Cartão atualizado.' : 'Cartão criado.')
    aoFechar()
  }

  return (
    <Modal titulo={cartao ? 'Editar cartão' : 'Novo cartão'} aberto={aberto} aoFechar={aoFechar}>
      <form onSubmit={salvar} className="space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div className="flex size-24 items-center justify-center rounded-2xl bg-primaria-50">
            <Pictograma imagem={imagem} texto={texto} className="size-16 text-6xl" />
          </div>
          <div className="flex gap-3 text-xs font-bold text-primaria-700">
            <button type="button" className="inline-flex items-center gap-1 hover:underline" onClick={() => setMostrarEmojis((v) => !v)}>
              <Smile className="size-4" /> Escolher pictograma
            </button>
            <button type="button" className="inline-flex items-center gap-1 hover:underline" onClick={() => arquivoRef.current?.click()}>
              <ImageUp className="size-4" /> Carregar imagem
            </button>
            <input ref={arquivoRef} type="file" accept="image/*" className="hidden" onChange={(e) => enviarImagem(e.target.files?.[0])} />
          </div>
        </div>
        {mostrarEmojis && <SeletorEmoji valor={imagem} aoEscolher={(e) => setImagem(e)} />}

        <Rotulo texto="Texto do cartão" dica="É o que será falado quando a criança tocar no cartão.">
          <Entrada value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: Água" required maxLength={40} autoFocus={!!cartao} />
        </Rotulo>
        <Rotulo texto="Categoria">
          <Selecao value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)} required>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Selecao>
        </Rotulo>
        <Rotulo texto="Descrição (opcional)">
          <Entrada value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Para uso no relatório" maxLength={120} />
        </Rotulo>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={atalho} onChange={(e) => setAtalho(e.target.checked)} className="size-4 accent-primaria-600" />
          Mostrar como atalho na prancha principal
        </label>

        <Botao
          type="button"
          variante="contorno"
          className="w-full"
          disabled={!texto.trim()}
          onClick={() => falar(texto, { tom: config.tomVoz })}
        >
          <Volume2 className="size-4" /> Testar voz
        </Botao>
        <div className="grid grid-cols-2 gap-3">
          <Botao type="button" variante="suave" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={!texto.trim()}>
            Salvar
          </Botao>
        </div>
      </form>
    </Modal>
  )
}
