import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Atom, Cloud, Database, Mail, Server, Smartphone, Volume2, WifiOff } from 'lucide-react'
import { Cabecalho } from '../components/LayoutMediador'
import { AreaTexto, Botao, Entrada, Rotulo } from '../components/Campo'
import { useApp } from '../store/AppStore'
import { useToast } from '../components/Toast'
import { enderecoApi } from '../lib/api'
import { cn } from '../lib/utils'

const TUTORIAL = [
  { emoji: '👧', titulo: 'Cadastre a criança', texto: 'Em Crianças > Nova criança, informe apelido, faixa etária e preferências.' },
  { emoji: '🎨', titulo: 'Personalize a prancha', texto: 'Escolha categorias, esconda cartões, ajuste tamanho, contraste e voz.' },
  { emoji: '🃏', titulo: 'Crie cartões', texto: 'Em Cartões > Novo cartão, escolha um pictograma ou envie uma foto e teste a voz.' },
  { emoji: '🗣️', titulo: 'Use a prancha', texto: 'A criança toca nos cartões, a frase aparece no topo e o botão Falar lê tudo.' },
  { emoji: '📊', titulo: 'Acompanhe', texto: 'Em Relatórios, veja os cartões e categorias mais usados e exporte um resumo.' },
]

const PERGUNTAS = [
  ['O aplicativo não fala. O que fazer?', 'Aumente o volume e use Chrome ou Edge. Se mesmo assim não falar, instale uma voz “Português (Brasil)” nas configurações do sistema (Windows: Configurações > Hora e idioma > Fala; Android: Configurações > Acessibilidade > Saída de conversão de texto em voz).'],
  ['Funciona sem internet?', 'Sim. Depois do primeiro acesso, a prancha, os pictogramas e a voz continuam funcionando offline. O que for alterado é enviado ao servidor quando a conexão voltar.'],
  ['Como a criança sai da prancha?', 'Os botões de voltar e de configurações da prancha precisam ser segurados por cerca de 1 segundo. Isso evita que a criança saia sem querer.'],
  ['Posso usar uma foto real no cartão?', 'Pode. No cadastro do cartão, toque em “Carregar imagem”. Evite fotos do rosto da criança (LGPD).'],
  ['Mais de um mediador pode acompanhar a mesma criança?', 'Nesta versão cada mediador tem as suas crianças. O compartilhamento entre pais e terapeutas é uma evolução prevista.'],
  ['Como apagar os dados?', 'Em Configurações > Privacidade e LGPD você pode exportar ou excluir a conta e todos os dados.'],
]

/** Ajuda (tutorial, perguntas frequentes, contato) + anotações técnicas da arquitetura do TCC. */
export default function Ajuda() {
  const { conexao } = useApp()
  const avisar = useToast()
  const [aba, setAba] = useState<'tutorial' | 'perguntas' | 'tecnico' | 'contato'>('tutorial')

  const camadas = [
    { icone: Atom, nome: 'React.js', papel: 'Componentes da interface (prancha, cartões, painel). Estado com useState/Context.', ativo: true },
    { icone: Server, nome: 'Python + Flask', papel: `API REST e regras de negócio (backend/app.py) em ${enderecoApi}.`, ativo: conexao === 'servidor' },
    { icone: Database, nome: 'Banco de dados (MySQL ou Cloud Firestore)', papel: 'Guarda responsáveis, perfis, categorias, cartões e relatórios. Sem configuração, o Flask usa o arquivo dados.json.', ativo: conexao === 'servidor' },
    { icone: Volume2, nome: 'Web Speech API', papel: 'Fala o texto dos cartões no próprio aparelho, em pt-BR, sem internet e sem custo.', ativo: 'speechSynthesis' in window },
    { icone: WifiOff, nome: 'PWA', papel: 'Manifesto + Service Worker (Cache-First): instalação na tela inicial e funcionamento parcial offline.', ativo: 'serviceWorker' in navigator },
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <Cabecalho titulo="Ajuda" subtitulo="Tutorial, perguntas frequentes e suporte" />
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {(
          [
            ['tutorial', 'Tutorial'],
            ['perguntas', 'Perguntas frequentes'],
            ['tecnico', 'Como funciona'],
            ['contato', 'Contato'],
          ] as const
        ).map(([id, r]) => (
          <button key={id} onClick={() => setAba(id)} className={cn('shrink-0 rounded-full px-4 py-2 text-sm font-bold', aba === id ? 'bg-primaria-600 text-white' : 'bg-white text-slate-600')}>
            {r}
          </button>
        ))}
      </div>

      {aba === 'tutorial' && (
        <ol className="space-y-3">
          {TUTORIAL.map((t, i) => (
            <li key={t.titulo} className="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-sm">
              <span className="pictograma flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primaria-50 text-3xl">{t.emoji}</span>
              <div>
                <div className="text-xs font-bold text-primaria-700">Passo {i + 1}</div>
                <div className="font-extrabold">{t.titulo}</div>
                <div className="text-sm text-slate-600">{t.texto}</div>
              </div>
            </li>
          ))}
        </ol>
      )}

      {aba === 'perguntas' && (
        <div className="space-y-2">
          {PERGUNTAS.map(([p, r]) => (
            <details key={p} className="group rounded-2xl bg-white p-4 shadow-sm">
              <summary className="cursor-pointer list-none font-bold marker:hidden">
                <span className="mr-2 text-primaria-600 group-open:hidden">+</span>
                <span className="mr-2 hidden text-primaria-600 group-open:inline">−</span>
                {p}
              </summary>
              <p className="mt-2 text-sm text-slate-600">{r}</p>
            </details>
          ))}
        </div>
      )}

      {aba === 'tecnico' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto rounded-3xl bg-white p-4 text-xs font-bold shadow-sm">
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-primaria-50 px-3 py-1.5"><Smartphone className="size-4" /> React (navegador)</span>
            <span>→ HTTP/JSON →</span>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-green-50 px-3 py-1.5"><Server className="size-4" /> Flask</span>
            <span>→</span>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-yellow-50 px-3 py-1.5"><Cloud className="size-4" /> MySQL / Firestore</span>
          </div>
          {camadas.map(({ icone: Icone, nome, papel, ativo }) => (
            <div key={nome} className="flex gap-4 rounded-3xl bg-white p-4 shadow-sm">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-primaria-600">
                <Icone className="size-5" />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 font-extrabold">
                  {nome}
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px]', ativo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500')}>{ativo ? 'ativo' : 'desligado'}</span>
                </div>
                <p className="text-sm text-slate-600">{papel}</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-slate-500">
            Ver também: <Link to="/offline" className="font-bold text-primaria-700">tela offline</Link> ·{' '}
            <Link to="/instalar" className="font-bold text-primaria-700">instalação do PWA</Link> ·{' '}
            <Link to="/privacidade" className="font-bold text-primaria-700">privacidade (LGPD)</Link>
          </p>
        </div>
      )}

      {aba === 'contato' && (
        <form
          className="space-y-4 rounded-3xl bg-white p-5 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault()
            ;(e.target as HTMLFormElement).reset()
            avisar('Mensagem enviada! Responderemos pelo seu e-mail. (simulado)')
          }}
        >
          <div className="flex items-center gap-2 font-extrabold">
            <Mail className="size-5 text-primaria-600" /> Fale com o suporte
          </div>
          <Rotulo texto="Assunto">
            <Entrada required placeholder="Ex.: dúvida sobre a voz" />
          </Rotulo>
          <Rotulo texto="Mensagem">
            <AreaTexto required placeholder="Conte como podemos ajudar" />
          </Rotulo>
          <Botao type="submit">Enviar mensagem</Botao>
        </form>
      )}
    </div>
  )
}
