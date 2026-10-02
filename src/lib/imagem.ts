/** Reduz a imagem enviada para no máximo 256px e devolve um data URL (cabe no armazenamento local). */
export function redimensionarImagem(arquivo: File, max = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    leitor.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Arquivo de imagem inválido.'))
      img.onload = () => {
        const escala = Math.min(1, max / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * escala)
        canvas.height = Math.round(img.height * escala)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas indisponível.'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/webp', 0.85))
      }
      img.src = leitor.result as string
    }
    leitor.readAsDataURL(arquivo)
  })
}
