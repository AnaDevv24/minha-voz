import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import { AppProvider } from './store/AppStore'
import { ToastProvider } from './components/Toast'
import { ConfirmacaoProvider } from './components/Confirmacao'
import { Splash } from './components/Splash'
import './lib/pwa'
import './index.css'

// Prévia online (npm run build:artifact): um único arquivo HTML, sem servidor, navegação pelo # do endereço.
const PREVIA = import.meta.env.VITE_PREVIA === '1'
const Roteador = PREVIA ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Roteador>
      <AppProvider>
        <ToastProvider>
          <ConfirmacaoProvider>
            <Splash />
            <App />
          </ConfirmacaoProvider>
        </ToastProvider>
      </AppProvider>
    </Roteador>
  </StrictMode>,
)

// PWA (seção 9.4): o Service Worker só é registrado no build de produção,
// para não atrapalhar o recarregamento automático do modo de desenvolvimento.
if ('serviceWorker' in navigator && import.meta.env.PROD && !PREVIA) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('Service Worker não registrado', e))
  })
}
