"""
API REST do Minha Voz - CAA (seções 4.9.1, 9.1, 9.3 e 9.5 do TCC).

Fluxo do TCC (Figura 15): React -> requisição HTTP/JSON -> Flask -> banco de dados.

Persistência (escolhida pelas variáveis do arquivo backend/.env, veja .env.exemplo):
  * MySQL: defina MYSQL_BANCO, MYSQL_USUARIO e MYSQL_SENHA. As tabelas são criadas
    sozinhas na primeira execução (o mesmo esquema está em schema.sql).
  * Cloud Firestore: pip install firebase-admin e defina FIREBASE_CREDENCIAIS com o
    caminho do JSON da conta de serviço do seu projeto Firebase.
  * Sem configuração nenhuma, os dados ficam no arquivo backend/dados.json.

O front-end funciona mesmo com esta API desligada (modo local/offline). Quando ela
está ligada, o React sincroniza tudo aqui automaticamente.

Como rodar:
    cd backend
    python -m venv .venv
    .venv\\Scripts\\activate          (Windows)   |   source .venv/bin/activate  (Linux/macOS)
    pip install -r requirements.txt
    python app.py                    -> http://localhost:5000/api/saude
"""
import hashlib
import hmac
import re
import time
import json
import os
import secrets
import threading
import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

PASTA = os.path.dirname(os.path.abspath(__file__))


def carregar_env(caminho):
    """Lê o arquivo .env (CHAVE=valor por linha). As senhas ficam fora do código e fora do Git."""
    if not os.path.exists(caminho):
        return
    with open(caminho, encoding="utf-8") as f:
        for linha in f:
            linha = linha.strip()
            if linha and not linha.startswith("#") and "=" in linha:
                chave, valor = linha.split("=", 1)
                os.environ.setdefault(chave.strip(), valor.strip().strip('"').strip("'"))


carregar_env(os.path.join(PASTA, ".env"))

app = Flask(__name__)
# Recusa envios maiores que 5 MB (resposta 413), para ninguém lotar o servidor.
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024
CORS(app)

COLECOES_DO_MEDIADOR = ("criancas", "categorias", "cartoes")
DIAS_SESSAO = int(os.environ.get("DIAS_SESSAO", "30"))


# --------------------------------------------------------------------------
# Persistência (mesma interface para arquivo JSON e Firestore)
# --------------------------------------------------------------------------
class BancoArquivo:
    """Guarda as coleções/documentos (no formato do Firestore) em um arquivo JSON."""

    def __init__(self, caminho):
        self.caminho = caminho
        self.trava = threading.Lock()
        self.colecoes: dict[str, dict[str, dict]] = {}
        if os.path.exists(caminho):
            with open(caminho, encoding="utf-8") as f:
                self.colecoes = json.load(f)

    def _gravar(self):
        tmp = self.caminho + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.colecoes, f, ensure_ascii=False)
        os.replace(tmp, self.caminho)

    def listar(self, colecao, **filtros):
        docs = list(self.colecoes.get(colecao, {}).values())
        return [d for d in docs if all(d.get(k) == v for k, v in filtros.items())]

    def obter(self, colecao, doc_id):
        return self.colecoes.get(colecao, {}).get(doc_id)

    def obter_varios(self, colecao, ids):
        docs = self.colecoes.get(colecao, {})
        return [docs[i] for i in ids if i in docs]

    def salvar(self, colecao, doc):
        with self.trava:
            self.colecoes.setdefault(colecao, {})[doc["id"]] = doc
            self._gravar()
        return doc

    def salvar_varios(self, colecao, docs):
        with self.trava:
            alvo = self.colecoes.setdefault(colecao, {})
            for d in docs:
                alvo[d["id"]] = d
            self._gravar()

    def excluir(self, colecao, doc_id):
        with self.trava:
            self.colecoes.get(colecao, {}).pop(doc_id, None)
            self._gravar()


class BancoFirestore:
    """Cloud Firestore via firebase-admin (seção 9.5)."""

    def __init__(self, caminho_credenciais):
        import firebase_admin
        from firebase_admin import credentials, firestore

        firebase_admin.initialize_app(credentials.Certificate(caminho_credenciais))
        self.db = firestore.client()

    def listar(self, colecao, **filtros):
        consulta = self.db.collection(colecao)
        for k, v in filtros.items():
            consulta = consulta.where(k, "==", v)
        return [d.to_dict() for d in consulta.stream()]

    def obter(self, colecao, doc_id):
        d = self.db.collection(colecao).document(doc_id).get()
        return d.to_dict() if d.exists else None

    def obter_varios(self, colecao, ids):
        refs = [self.db.collection(colecao).document(i) for i in ids]
        return [d.to_dict() for d in self.db.get_all(refs) if d.exists] if refs else []

    def salvar(self, colecao, doc):
        self.db.collection(colecao).document(doc["id"]).set(doc)
        return doc

    def salvar_varios(self, colecao, docs):
        lote = self.db.batch()
        for d in docs:
            lote.set(self.db.collection(colecao).document(d["id"]), d)
        lote.commit()

    def excluir(self, colecao, doc_id):
        self.db.collection(colecao).document(doc_id).delete()


class BancoMySQL:
    """
    MySQL (ou MariaDB) via PyMySQL.

    Cada coleção vira uma tabela. As colunas usadas em buscas (e-mail, mediador,
    criança) ficam em colunas próprias com índice; o restante do documento fica
    na coluna `dados` (JSON), para o formato continuar igual ao do Firestore.
    Todas as consultas usam parâmetros (%s), o que evita SQL injection.
    """

    # coleção -> {campo do documento: coluna da tabela}
    TABELAS = {
        "mediadores": {"email": "email"},
        "sessoes": {"mediadorId": "mediador_id"},
        "criancas": {"mediadorId": "mediador_id"},
        "categorias": {"mediadorId": "mediador_id"},
        "cartoes": {"mediadorId": "mediador_id", "categoriaId": "categoria_id"},
        "eventos": {"criancaId": "crianca_id"},
        "frases": {"criancaId": "crianca_id"},
    }

    def __init__(self):
        import pymysql

        self.pymysql = pymysql
        self.config = dict(
            host=os.environ.get("MYSQL_HOST", "localhost"),
            port=int(os.environ.get("MYSQL_PORTA", "3306")),
            user=os.environ["MYSQL_USUARIO"],
            password=os.environ.get("MYSQL_SENHA", ""),
            database=os.environ["MYSQL_BANCO"],
            charset="utf8mb4",
            autocommit=True,
        )
        with open(os.path.join(PASTA, "schema.sql"), encoding="utf-8") as f:
            comandos = [c.strip() for c in f.read().split(";")]
        with self._conectar() as con, con.cursor() as cur:
            for c in comandos:
                # ignora comentários e os comandos de criação do banco/usuário (feitos pelo administrador)
                linhas = [l for l in c.splitlines() if not l.strip().startswith("--")]
                sql = "\n".join(linhas).strip()
                if sql.upper().startswith("CREATE TABLE"):
                    cur.execute(sql)

    def _conectar(self):
        return self.pymysql.connect(**self.config)

    def _tabela(self, colecao):
        if colecao not in self.TABELAS:
            raise ValueError(f"Coleção desconhecida: {colecao}")
        return colecao, self.TABELAS[colecao]

    def listar(self, colecao, **filtros):
        tabela, colunas = self._tabela(colecao)
        where, valores = [], []
        for campo, valor in filtros.items():
            where.append(f"{colunas[campo]} = %s")
            valores.append(valor)
        sql = f"SELECT dados FROM {tabela}" + (" WHERE " + " AND ".join(where) if where else "")
        with self._conectar() as con, con.cursor() as cur:
            cur.execute(sql, valores)
            return [json.loads(l[0]) for l in cur.fetchall()]

    def obter(self, colecao, doc_id):
        tabela, _ = self._tabela(colecao)
        with self._conectar() as con, con.cursor() as cur:
            cur.execute(f"SELECT dados FROM {tabela} WHERE id = %s", (doc_id,))
            linha = cur.fetchone()
            return json.loads(linha[0]) if linha else None

    def obter_varios(self, colecao, ids):
        tabela, _ = self._tabela(colecao)
        ids = list(ids)
        if not ids:
            return []
        with self._conectar() as con, con.cursor() as cur:
            cur.execute(f"SELECT dados FROM {tabela} WHERE id IN ({', '.join(['%s'] * len(ids))})", ids)
            return [json.loads(l[0]) for l in cur.fetchall()]

    def _linha(self, colunas, doc):
        return [doc["id"], *[doc.get(campo) for campo in colunas], json.dumps(doc, ensure_ascii=False)]

    def _sql_salvar(self, tabela, colunas):
        nomes = ["id", *colunas.values(), "dados"]
        marcas = ", ".join(["%s"] * len(nomes))
        atualizar = ", ".join(f"{n} = VALUES({n})" for n in nomes[1:])
        return f"INSERT INTO {tabela} ({', '.join(nomes)}) VALUES ({marcas}) ON DUPLICATE KEY UPDATE {atualizar}"

    def salvar(self, colecao, doc):
        tabela, colunas = self._tabela(colecao)
        with self._conectar() as con, con.cursor() as cur:
            cur.execute(self._sql_salvar(tabela, colunas), self._linha(colunas, doc))
        return doc

    def salvar_varios(self, colecao, docs):
        if not docs:
            return
        tabela, colunas = self._tabela(colecao)
        with self._conectar() as con, con.cursor() as cur:
            cur.executemany(self._sql_salvar(tabela, colunas), [self._linha(colunas, d) for d in docs])

    def excluir(self, colecao, doc_id):
        tabela, _ = self._tabela(colecao)
        with self._conectar() as con, con.cursor() as cur:
            cur.execute(f"DELETE FROM {tabela} WHERE id = %s", (doc_id,))


if os.environ.get("MYSQL_BANCO"):
    banco = BancoMySQL()
elif os.environ.get("FIREBASE_CREDENCIAIS"):
    banco = BancoFirestore(os.environ["FIREBASE_CREDENCIAIS"])
else:
    banco = BancoArquivo(os.path.join(PASTA, "dados.json"))


# --------------------------------------------------------------------------
# Utilidades e regras de negócio
# --------------------------------------------------------------------------
def agora():
    return datetime.now(timezone.utc).isoformat()


def hash_senha(senha: str, sal: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", senha.encode(), sal.encode(), 200_000).hex()


def sem_senha(m: dict) -> dict:
    return {k: v for k, v in m.items() if k != "senhaHash"}


def erro(msg, status=400):
    return jsonify(erro=msg), status


class Recusado(Exception):
    """Pedido inválido: vira uma resposta de erro, nunca um erro interno (500)."""

    def __init__(self, msg, status=400):
        self.msg, self.status = msg, status


@app.errorhandler(Recusado)
def _recusado(e):
    return erro(e.msg, e.status)


@app.errorhandler(400)
def _pedido_invalido(_):
    return erro("Pedido inválido.")


@app.errorhandler(413)
def _grande_demais(_):
    return erro("Envio grande demais (máximo 5 MB).", 413)


@app.after_request
def cabecalhos_de_seguranca(resp):
    """Cabeçalhos que pedem ao navegador para não adivinhar tipos de arquivo, não abrir o site
    dentro de outro (clickjacking) e não vazar o endereço para outros sites."""
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "no-referrer")
    return resp


ID_VALIDO = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")


def checar_id(valor):
    """Ids só com letras, números, ponto, hífen e sublinhado (até 64). Barra qualquer tentativa de injeção."""
    if not isinstance(valor, str) or not ID_VALIDO.match(valor):
        raise Recusado("Identificador inválido.")
    return valor


def corpo_json(lista=False):
    """Lê o JSON do pedido e confere o formato (objeto, ou lista de objetos quando lista=True)."""
    d = request.get_json(silent=True)
    if lista and isinstance(d, list) and all(isinstance(i, dict) for i in d):
        return d
    if isinstance(d, dict):
        return [d] if lista else d
    raise Recusado("Envie os dados em formato JSON.")


def senha_confere(senha, senha_hash):
    sal, h = senha_hash.split("$")
    # compare_digest compara em tempo constante (não dá pistas pelo tempo de resposta)
    return hmac.compare_digest(hash_senha(str(senha), sal), h)


# Proteção contra força bruta: depois de 5 senhas erradas para o mesmo e-mail (ou 30 do mesmo
# endereço de internet) em 15 minutos, o login fica bloqueado por 15 minutos.
JANELA_BLOQUEIO = 15 * 60
_falhas: dict[str, list[float]] = {}
_trava_falhas = threading.Lock()


def _chaves_login(email):
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "").split(",")[0].strip()
    return [f"email:{email}", f"ip:{ip}"]


def login_bloqueado(email):
    agora_s = time.time()
    with _trava_falhas:
        for chave, limite in zip(_chaves_login(email), (5, 30)):
            recentes = [t for t in _falhas.get(chave, []) if agora_s - t < JANELA_BLOQUEIO]
            _falhas[chave] = recentes
            if len(recentes) >= limite:
                return True
    return False


def registrar_falha_login(email):
    with _trava_falhas:
        for chave in _chaves_login(email):
            _falhas.setdefault(chave, []).append(time.time())


def autenticado(f):
    """RNF08: só usuários autenticados acessam os dados."""

    @wraps(f)
    def interno(*args, **kwargs):
        token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        sessao = banco.obter("sessoes", hashlib.sha256(token.encode()).hexdigest()) if token else None
        if not sessao:
            return erro("Não autenticado", 401)
        # A sessão vale por DIAS_SESSAO dias; depois disso é preciso entrar de novo.
        criado = datetime.fromisoformat(sessao["criadoEm"].replace("Z", "+00:00"))
        if datetime.now(timezone.utc) - criado > timedelta(days=DIAS_SESSAO):
            banco.excluir("sessoes", sessao["id"])
            return erro("Sessão expirada, entre novamente.", 401)
        return f(sessao["mediadorId"], *args, **kwargs)

    return interno


def novo_token(mediador_id):
    token = secrets.token_urlsafe(32)
    banco.salvar("sessoes", {"id": hashlib.sha256(token.encode()).hexdigest(), "mediadorId": mediador_id, "criadoEm": agora()})
    return token


def crianca_do_mediador(crianca_id, mediador_id):
    c = banco.obter("criancas", crianca_id)
    return c if c and c.get("mediadorId") == mediador_id else None


def validar(colecao, doc, mediador_id):
    """Regras de negócio mínimas antes de gravar (o Flask como camada de regras, seção 9.3)."""
    if colecao == "criancas":
        if not str(doc.get("nomeApelido", "")).strip():
            return "O apelido é obrigatório."
        if len(doc.get("nomeApelido", "")) > 20:
            return "Use apenas um apelido curto (LGPD)."
    if colecao == "categorias" and not str(doc.get("nome", "")).strip():
        return "O nome da categoria é obrigatório."
    if colecao == "cartoes":
        if not str(doc.get("texto", "")).strip():
            return "O texto do cartão é obrigatório."
        categoria = banco.obter("categorias", str(doc.get("categoriaId", "")))
        if not categoria or categoria.get("mediadorId") != mediador_id:
            return "Categoria inexistente."
    return None


# --------------------------------------------------------------------------
# UC-05 Autenticação (RF01)
# --------------------------------------------------------------------------
@app.post("/api/auth/cadastro")
def cadastro():
    d = corpo_json()
    email = str(d.get("email", "")).strip().lower()
    if not email or "@" not in email or len(email) > 255 or len(str(d.get("senha", ""))) < 8:
        return erro("Informe e-mail e senha com pelo menos 8 caracteres.")
    if not d.get("consentimentoLGPD"):
        return erro("É preciso aceitar os termos de privacidade (LGPD).")
    if banco.listar("mediadores", email=email):
        return erro("Já existe uma conta com este e-mail.", 409)
    # O id pode vir do aparelho (conta criada offline), mas nunca pode ser o de uma conta existente:
    # senão alguém poderia "recadastrar" o id de outra pessoa e tomar a conta dela.
    novo_id = checar_id(d["id"]) if d.get("id") else str(uuid.uuid4())
    if banco.obter("mediadores", novo_id):
        return erro("Não foi possível criar a conta com este identificador.", 409)
    sal = secrets.token_hex(16)
    mediador = {
        "id": novo_id,
        "nome": str(d.get("nome", "")).strip()[:100],
        "email": email,
        "senhaHash": f"{sal}${hash_senha(str(d['senha']), sal)}",
        "papel": str(d.get("papel", "Responsável"))[:50],
        "telefone": str(d.get("telefone", ""))[:30],
        "consentimentoLGPD": d["consentimentoLGPD"] if isinstance(d["consentimentoLGPD"], str) else agora(),
    }
    banco.salvar("mediadores", mediador)
    return jsonify(token=novo_token(mediador["id"]), mediador=sem_senha(mediador)), 201


@app.post("/api/auth/login")
def login():
    d = corpo_json()
    email = str(d.get("email", "")).strip().lower()[:255]
    if login_bloqueado(email):
        return erro("Muitas tentativas erradas. Espere 15 minutos e tente de novo.", 429)
    achados = banco.listar("mediadores", email=email)
    if achados and senha_confere(d.get("senha", ""), achados[0]["senhaHash"]):
        return jsonify(token=novo_token(achados[0]["id"]), mediador=sem_senha(achados[0]))
    registrar_falha_login(email)
    return erro("E-mail ou senha incorretos.", 401)


@app.post("/api/auth/recuperar-senha")
def recuperar_senha():
    # Na versão de produção: gerar link com token e enviar por e-mail (ex.: Firebase Auth).
    return jsonify(mensagem="Se o e-mail estiver cadastrado, um link de redefinição será enviado.")


@app.post("/api/auth/sair")
@autenticado
def sair(mediador_id):
    token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
    banco.excluir("sessoes", hashlib.sha256(token.encode()).hexdigest())
    return "", 204


@app.put("/api/conta")
@autenticado
def atualizar_conta(mediador_id):
    m = banco.obter("mediadores", mediador_id)
    d = corpo_json()
    m.update({k: str(d[k])[:100] for k in ("nome", "papel", "telefone") if k in d})
    banco.salvar("mediadores", m)
    return jsonify(sem_senha(m))


@app.put("/api/conta/senha")
@autenticado
def alterar_senha(mediador_id):
    m = banco.obter("mediadores", mediador_id)
    d = corpo_json()
    if not senha_confere(d.get("atual", ""), m["senhaHash"]):
        return erro("Senha atual incorreta.", 403)
    if len(str(d.get("nova", ""))) < 8:
        return erro("A nova senha precisa ter pelo menos 8 caracteres.")
    novo_sal = secrets.token_hex(16)
    m["senhaHash"] = f"{novo_sal}${hash_senha(str(d['nova']), novo_sal)}"
    banco.salvar("mediadores", m)
    return "", 204


# --------------------------------------------------------------------------
# UC-01, UC-02, UC-03: crianças, categorias e cartões
# --------------------------------------------------------------------------
@app.get("/api/<colecao>")
@autenticado
def listar(mediador_id, colecao):
    if colecao not in COLECOES_DO_MEDIADOR:
        return erro("Coleção inválida", 404)
    return jsonify(sorted(banco.listar(colecao, mediadorId=mediador_id), key=lambda d: d.get("ordem", 0)))


@app.put("/api/<colecao>/<doc_id>")
@autenticado
def salvar(mediador_id, colecao, doc_id):
    """Cria ou atualiza (upsert) um documento. O id vem do front-end, que funciona offline."""
    if colecao not in COLECOES_DO_MEDIADOR:
        return erro("Coleção inválida", 404)
    checar_id(doc_id)
    existente = banco.obter(colecao, doc_id)
    if existente and existente.get("mediadorId") != mediador_id:
        return erro("Sem permissão", 403)
    doc = corpo_json()
    doc.update(id=doc_id, mediadorId=mediador_id, atualizadoEm=agora())
    problema = validar(colecao, doc, mediador_id)
    if problema:
        return erro(problema)
    return jsonify(banco.salvar(colecao, doc)), 200 if existente else 201


@app.delete("/api/<colecao>/<doc_id>")
@autenticado
def excluir(mediador_id, colecao, doc_id):
    if colecao not in COLECOES_DO_MEDIADOR:
        return erro("Coleção inválida", 404)
    checar_id(doc_id)
    doc = banco.obter(colecao, doc_id)
    if doc and doc.get("mediadorId") != mediador_id:
        return erro("Sem permissão", 403)
    if doc:
        banco.excluir(colecao, doc_id)
        if colecao == "criancas":
            for col in ("eventos", "frases"):
                for e in banco.listar(col, criancaId=doc_id):
                    banco.excluir(col, e["id"])
    return "", 204


# --------------------------------------------------------------------------
# UC-07 / RF07: registros de uso e relatório
# --------------------------------------------------------------------------
@app.post("/api/<tipo>")
@autenticado
def registrar(mediador_id, tipo):
    """Recebe um ou vários eventos de toque (/api/eventos) ou frases faladas (/api/frases)."""
    if tipo not in ("eventos", "frases"):
        return erro("Rota inválida", 404)
    itens = corpo_json(lista=True)
    minhas = {c["id"] for c in banco.listar("criancas", mediadorId=mediador_id)}
    candidatos = [i for i in itens
                  if i.get("criancaId") in minhas and isinstance(i.get("id"), str) and ID_VALIDO.match(i["id"])]
    # um id que já existe só pode ser regravado se o registro for de uma criança deste usuário
    de_outros = {a["id"] for a in banco.obter_varios(tipo, {i["id"] for i in candidatos}) if a.get("criancaId") not in minhas}
    validos = [i for i in candidatos if i["id"] not in de_outros]
    if validos:
        banco.salvar_varios(tipo, validos)
    return jsonify(recebidos=len(validos)), 201


@app.get("/api/criancas/<crianca_id>/relatorio")
@autenticado
def relatorio(mediador_id, crianca_id):
    if not ID_VALIDO.match(crianca_id) or not crianca_do_mediador(crianca_id, mediador_id):
        return erro("Não encontrado", 404)
    eventos = banco.listar("eventos", criancaId=crianca_id)
    inicio = request.args.get("inicio")  # data ISO opcional
    if inicio:
        eventos = [e for e in eventos if e["data"] >= inicio]
    por_cartao, por_categoria = {}, {}
    for e in eventos:
        por_cartao[e["texto"]] = por_cartao.get(e["texto"], 0) + 1
        por_categoria[e["categoriaId"]] = por_categoria.get(e["categoriaId"], 0) + 1
    nomes = {c["id"]: c["nome"] for c in banco.listar("categorias", mediadorId=mediador_id)}
    return jsonify(
        totalCliques=len(eventos),
        cartoesDistintos=len(por_cartao),
        sessoes=len({e.get("sessaoId") for e in eventos}),
        ultimaUtilizacao=max((e["data"] for e in eventos), default=None),
        cartoesMaisUsados=[{"texto": t, "total": n} for t, n in sorted(por_cartao.items(), key=lambda x: -x[1])[:10]],
        categoriasMaisUsadas=[{"nome": nomes.get(c, c), "total": n} for c, n in sorted(por_categoria.items(), key=lambda x: -x[1])],
    )


# --------------------------------------------------------------------------
# RF06 LGPD: exportar e apagar todos os dados
# --------------------------------------------------------------------------
@app.get("/api/meus-dados")
@autenticado
def exportar(mediador_id):
    criancas = banco.listar("criancas", mediadorId=mediador_id)
    ids = [c["id"] for c in criancas]
    return jsonify(
        conta=sem_senha(banco.obter("mediadores", mediador_id) or {}),
        criancas=criancas,
        categorias=banco.listar("categorias", mediadorId=mediador_id),
        cartoes=banco.listar("cartoes", mediadorId=mediador_id),
        eventos=[e for i in ids for e in banco.listar("eventos", criancaId=i)],
        frases=[f for i in ids for f in banco.listar("frases", criancaId=i)],
    )


@app.delete("/api/meus-dados")
@autenticado
def apagar(mediador_id):
    for c in banco.listar("criancas", mediadorId=mediador_id):
        for col in ("eventos", "frases"):
            for e in banco.listar(col, criancaId=c["id"]):
                banco.excluir(col, e["id"])
    for col in COLECOES_DO_MEDIADOR:
        for d in banco.listar(col, mediadorId=mediador_id):
            banco.excluir(col, d["id"])
    for s in banco.listar("sessoes", mediadorId=mediador_id):
        banco.excluir("sessoes", s["id"])
    banco.excluir("mediadores", mediador_id)
    return "", 204


@app.get("/api/saude")
def saude():
    return jsonify(status="ok", banco={"BancoMySQL": "MySQL", "BancoFirestore": "Cloud Firestore"}.get(type(banco).__name__, "arquivo dados.json"), hora=agora())


# --------------------------------------------------------------------------
# Site: depois de "npm run build:servidor", o próprio Flask entrega o app (pasta dist/).
# Assim tudo fica num endereço só (ex.: https://seunome.pythonanywhere.com).
# --------------------------------------------------------------------------
PASTA_SITE = os.path.join(os.path.dirname(PASTA), "dist")


@app.get("/")
@app.get("/<path:caminho>")
def site(caminho=""):
    if caminho.startswith("api/"):
        return erro("Rota não encontrada", 404)
    if not os.path.exists(os.path.join(PASTA_SITE, "index.html")):
        # Sem o build: quem abre o endereço da API recebe um aviso, em vez de uma página de erro.
        return (
            "<meta charset='utf-8'><body style='font-family:sans-serif;padding:2rem'>"
            "<h1>API do Minha Voz está ligada ✅</h1>"
            f"<p>Banco em uso: <b>{type(banco).__name__}</b>.</p>"
            "<p>Este endereço é só da API. O aplicativo abre em "
            "<a href='http://localhost:5173'>http://localhost:5173</a> (com <code>npm run dev</code> rodando).</p>"
        )
    arquivo = os.path.join(PASTA_SITE, caminho)
    if caminho and os.path.isfile(arquivo):
        return send_from_directory(PASTA_SITE, caminho)
    # Rotas do React (/painel, /prancha/...) sempre abrem o index.html
    return send_from_directory(PASTA_SITE, "index.html")

if __name__ == "__main__":
    # host 0.0.0.0 permite que o celular na mesma rede Wi-Fi acesse a API.
    # O modo debug fica desligado por padrão: com ele ligado, qualquer pessoa na rede
    # conseguiria executar código pelo depurador do Flask. Use FLASK_DEBUG=1 só no seu computador.
    print(f"Minha Voz API usando: {type(banco).__name__}")
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1", host="0.0.0.0", port=5000, load_dotenv=False)
