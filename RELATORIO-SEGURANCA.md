# Relatório de segurança: Minha Voz (CAA)

**Data:** 04/10/2026
**O que foi testado:** a API Flask (`backend/app.py`) ligada ao **MySQL** e ao modo arquivo (`dados.json`),
o app React e as dependências do projeto.
**Como:** ataques reais contra a API rodando, feitos pelo script `backend/teste_seguranca.py`
(qualquer pessoa pode repetir, veja o fim deste documento).

## Resumo

| | Antes das correções | Depois das correções |
|---|---|---|
| Testes de ataque que a API barrou | 31 de 41 | **41 de 41** |
| Falhas graves (dava para tomar a conta de outra pessoa) | 1 | 0 |
| Vulnerabilidades conhecidas nas bibliotecas (npm e Python) | 0 | 0 |

Os 41 testes passaram com o **MySQL** e também com o modo **arquivo `dados.json`**.
Depois das correções, o app foi testado de novo de ponta a ponta (login, primeira sincronização,
segundo aparelho vendo os mesmos dados) e continua funcionando.

---

## Respostas diretas

**Existe proteção contra injeção de SQL?**
Sim. Todas as consultas ao MySQL usam parâmetros (`%s`): o que a pessoa digita é sempre tratado como
texto, nunca como comando. Foram feitos 10 ataques de injeção (no login, no token, na URL e nos textos)
e nenhum funcionou. Um texto como `Robert'); DROP TABLE criancas; --` é gravado como um apelido comum
e a tabela continua lá.

**Alguém consegue acessar ou mexer nos dados de outra conta?**
Agora não. Cada pedido é conferido no servidor: a API só devolve, altera ou apaga dados cujo dono é
quem está logado. Foram 13 testes tentando ler, alterar, apagar ou "pegar emprestado" dados de outra
conta, e todos foram barrados.

**Mas antes havia uma falha grave**, encontrada nestes testes e já corrigida: ao criar uma conta nova,
dava para mandar o identificador (id) de uma conta que já existia. A API gravava por cima, e o invasor
ficava com a conta da vítima e com todas as crianças dela. Agora a API recusa (código 409).

**Dá para descobrir a senha tentando várias vezes?**
Agora não fica fácil: depois de 5 senhas erradas para o mesmo e-mail (ou 30 vindas do mesmo endereço
de internet) em 15 minutos, o login fica bloqueado por 15 minutos.

---

## Testes realizados, por parte

Legenda: ✅ passou · ❌ falhou antes da correção (todos passam agora)

### 1. Autenticação (login, sessão e cadastro)

| Teste | Antes | Agora |
|---|---|---|
| Sem token não acessa dados | ✅ | ✅ |
| Token inventado é recusado | ✅ | ✅ |
| Senha errada é recusada | ✅ | ✅ |
| A resposta do login não devolve a senha nem o hash dela | ✅ | ✅ |
| A exportação de dados (LGPD) não devolve o hash da senha | ✅ | ✅ |
| Depois de sair da conta, o token antigo para de funcionar | ✅ | ✅ |
| Senha com menos de 8 caracteres é recusada | ✅ | ✅ |
| Cadastro sem consentimento da LGPD é recusado | ✅ | ✅ |

### 2. Injeção de SQL

| Teste | Antes | Agora |
|---|---|---|
| Login com `' OR '1'='1` | ✅ | ✅ |
| Login com `' OR 1=1 -- ` | ✅ | ✅ |
| Login com `admin'#` | ✅ | ✅ |
| Login com `" OR ""="` | ✅ | ✅ |
| Login com `' UNION SELECT dados FROM mediadores -- ` | ✅ | ✅ |
| E-mail da vítima seguido de comentário SQL | ✅ | ✅ |
| Token com injeção de SQL | ✅ | ✅ |
| Id com comando SQL na URL é recusado | ❌ | ✅ |
| DELETE com injeção na URL não apaga nada de ninguém | ✅ | ✅ |
| Texto com `DROP TABLE` é gravado como texto comum | ✅ | ✅ |

> O ❌ acima **não era uma injeção**: o banco gravava o id esquisito como texto, sem executar nada.
> Mesmo assim, agora a API só aceita ids com letras, números, `-`, `_` e `.` (até 64 caracteres).

### 3. Isolamento entre contas

| Teste | Antes | Agora |
|---|---|---|
| A lista de crianças mostra só as da própria conta | ✅ | ✅ |
| Não altera criança de outra conta | ✅ | ✅ |
| Não apaga criança de outra conta | ✅ | ✅ |
| Não altera categoria de outra conta | ✅ | ✅ |
| Não apaga categoria de outra conta | ✅ | ✅ |
| Não altera cartão de outra conta | ✅ | ✅ |
| Não apaga cartão de outra conta | ✅ | ✅ |
| Mandar o id de outra pessoa como "dono" não passa o dado para ela | ✅ | ✅ |
| Não lê o relatório da criança de outra conta | ✅ | ✅ |
| Não registra uso em criança de outra conta | ✅ | ✅ |
| Não sobrescreve um registro de uso de outra conta reaproveitando o id | ❌ | ✅ |
| Não sobrescreve uma frase falada de outra conta reaproveitando o id | ❌ | ✅ |
| Não cria cartão dentro de uma categoria de outra conta | ❌ | ✅ |

### 4. Roubo de conta

| Teste | Antes | Agora |
|---|---|---|
| **Cadastro novo com o id de outra conta não toma a conta dela** | ❌ **grave** | ✅ |
| Não cria outra conta com o e-mail de alguém | ❌ (efeito da falha acima) | ✅ |
| Trocar a senha exige a senha atual | ✅ | ✅ |
| Editar o perfil não deixa trocar e-mail, id ou hash da senha | ✅ | ✅ |

### 5. Força bruta e abuso

| Teste | Antes | Agora |
|---|---|---|
| Muitas senhas erradas seguidas bloqueiam novas tentativas | ❌ | ✅ |
| Id gigante na URL é recusado sem erro interno | ❌ (erro 500) | ✅ |
| Dados que não são JSON não derrubam a API | ✅ | ✅ |
| Dados no formato errado (lista) não derrubam a API | ❌ (erro 500) | ✅ |
| Envio gigante (6 MB) é recusado | ❌ | ✅ |

### 6. Conteúdo malicioso (XSS)

| Teste | Antes | Agora |
|---|---|---|
| Texto com código HTML (`<img onerror=...>`) é guardado como texto | ✅ | ✅ |

Além disso, o código do app foi revisado: ele **não usa** `dangerouslySetInnerHTML` nem `innerHTML`, então
o React sempre mostra esses textos como texto, sem executar nada.

### 7. Outras verificações

| Verificação | Resultado |
|---|---|
| `npm audit` (bibliotecas do app) | 0 vulnerabilidades conhecidas |
| `pip-audit` (bibliotecas da API) | 0 vulnerabilidades conhecidas |
| Tentar ler arquivos do servidor pela URL (`/../backend/.env`) | Bloqueado (404) |
| Modo debug do Flask (permitiria executar código pela rede) | Desligado por padrão |
| Senha do banco fora do código e do GitHub (`backend/.env` no `.gitignore`) | OK |
| Usuário do MySQL do app só tem acesso ao banco `minha_voz` (não usa o `root`) | OK |
| Cabeçalhos de segurança (`nosniff`, `X-Frame-Options`, `Referrer-Policy`) | Adicionados e conferidos |

---

## Correções feitas

| # | Problema | Gravidade | O que foi feito |
|---|---|---|---|
| 1 | Criar conta com o id de uma conta existente tomava a conta da vítima | **Crítica** | O cadastro recusa ids que já existem (409) |
| 2 | Registros de uso e frases de outra conta podiam ser sobrescritos reaproveitando o id | Média | A API confere o dono de cada registro antes de gravar |
| 3 | Dava para criar cartão dentro da categoria de outra conta | Baixa | A categoria precisa ser do mesmo usuário |
| 4 | Sem limite de tentativas de login (força bruta) | Média | Bloqueio de 15 min após 5 erros por e-mail ou 30 por endereço |
| 5 | Ids estranhos ou gigantes causavam erro interno | Baixa | Ids validados (letras, números, `-`, `_`, `.`, até 64) |
| 6 | Dados em formato errado causavam erro interno (500) | Baixa | A API responde "pedido inválido" (400) |
| 7 | Sem limite de tamanho de envio | Baixa | Máximo de 5 MB por pedido (413) |
| 8 | Comparação de senha podia dar pistas pelo tempo de resposta | Baixa | Comparação em tempo constante (`hmac.compare_digest`) |
| 9 | Faltavam cabeçalhos de segurança | Baixa | Adicionados em todas as respostas |

Também aumentei o "sal" das senhas novas de 8 para 16 bytes. Senhas antigas continuam funcionando.

---

## Como as senhas e os dados ficam guardados

- **Senhas das contas:** nunca são gravadas. O banco guarda só um hash **PBKDF2-SHA256 com 200.000 rodadas
  e sal aleatório**. Quem ler o banco não descobre a senha.
- **Sessões:** o token de login é aleatório (256 bits). O banco guarda só o hash dele, e ele expira em 30 dias.
- **Dados da criança:** só apelido e faixa etária (mínimo exigido pela LGPD). O responsável pode exportar
  ou apagar tudo em Configurações.

---

## Limites que continuam (e o que fazer se for para produção)

| Ponto | Explicação | Recomendação |
|---|---|---|
| Modo local / GitHub Pages | Os dados ficam no navegador do aparelho, sem criptografia. Quem usar o mesmo aparelho e navegador consegue ver. A senha local é guardada como hash SHA-256 sem sal. | Para uso real com várias pessoas, usar a versão com API e MySQL |
| Conta de demonstração | `mediador@escola.com` / `12345678` é pública | Em produção, remover ou trocar a senha |
| Recuperar senha | É simulada (não envia e-mail) | Implementar envio de link por e-mail |
| Bloqueio de força bruta | Fica na memória da API: zera quando ela reinicia | Em produção, guardar no banco ou usar um serviço como o Redis |
| Descobrir se um e-mail tem conta | O cadastro avisa "já existe uma conta com este e-mail" | Comum na maioria dos sites; pode ser trocado por uma mensagem genérica |
| HTTPS | No computador é `http://localhost`. O GitHub Pages já usa HTTPS | Em servidor próprio, sempre usar HTTPS |
| Token no navegador | O token de login fica no `localStorage` | Seguro enquanto não houver falha de XSS (o React protege) |

---

## Como repetir os testes

Com a API ligada (`python app.py`) em um terminal, abra outro terminal e rode:

```
cd backend
python teste_seguranca.py
```

O resultado mostra `[PASSOU]` ou `[FALHOU]` em cada teste e, no fim, quantos passaram.
O script cria contas de teste novas a cada execução, então pode rodar quantas vezes quiser.
