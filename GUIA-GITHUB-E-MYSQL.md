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

### 1.2 Ligar tudo com dois cliques (jeito fácil)

Na pasta do projeto, dê **dois cliques em `INICIAR.bat`**. Ele faz tudo sozinho:

1. instala as bibliotecas do app e da API (só demora na primeira vez);
2. **na primeira vez neste computador**, pede a **senha do root do MySQL** (a do passo 1.1;
   ela não aparece enquanto você digita) e então cria o banco `minha_voz`, o usuário `minhavoz_app`
   com uma senha forte aleatória e o arquivo `backend/.env`. **Não precisa criar nada à mão**;
3. abre a API numa janela separada (tem que aparecer **`Minha Voz API usando: BancoMySQL`**);
4. abre o app no navegador em **http://localhost:5173**.

Nas próximas vezes, os dois cliques só ligam o app e a API. Para desligar, feche as duas janelas pretas.

> As tabelas também são criadas sozinhas pela API na primeira vez (o modelo está em `backend/schema.sql`).

### 1.3 Jeito manual (se preferir os comandos)

**Criar o banco pelo Workbench** (troque `SuaSenhaForte123`; use só letras e números):

```sql
CREATE DATABASE minha_voz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'minhavoz_app'@'localhost' IDENTIFIED BY 'SuaSenhaForte123';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX ON minha_voz.* TO 'minhavoz_app'@'localhost';
FLUSH PRIVILEGES;
```

Depois copie `backend/.env.exemplo` para `backend/.env` e coloque a mesma senha em `MYSQL_SENHA`.
(Ou, em vez disso tudo, rode `python configurar.py` dentro da pasta `backend`.)

**Ligar** em dois terminais do VSCode:

```
npm.cmd install
npm.cmd run dev
```

```
cd backend
python -m pip install -r requirements.txt
python app.py
```

### 1.4 O `.env` e a segurança dele

O `backend/.env` guarda a senha do banco. Ele **não vai para o GitHub** (está no `.gitignore`),
então cada computador cria o seu (o `INICIAR.bat` faz isso na primeira vez).

### 1.5 Conferir

1. Abra **http://localhost:5173** no navegador (não o 5000, que é só a API).
2. Entre com `mediador@escola.com` / `12345678`. No menu deve aparecer **"Servidor conectado"**.
3. No Workbench, na aba **Schemas** (canto inferior esquerdo), clique em atualizar 🔄,
   abra **minha_voz > Tables**, clique com o botão direito em **criancas** e escolha
   **Select Rows - Limit 1000**. As crianças da demonstração aparecem ali.

### 1.6 Problemas comuns

| Mensagem | O que fazer |
|---|---|
| `Access denied for user 'minhavoz_app'` | A senha do `.env` não bate com a do banco. Rode `python configurar.py` na pasta `backend`: ele cria uma senha nova e regrava o `.env` |
| `Senha do root incorreta` | É a senha criada na instalação do MySQL (passo 1.1, tela *Accounts and Roles*) |
| `Nao consegui falar com o MySQL` | Abra *Serviços* do Windows, procure **MySQL80** e clique em **Iniciar** |
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

### 2.3 Enviar o projeto

Na pasta do projeto, dê **dois cliques em `ENVIAR-PARA-GITHUB.bat`**. Ele:

1. pergunta seu usuário e e-mail do GitHub (só na primeira vez);
2. liga a pasta ao repositório **AnaDevv24/minha-voz** (o endereço está no começo do arquivo, se precisar trocar);
3. mostra a lista do que mudou, pede uma frase descrevendo a mudança e envia.

Na primeira vez, o navegador abre para você autorizar: entre com a conta **AnaDevv24**.

> Use sempre o `.bat` (ou os comandos do Git) e **não** o "Upload files" do site do GitHub:
> o envio pelo site deixa de fora arquivos que começam com ponto, como `.github` e `backend/.env.exemplo`.

### 2.4 Ver o site

1. No GitHub, abra a aba **Actions**. Vai aparecer **"Publicar no GitHub Pages"** rodando.
2. Quando ficar ✅ verde, o site abre em:
   **https://anadevv24.github.io/minha-voz/** (o link também aparece em *Settings > Pages*).

Se ficar ❌ vermelho, confira se o passo 2.2 foi feito, clique no item com erro e depois em
**Re-run all jobs**.

### 2.5 Enviar atualizações

Sempre que mudar alguma coisa no projeto, dê dois cliques em **`ENVIAR-PARA-GITHUB.bat`** de novo.
O site é publicado sozinho em 1 a 2 minutos.

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
| Ligar o app e a API com MySQL | Dois cliques em `INICIAR.bat` → http://localhost:5173 |
| Ver os dados | Workbench > Schemas > minha_voz > Tables |
| Publicar atualização | Dois cliques em `ENVIAR-PARA-GITHUB.bat` |
| Ver o site online | https://anadevv24.github.io/minha-voz/ |
