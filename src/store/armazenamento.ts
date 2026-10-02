/*
 * Camada de persistência da demonstração.
 *
 * No TCC, os dados ficam no Cloud Firestore e passam pela API REST em Flask
 * (React -> HTTP/JSON -> Flask -> Firestore, Figura 15). Nesta versão de demonstração
 * tudo fica no próprio navegador (localStorage), o que permite rodar o projeto sem
 * servidor e também mantém a prancha funcionando offline (RNF07).
 * A pasta backend/ traz um exemplo da API Flask com as mesmas rotas.
 */
import type { BancoDeDados } from '../types'
import { criarBancoInicial } from '../data/seed'

const CHAVE_BANCO = 'minha-voz:banco'
const CHAVE_SESSAO = 'minha-voz:sessao'

export function carregarBanco(): BancoDeDados {
  try {
    const bruto = localStorage.getItem(CHAVE_BANCO)
    if (bruto) {
      const banco = JSON.parse(bruto) as BancoDeDados
      if (banco.versao === 2) return banco
    }
  } catch (e) {
    console.warn('Não foi possível ler os dados salvos; usando dados da demonstração.', e)
  }
  return criarBancoInicial()
}

export function salvarBanco(banco: BancoDeDados): boolean {
  try {
    localStorage.setItem(CHAVE_BANCO, JSON.stringify(banco))
    return true
  } catch (e) {
    console.warn('Falha ao salvar os dados (armazenamento cheio?).', e)
    return false
  }
}

export function lerSessao(): string | null {
  try {
    return localStorage.getItem(CHAVE_SESSAO)
  } catch {
    return null
  }
}

export function gravarSessao(mediadorId: string | null) {
  try {
    if (mediadorId) localStorage.setItem(CHAVE_SESSAO, mediadorId)
    else localStorage.removeItem(CHAVE_SESSAO)
  } catch {
    /* sem armazenamento: a sessão dura só enquanto a aba estiver aberta */
  }
}

export function apagarArmazenamento() {
  try {
    localStorage.removeItem(CHAVE_BANCO)
    localStorage.removeItem(CHAVE_SESSAO)
  } catch {
    /* nada a fazer */
  }
}
