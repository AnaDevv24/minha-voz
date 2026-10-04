# Guia: conectar ao MySQL e publicar no GitHub

Este guia mostra duas coisas, usando os arquivos que já estão no projeto:

1. **MySQL:** como ligar o app ao banco de dados MySQL no seu computador.
2. **GitHub:** como enviar o projeto para o GitHub e deixar o site aberto de graça pelo GitHub Pages.

Tudo é feito no **Windows**, com o **VSCode**.

---

## Antes de começar

Instale (uma vez só):

| Programa | Onde baixar | Observação |
|---|---|---|
| Node.js 20 ou mais novo | https://nodejs.org | |
| Python 3 | https://www.python.org | Na primeira tela, marque **"Add python.exe to PATH"** |
| Git | https://git-scm.com | Pode ir clicando em **Next** |
| MySQL Installer | https://dev.mysql.com/downloads/installer/ | Instruções na parte 1 |

Depois de instalar, **feche e abra o VSCode de novo**.

> **Dica do PowerShell:** se aparecer o erro *"a execução de scripts foi desabilitada neste sistema"*,
> use `npm.cmd` no lugar de `npm` (ex.: `npm.cmd install`).

---

## Parte 1: conectar o app ao MySQL

O app funciona sozinho no navegador ("Modo local"). Quando a API Flask está ligada e conectada ao MySQL,
tudo o que é feito no app passa a ser gravado no banco ("Servidor conectado").

```
App React (navegador)  →  API Flask (backend/app.py)  →  MySQL (banco minha_voz)
   localhost:5173             localhost:5000               localhost:3306
```

### 1.1 Instalar o MySQL

Abra o **MySQL Installer** e escolha estas opções:

| Tela | O que escolher |
|---|---|
| Choosing a Setup Type | **Full** (instala o servidor e o Workbench) |
| Check Requirements | Se reclamar de algo, clique em **Next** e depois em **Yes** |
| Type and Networking | Deixe *Development Computer* e porta **3306**. **Desmarque** "Open Windows Firewall ports" |
| Authentication Method | **Use Strong Password Encryption (RECOMMENDED)** |
| Accounts and Roles | Crie a senha do usuário **root** e anote |
| Windows Service | Deixe como está (inicia junto com o Windows) |
| Server File Permissions | Deixe a primeira opção |
| Apply Configuration | Clique em **Execute** e depois em **Finish** |
| MySQL Router | Deixe **desmarcado** e clique em **Finish** |
| Samples and Examples | Digite a senha do root, **Check**, **Execute** e **Finish** |

### 1.2 Criar o banco e o usuário do app

1. Abra o **MySQL Workbench** e clique em **Local instance MySQL80**. Digite a senha do root.
2. Na área branca do meio (aba **Query 1**), cole o texto abaixo.
   Troque `SuaSenhaForte123` por uma senha nova, só do app, **com letras e números, sem aspas e sem `#`**:

```sql
CREATE DATABASE minha_voz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'minhavoz_app'@'localhost' IDENTIFIED BY 'SuaSenhaForte123';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX ON minha_voz.* TO 'minhavoz_app'@'localhost';
FLUSH PRIVILEGES;
```

3. Clique no **raio amarelo ⚡** (o primeiro, acima do texto). Embaixo, em *Output*, devem aparecer
   4 linhas com ✅ verde.

> As tabelas **não** precisam ser criadas à mão: a API cria todas sozinhas na primeira vez que liga
> (o modelo delas está em `backend/schema.sql`).

### 1.3 Criar o arquivo `.env` com a senha

1. No VSCode, dentro da pasta `backend`, crie um arquivo chamado **`.env`** (com o ponto na frente).
2. Cole este conteúdo e troque a senha pela mesma do passo 1.2:

```
MYSQL_HOST=localhost
MYSQL_PORTA=3306
MYSQL_BANCO=minha_voz
MYSQL_USUARIO=minhavoz_app
MYSQL_SENHA=SuaSenhaForte123
DIAS_SESSAO=30
FLASK_DEBUG=0
```

3. Salve com **Ctrl+S** (a bolinha branca na aba do arquivo tem que sumir).

> O `.env` guarda a senha do banco. Ele **não vai para o GitHub** (está no `.gitignore`), então cada
> computador precisa criar o seu.

### 1.4 Ligar tudo

São **dois terminais** no VSCode (abra outro pelo **+** do terminal).

**Terminal 1 (o app):** na pasta `minha-voz`

```
npm.cmd install
npm.cmd run dev
```

(O `npm install` só é preciso na primeira vez ou depois de baixar o projeto de novo.)

**Terminal 2 (a API):** na pasta `minha-voz`

```
cd backend
python -m pip install -r requirements.txt
python app.py
```

Tem que aparecer **`Minha Voz API usando: BancoMySQL`**. Deixe os dois terminais abertos.

### 1.5 Conferir

1. Abra **http://localhost:5173** no navegador (não o 5000, que é só a API).
2. Entre com `mediador@escola.com` / `12345678`. No menu deve aparecer **"Servidor conectado"**.
3. No Workbench, na aba **Schemas** (canto inferior esquerdo), clique em atualizar 🔄,
   abra **minha_voz > Tables**, clique com o botão direito em **criancas** e escolha
   **Select Rows - Limit 1000**. As crianças da demonstração aparecem ali.

### 1.6 Problemas comuns

| Mensagem | O que fazer |
|---|---|
| `Access denied for user 'minhavoz_app'` | A senha do `.env` não bate com a do banco. Confira e **salve** o `.env`. Para redefinir, rode no Workbench: `ALTER USER 'minhavoz_app'@'localhost' IDENTIFIED BY 'NovaSenha123';` |
| `can't open file '...\minha-voz\app.py'` | Faltou entrar na pasta: `cd backend` |
| `'vite' não é reconhecido` | Faltou instalar as bibliotecas: `npm.cmd install` |
| Página em branco / "Não foi possível conectar" | Confira se o `npm.cmd run dev` está rodando e abra o endereço que ele mostrar |
| `Can't create database 'minha_voz'; database exists` | Pode ignorar: o banco já foi criado antes |

### 1.7 Como os dados ficam protegidos

- As senhas das contas são guardadas só como **hash** (PBKDF2 com sal), nunca o texto da senha.
- A sessão de login expira em 30 dias (`DIAS_SESSAO`).
- O app usa um usuário próprio do MySQL (`minhavoz_app`), que só mexe no banco `minha_voz`.
- A senha do banco fica só no `.env`, fora do código e fora do GitHub.
- A porta do MySQL fica fechada para a rede (firewall desmarcado na instalação).
- Cópia de segurança: `mysqldump -u root -p minha_voz > backup.sql`

---

## Parte 2: publicar no GitHub

O projeto já vem com a automação `.github/workflows/pages.yml`. Toda vez que você enviar uma atualização,
o GitHub monta o site e publica sozinho no **GitHub Pages**, de graça.

> No GitHub Pages roda o app no **modo demonstração**: os dados ficam salvos no navegador de cada pessoa.
> O MySQL continua sendo usado quando o app roda no seu computador com a API ligada (parte 1).

### 2.1 Criar o repositório

1. Entre no GitHub com a conta que vai ser dona do projeto e abra **https://github.com/new**.
2. Em *Repository name*, digite `minha-voz`.
3. Marque **Public** (o GitHub Pages grátis só funciona em repositório público).
4. **Não** marque "Add a README", ".gitignore" nem licença. Clique em **Create repository**.

### 2.2 Ligar o GitHub Pages

No repositório criado: **Settings > Pages**. Em **Source**, escolha **GitHub Actions**.

### 2.3 Enviar o projeto (primeira vez)

No terminal do VSCode, na pasta `minha-voz` (troque o nome, o e-mail e o endereço do repositório):

```
git config --global user.name "SeuUsuarioDoGitHub"
git config --global user.email "seu-email@exemplo.com"
git init
git add .
git commit -m "Primeira versão do Minha Voz"
git branch -M main
git remote add origin https://github.com/SeuUsuarioDoGitHub/minha-voz.git
git push -u origin main
```

No `git push`, o navegador abre para você autorizar. Entre com a conta dona do repositório.

### 2.4 Ver o site

1. No GitHub, abra a aba **Actions**. Vai aparecer **"Publicar no GitHub Pages"** rodando.
2. Quando ficar ✅ verde, o site abre em:
   **https://SeuUsuarioDoGitHub.github.io/minha-voz/** (o link também aparece em *Settings > Pages*).

Se ficar ❌ vermelho, confira se o passo 2.2 foi feito, clique no item com erro e depois em
**Re-run all jobs**.

### 2.5 Enviar atualizações

Sempre que mudar alguma coisa no projeto:

```
git add .
git commit -m "Descreva aqui o que mudou"
git push
```

O site é publicado de novo sozinho em 1 a 2 minutos.

Também dá para fazer pelo VSCode, sem digitar comandos: ícone **Source Control** (barra da esquerda),
escreva a mensagem, clique em **Commit** e depois em **Sync Changes**.

### 2.6 O que vai e o que não vai para o GitHub

| Vai | Não vai (está no `.gitignore`) |
|---|---|
| Todo o código (`src/`, `backend/`, `public/`...) | `node_modules/` (recriado com `npm install`) |
| `package.json` e `package-lock.json` | `backend/.env` (senha do banco) |
| `backend/schema.sql` (modelo das tabelas) | `dist/` (gerado na publicação) |
| `.github/workflows/pages.yml` (a automação) | `backend/dados.json` |

---

## Resumo rápido

| Quero... | Comando / lugar |
|---|---|
| Rodar o app | `npm.cmd run dev` → http://localhost:5173 |
| Ligar a API com MySQL | `cd backend` e `python app.py` |
| Ver os dados | Workbench > Schemas > minha_voz > Tables |
| Publicar atualização | `git add .`, `git commit -m "..."`, `git push` |
| Ver o site online | https://SeuUsuarioDoGitHub.github.io/minha-voz/ |
