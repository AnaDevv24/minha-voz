import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // npm run build:previa gera a prévia online em um único arquivo (sem Service Worker nem manifest)
  ...(mode === 'previa' && { base: './', publicDir: false as const, build: { outDir: 'dist-previa' } }),
  server: {
    // permite abrir pelo celular na mesma rede (npm run dev -- --host)
    host: true,
  },
}))
