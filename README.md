# Minha Voz — CAA

Protótipo funcional do TCC **"Sistema de Comunicação Aumentativa e Alternativa para crianças com Dificuldade de Fala"**
(Ana Paula Antunes Rego — IFG Câmpus Uruaçu, ADS, 2026).

É um aplicativo web (PWA) em que a criança toca em cartões com pictogramas, monta uma frase e o aparelho fala
em português do Brasil (Web Speech API). O mediador (pai, mãe, professor, fonoaudiólogo) cadastra as crianças,
personaliza a prancha de cada uma e acompanha relatórios de uso.

## Como rodar (VSCode)

Pré-requisito: [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install
npm run dev
```

Abra o endereço que aparecer (normalmente http://localhost:5173).

- **Login da demonstração:** `mediador@escola.com` / `12345678` (já vem preenchido).
- **Ver no celular:** com o `npm run dev` rodando, abra no celular o endereço "Network" que o Vite mostra
  (celular e computador na mesma rede Wi‑Fi).
- **Testar o modo offline / instalar como app (PWA):** `npm run build` e depois `npm run preview`
  (http://localhost:4173). Abra uma vez, depois desligue a internet e recarregue: a prancha continua abrindo.
  No Chrome/Edge aparece a opção "Instalar aplicativo".
- **Prévia online (um arquivo só):** `npm run build:previa` gera `dist-previa/minha-voz.html`, que abre sem servidor
  (navegação pelo `#` do endereço, sempre em "Modo local", sem Service Worker).
- **Voz:** usa as vozes pt‑BR instaladas no aparelho. Chrome e Edge (Windows/Android) funcionam melhor.
  Se não falar, instale uma voz "Português (Brasil)" nas configurações do sistema.

## O que está implementado (requisitos do TCC)

| Requisito | Onde ver |
|---|---|
| RF01 Autenticação do responsável (cadastro, login, recuperar e alterar senha, senha com hash) | `/entrar`, `/criar-conta`, `/recuperar-senha`, Configurações |
| RF02 Gerenciar crianças (cadastrar, editar, excluir) | Painel → Crianças |
| RF03 Prancha de comunicação com pictogramas | Acessar prancha |
| RF04 Síntese de voz ao tocar no cartão e botão "Falar" a frase | Prancha |
| RF05 Esconder/mostrar/reorganizar categorias e cartões, por criança | Categorias, Cartões, Personalizar prancha |
| RF06 LGPD (consentimento, só apelido, exportar e apagar dados) | Criar conta, Configurações |
| RF07 Relatórios de uso (cliques, cartões e categorias mais usados, exportar CSV) | Relatórios |
| RNF PWA/offline, responsivo, alto contraste, tamanho de cartões, voz < 3 s | Prancha, `public/sw.js` |

## Arquitetura (igual à do TCC)

React (navegador) → HTTP/JSON → **API Flask** (`backend/app.py`) → **MySQL**, **Cloud Firestore** ou o arquivo `backend/dados.json`.

O app é *offline-first*: tudo é salvo primeiro no aparelho e enviado para a API quando ela está ligada.
Assim ele funciona de duas formas, sem precisar de conta no Firebase:

- **Só o front-end** (`npm run dev`): "Modo local", dados no navegador.
- **Front-end + API Flask**: abra um segundo terminal e rode a API. No menu lateral aparece
  "Servidor conectado"; os dados passam a ser gravados no MySQL (se configurado) ou em `backend/dados.json` e aparecem em qualquer aparelho
  que fizer login (teste: entre em outro navegador com o mesmo usuário).

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows  (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
python app.py                 # http://localhost:5000/api/saude
```

### Guardar os dados no MySQL

1. Instale o **MySQL Community Server** e o **MySQL Workbench** (https://dev.mysql.com/downloads/installer/,
   opção "Server only" ou "Full"). Na instalação, crie a senha do usuário `root` e guarde-a.
2. Abra o Workbench, conecte como `root` e rode os 4 comandos do topo de `backend/schema.sql`
   (eles criam o banco `minha_voz` e um usuário só para o app). Troque `TroqueEstaSenha` por uma senha forte.
3. Copie `backend/.env.exemplo` para `backend/.env` e coloque nele a mesma senha.
4. `pip install -r requirements.txt` e `python app.py`. Deve aparecer `Minha Voz API usando: BancoMySQL`,
   e http://localhost:5000/api/saude mostra `"banco": "MySQL"`. As tabelas são criadas sozinhas.
5. Abra o app (`npm run dev`) e entre na conta: os dados que já estavam no navegador sobem sozinhos para o MySQL.
   No Workbench: `SELECT * FROM minha_voz.criancas;`

**Como os dados ficam protegidos**

- Senhas nunca são gravadas: só um hash PBKDF2 com sal. Os tokens de sessão também só como hash, e expiram em 30 dias.
- O app usa um usuário do MySQL próprio, que só mexe no banco `minha_voz` (não é o `root`).
- A senha do banco fica no `backend/.env`, fora do código e fora do Git.
- Todas as consultas usam parâmetros, o que impede SQL injection; cada mediador só acessa os próprios dados.
- Coletamos o mínimo (apelido e faixa etária da criança), e o mediador pode exportar ou apagar tudo (LGPD).
- O modo debug do Flask fica desligado por padrão. Para publicar na internet, use HTTPS e não abra a porta
  3306 do MySQL para fora. Faça cópias de segurança com
  `mysqldump -u root -p minha_voz > backup.sql`.

Para usar o **Cloud Firestore** em vez do MySQL: `pip install firebase-admin`, baixe a chave da conta de serviço do seu
projeto Firebase e defina `FIREBASE_CREDENCIAIS=caminho/da/chave.json` (deixe `MYSQL_BANCO` vazio).

## Publicar no GitHub e conectar ao MySQL

No Windows: dois cliques em **`INICIAR.bat`** liga tudo (na primeira vez ele pede a senha do root do MySQL
e cria o banco e o `backend/.env` sozinho). Dois cliques em **`ENVIAR-PARA-GITHUB.bat`** envia as mudanças.


Passo a passo completo em [`GUIA-GITHUB-E-MYSQL.md`](GUIA-GITHUB-E-MYSQL.md): como ligar o app ao MySQL no seu
computador e como enviar o projeto para o GitHub, com o site publicado de graça no GitHub Pages.

## Segurança

Resultado dos testes de ataque (injeção de SQL, acesso a outras contas, força bruta...) em
[`RELATORIO-SEGURANCA.md`](RELATORIO-SEGURANCA.md). Para repetir: com a API ligada, `cd backend` e
`python teste_seguranca.py`.

## Telas

Splash, Início, Entrar (com login social simulado), Criar conta, Recuperar senha, Privacidade/LGPD, Dashboard
(com últimas atividades), Crianças, Cadastro/edição da criança, Personalizar prancha (arrastar e soltar,
ocultar cartões, texto, velocidade), Prancha, Categoria, Ver frase, Categorias, Cartões + modal, Relatórios
(com gráfico e exportar resumo), Configurações, Ajuda (tutorial, perguntas, "como funciona", contato),
Você está offline, Instalar aplicativo. No celular o menu fica embaixo.

## Estrutura

```
src/
  types.ts            entidades do Diagrama de Classes
  data/seed.ts        dados da demonstração (Ana, Lucas, Sofia, Miguel, 8 categorias, 76 cartões)
  store/              estado global e persistência local
  lib/fala.ts         Web Speech API (pt-BR, voz feminina/masculina)
  lib/relatorios.ts   cálculo dos relatórios de uso
  components/         layout do mediador, modais, formulários
  pages/              uma tela por arquivo (Inicio, Entrar, Prancha, PersonalizarPrancha, Relatorios, Ajuda...)
public/sw.js          Service Worker (Cache-First)
backend/app.py        API REST Flask (MySQL, Cloud Firestore ou dados.json)
backend/schema.sql    tabelas do MySQL + criação do banco e do usuário do app
backend/.env.exemplo  modelo das configurações (copie para backend/.env)
src/lib/api.ts        cliente da API + fila de sincronização offline
```
