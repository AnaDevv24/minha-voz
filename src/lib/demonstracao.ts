import { useEffect } from 'react'
import { useApp } from '../store/AppStore'

/**
 * "Ver demonstração" (tela inicial): abre a prancha de exemplo sem a pessoa precisar entrar numa conta.
 * Por baixo usa a conta de demonstração, mas marca a sessão como demonstração para sair dela
 * assim que a pessoa volta para a tela inicial ou para o login.
 */
const CHAVE = 'minha-voz:demonstracao'

export function emDemonstracao(): boolean {
  try {
    return localStorage.getItem(CHAVE) === '1'
  } catch {
    return false
  }
}

export function marcarDemonstracao(ativa: boolean) {
  try {
    if (ativa) localStorage.setItem(CHAVE, '1')
    else localStorage.removeItem(CHAVE)
  } catch {
    /* sem armazenamento: a demonstração apenas não é encerrada sozinha */
  }
}

/** Usado nas telas públicas: se a pessoa veio da demonstração, sai da conta de exemplo. */
export function useEncerrarDemonstracao() {
  const { sair } = useApp()
  useEffect(() => {
    if (emDemonstracao()) {
      marcarDemonstracao(false)
      sair()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
