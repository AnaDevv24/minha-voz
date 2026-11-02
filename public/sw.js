/*
 * Service Worker do Minha Voz — CAA (seção 9.4 do TCC).
 * Estratégia Cache-First: HTML, CSS, JS e imagens ficam guardados no aparelho,
 * então a prancha abre e funciona mesmo sem internet depois do primeiro acesso.
 * Só é registrado no build de produção (npm run build && npm run preview).
 */
const CACHE = 'minha-voz-v2'
const ESSENCIAIS = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ESSENCIAIS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  // A API Flask (/api) nunca vai para o cache: dados sempre atualizados.
  const url = new URL(req.url)
  if (url.pathname.startsWith('/api')) return

  // Navegação (rotas do React): tenta a rede e cai para o index.html em cache.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')))
    return
  }

  // Demais arquivos: Cache-First.
  event.respondWith(
    caches.match(req).then(
      (emCache) =>
        emCache ||
        fetch(req).then((resp) => {
          if (resp.ok && (req.url.startsWith(self.location.origin) || req.url.includes('fonts.g'))) {
            const copia = resp.clone()
            caches.open(CACHE).then((cache) => cache.put(req, copia))
          }
          return resp
        }),
    ),
  )
})
