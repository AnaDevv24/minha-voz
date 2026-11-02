import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../store/AppStore'

/** RNF08: somente usuários autenticados acessam o painel e a prancha. */
export function RotaProtegida() {
  const { mediador } = useApp()
  const local = useLocation()
  if (!mediador) return <Navigate to="/entrar" replace state={{ de: local.pathname }} />
  return <Outlet />
}
