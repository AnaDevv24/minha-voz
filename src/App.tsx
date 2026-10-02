import { Navigate, Route, Routes } from 'react-router-dom'
import { RotaProtegida } from './components/RotaProtegida'
import { LayoutMediador } from './components/LayoutMediador'
import Inicio from './pages/Inicio'
import Entrar from './pages/Entrar'
import CriarConta from './pages/CriarConta'
import Dashboard from './pages/Dashboard'
import Criancas from './pages/Criancas'
import PerfilCriancaPage from './pages/PerfilCrianca'
import Categorias from './pages/Categorias'
import Cartoes from './pages/Cartoes'
import Relatorios from './pages/Relatorios'
import Configuracoes from './pages/Configuracoes'
import Prancha from './pages/Prancha'
import RecuperarSenha from './pages/RecuperarSenha'
import Privacidade from './pages/Privacidade'
import Instalar from './pages/Instalar'
import Offline from './pages/Offline'
import Ajuda from './pages/Ajuda'
import PersonalizarPrancha from './pages/PersonalizarPrancha'

export default function App() {
  return (
    <Routes>
      {/* Telas de acesso (Figuras 4 e 5) */}
      <Route path="/" element={<Inicio />} />
      <Route path="/entrar" element={<Entrar />} />
      <Route path="/criar-conta" element={<CriarConta />} />
      <Route path="/recuperar-senha" element={<RecuperarSenha />} />
      <Route path="/privacidade" element={<Privacidade />} />
      <Route path="/instalar" element={<Instalar />} />
      <Route path="/offline" element={<Offline />} />

      {/* RNF08: só usuários autenticados acessam a área do mediador e a prancha */}
      <Route element={<RotaProtegida />}>
        <Route path="/painel" element={<LayoutMediador />}>
          <Route index element={<Dashboard />} />
          <Route path="criancas" element={<Criancas />} />
          <Route path="criancas/nova" element={<PerfilCriancaPage />} />
          <Route path="criancas/:id" element={<PerfilCriancaPage />} />
          <Route path="criancas/:id/personalizar" element={<PersonalizarPrancha />} />
          <Route path="categorias" element={<Categorias />} />
          <Route path="cartoes" element={<Cartoes />} />
          <Route path="relatorios" element={<Relatorios />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="ajuda" element={<Ajuda />} />
        </Route>
        {/* Prancha da criança (Figuras 9 e 10) em tela cheia */}
        <Route path="/prancha/:criancaId/:categoriaId?" element={<Prancha />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
