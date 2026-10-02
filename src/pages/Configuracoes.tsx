import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Accessibility, Download, LogOut, RotateCcw, Server, ShieldCheck, Trash2, UserRound, Volume2 } from 'lucide-react'
import { Cabecalho } from '../components/LayoutMediador'
import { Botao, Entrada, Rotulo, Selecao } from '../components/Campo'
import { Interruptor } from '../components/Interruptor'
import { StatusConexao } from '../components/StatusConexao'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { useConfirmar } from '../components/Confirmacao'
import { carregarVozes, falaSuportada, falar, vozesPortugues } from '../lib/fala'
import { enderecoApi } from '../lib/api'
import { baixarArquivo, cn } from '../lib/utils'
import type { Configuracoes as Config } from '../types'

/** Configurações (tela 17): dados do mediador, acessibilidade, voz, privacidade/LGPD, gerenciar dados e sair. */
export default function Configuracoes() {
  const { mediador, config, salvarConfig, atualizarMediador, alterarSenha, exportarMeusDados, excluirMinhaConta, restaurarDemonstracao, sair, conexao } = useApp()
  const navegar = useNavigate()
  const avisar = useToast()
  const confirmar = useConfirmar()
  const [vozes, setVozes] = useState<SpeechSynthesisVoice[]>([])
  const [nome, setNome] = useState(mediador?.nome ?? '')
  const [papel, setPapel] = useState(mediador?.papel ?? '')
  const [telefone, setTelefone] = useState(mediador?.telefone ?? '')
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')

  useEffect(() => {
    carregarVozes().then((v) => setVozes(vozesPortugues(v)))
  }, [])

  const secao = 'rounded-3xl bg-white p-5 shadow-sm space-y-4'
  const titulo = 'flex items-center gap-2 font-extrabold'

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Cabecalho titulo="Configurações" subtitulo="Conta, acessibilidade, voz e privacidade" />

      <section className={secao}>
        <h2 className={titulo}>
          <UserRound className="size-5 text-primaria-600" /> Dados do mediador
        </h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            atualizarMediador({ nome: nome.trim() || mediador!.nome, papel, telefone })
            avisar('Dados da conta salvos.')
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Rotulo texto="Nome"><Entrada value={nome} onChange={(e) => setNome(e.target.value)} /></Rotulo>
            <Rotulo texto="E-mail"><Entrada value={mediador?.email} disabled /></Rotulo>
            <Rotulo texto="Perfil"><Entrada value={papel} onChange={(e) => setPapel(e.target.value)} /></Rotulo>
            <Rotulo texto="Telefone (opcional)"><Entrada value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" /></Rotulo>
          </div>
          <Botao type="submit">Salvar dados</Botao>
        </form>
        <form
          className="space-y-3 border-t border-slate-100 pt-4"
          onSubmit={async (e) => {
            e.preventDefault()
            if (novaSenha.length < 8) return avisar('A nova senha precisa ter pelo menos 8 caracteres.', 'aviso')
            const r = await alterarSenha(senhaAtual, novaSenha)
            if (!r.ok) return avisar(r.erro, 'aviso')
            setSenhaAtual('')
            setNovaSenha('')
            avisar('Senha alterada.')
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Rotulo texto="Senha atual"><Entrada type="password" value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} autoComplete="current-password" /></Rotulo>
            <Rotulo texto="Nova senha"><Entrada type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} autoComplete="new-password" /></Rotulo>
          </div>
          <Botao type="submit" variante="suave">Alterar senha</Botao>
        </form>
      </section>

      <section className={secao}>
        <h2 className={titulo}>
          <Accessibility className="size-5 text-primaria-600" /> Acessibilidade
        </h2>
        <div>
          <span className="mb-1.5 block text-sm font-bold">Tamanho das fontes do sistema</span>
          <div className="grid grid-cols-3 gap-2">
            {(['Normal', 'Grande', 'Muito grande'] as Config['tamanhoFonte'][]).map((t) => (
              <button
                key={t}
                onClick={() => salvarConfig({ tamanhoFonte: t })}
                className={cn('rounded-xl border py-2 text-sm font-bold', config.tamanhoFonte === t ? 'border-primaria-600 bg-primaria-50 text-primaria-700' : 'border-slate-200 text-slate-500')}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3">
          <div>
            <div className="text-sm font-bold">Tema claro</div>
            <div className="text-xs text-slate-500">Cores suaves e fundo claro. Para cada criança há também o modo de alto contraste.</div>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600">Ativo</span>
        </div>
        <p className="text-xs text-slate-500">
          Tamanho dos pictogramas, contraste, texto nos cartões e velocidade da fala são ajustados por criança em{' '}
          <Link to="/painel/criancas" className="font-bold text-primaria-700">Crianças › Personalizar prancha</Link>.
        </p>
      </section>

      <section className={secao}>
        <h2 className={titulo}>
          <Volume2 className="size-5 text-primaria-600" /> Voz (Web Speech API)
        </h2>
        {!falaSuportada() && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Este navegador não tem síntese de voz. Use Chrome, Edge ou Safari atualizados.</p>}
        {falaSuportada() && vozes.length === 0 && (
          <p className="rounded-xl bg-yellow-50 p-3 text-sm text-yellow-900">Nenhuma voz em português foi encontrada neste aparelho. Instale uma voz pt-BR nas configurações do sistema.</p>
        )}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold">Falar ao tocar no cartão</div>
            <div className="text-xs text-slate-500">Cada cartão é falado na hora (RF04); o botão “Falar” lê a frase inteira.</div>
          </div>
          <Interruptor ligado={config.falarAoTocar} aoMudar={(v) => salvarConfig({ falarAoTocar: v })} rotulo="Falar ao tocar no cartão" />
        </div>
        <Rotulo texto={`Tom da voz: ${config.tomVoz.toFixed(2)}`}>
          <input type="range" min={0.5} max={1.5} step={0.05} value={config.tomVoz} onChange={(e) => salvarConfig({ tomVoz: Number(e.target.value) })} className="w-full accent-primaria-600" />
        </Rotulo>
        {vozes.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Rotulo texto="Voz usada para “Feminina”">
              <Selecao value={config.vozPreferidaFeminina} onChange={(e) => salvarConfig({ vozPreferidaFeminina: e.target.value })}>
                <option value="">Automática</option>
                {vozes.map((v) => (
                  <option key={v.name} value={v.name}>{v.name}</option>
                ))}
              </Selecao>
            </Rotulo>
            <Rotulo texto="Voz usada para “Masculina”">
              <Selecao value={config.vozPreferidaMasculina} onChange={(e) => salvarConfig({ vozPreferidaMasculina: e.target.value })}>
                <option value="">Automática</option>
                {vozes.map((v) => (
                  <option key={v.name} value={v.name}>{v.name}</option>
                ))}
              </Selecao>
            </Rotulo>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {(['Feminina', 'Masculina'] as const).map((g) => (
            <Botao
              key={g}
              variante="contorno"
              onClick={() => falar('Eu quero água, por favor.', { preferencia: g, tom: config.tomVoz, vozFeminina: config.vozPreferidaFeminina, vozMasculina: config.vozPreferidaMasculina })}
            >
              <Volume2 className="size-4" /> Testar voz {g.toLowerCase()}
            </Botao>
          ))}
        </div>
      </section>

      <section className={secao}>
        <h2 className={titulo}>
          <ShieldCheck className="size-5 text-green-600" /> Privacidade e LGPD
        </h2>
        <p className="text-sm text-slate-600">
          O Minha Voz guarda só o necessário: apelido, faixa etária, preferências e o histórico de toques nos cartões. Consentimento registrado em{' '}
          {mediador ? new Date(mediador.consentimentoLGPD).toLocaleString('pt-BR') : '-'}.{' '}
          <Link to="/privacidade" className="font-bold text-primaria-700">Ver política de privacidade</Link>
        </p>
        <div className="flex flex-wrap gap-2">
          <Botao
            variante="contorno"
            onClick={() => {
              baixarArquivo('meus-dados-minha-voz.json', exportarMeusDados(), 'application/json')
              avisar('Seus dados foram exportados.')
            }}
          >
            <Download className="size-4" /> Exportar meus dados
          </Botao>
          <Botao
            variante="perigo"
            onClick={async () => {
              const ok = await confirmar({
                titulo: 'Excluir conta',
                mensagem: 'Sua conta e TODOS os dados das crianças serão apagados deste aparelho e do servidor. Esta ação não pode ser desfeita.',
                confirmar: 'Excluir tudo',
              })
              if (!ok) return
              await excluirMinhaConta()
              navegar('/')
            }}
          >
            <Trash2 className="size-4" /> Excluir minha conta
          </Botao>
        </div>
      </section>

      <section className={secao}>
        <h2 className={titulo}>
          <Server className="size-5 text-primaria-600" /> Servidor (API Flask)
        </h2>
        <StatusConexao />
        <p className="text-sm text-slate-600">
          {conexao === 'servidor'
            ? 'Tudo o que você faz é enviado para a API Flask e gravado no banco (MySQL, Firestore ou dados.json).'
            : 'A API não está ligada: os dados ficam salvos neste aparelho e serão enviados quando o servidor estiver disponível.'}{' '}
          Endereço: <code className="rounded bg-slate-100 px-1">{enderecoApi}</code>
        </p>
      </section>

      <section className={secao}>
        <h2 className={titulo}>Gerenciar dados da demonstração</h2>
        <p className="text-sm text-slate-600">Volta tudo ao estado inicial (Ana Silva, Lucas, Sofia e Miguel) neste navegador.</p>
        <div className="flex flex-wrap gap-2">
          <Botao
            variante="suave"
            onClick={async () => {
              const ok = await confirmar({ titulo: 'Restaurar demonstração', mensagem: 'Tudo que foi criado neste navegador será apagado e os dados de exemplo voltarão.', confirmar: 'Restaurar' })
              if (!ok) return
              restaurarDemonstracao()
              navegar('/entrar')
            }}
          >
            <RotateCcw className="size-4" /> Restaurar demonstração
          </Botao>
          <Botao
            variante="perigo"
            onClick={() => {
              sair()
              navegar('/entrar')
            }}
          >
            <LogOut className="size-4" /> Sair da conta
          </Botao>
        </div>
      </section>
    </div>
  )
}
