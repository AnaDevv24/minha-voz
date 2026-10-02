import { useNavigate } from 'react-router-dom'
import { TelaOffline } from '../components/TelaOffline'

/** Página de demonstração do estado offline (a mesma tela aparece sozinha quando a internet cai). */
export default function Offline() {
  const navegar = useNavigate()
  return (
    <div className="min-h-screen bg-fundo">
      <TelaOffline aoContinuar={() => navegar('/painel')} />
    </div>
  )
}
