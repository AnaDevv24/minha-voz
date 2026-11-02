// Junta o build da prévia (dist-previa/) em um único HTML: dist-previa/minha-voz.html
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const pasta = 'dist-previa'
let html = readFileSync(join(pasta, 'index.html'), 'utf8')
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/([^"]+)"[^>]*>/g, (_, f) => `<style>${readFileSync(join(pasta, f), 'utf8')}</style>`)
html = html.replace(/<script type="module"[^>]*src="\.\/([^"]+)"[^>]*><\/script>/g, (_, f) => {
  const js = readFileSync(join(pasta, f), 'utf8').replace(/<\/script/gi, '<\\/script')
  return `<script type="module">${js}</script>`
})
html = html.replace(/<link rel="(icon|apple-touch-icon|manifest)"[^>]*>\s*/g, '')
// A página publicada recebe o esqueleto <html>/<head>/<body> do próprio host: fica só o conteúdo
html = html.replace(/<!doctype html>|<\/?html[^>]*>|<\/?head>|<\/?body>|<meta (charset|name="viewport")[^>]*>/gi, '').trim()
writeFileSync(join(pasta, 'minha-voz.html'), html)
console.log(`dist-previa/minha-voz.html (${(html.length / 1024).toFixed(0)} KB)`)
