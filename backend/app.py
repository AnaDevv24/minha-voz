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


def validar(colecao, doc):
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
        if not banco.obter("categorias", doc.get("categoriaId", "")):
            return "Categoria inexistente."
    return None


# --------------------------------------------------------------------------
# UC-05 Autenticação (RF01)
# --------------------------------------------------------------------------
@app.post("/api/auth/cadastro")
def cadastro():
    d = request.get_json(force=True)
    email = str(d.get("email", "")).strip().lower()
    if not email or len(d.get("senha", "")) < 8:
        return erro("Informe e-mail e senha com pelo menos 8 caracteres.")
    if not d.get("consentimentoLGPD"):
        return erro("É preciso aceitar os termos de privacidade (LGPD).")
    if banco.listar("mediadores", email=email):
        return erro("Já existe uma conta com este e-mail.", 409)
    sal = secrets.token_hex(8)
    mediador = {
        "id": d.get("id") or str(uuid.uuid4()),
        "nome": str(d.get("nome", "")).strip(),
        "email": email,
        "senhaHash": f"{sal}${hash_senha(d['senha'], sal)}",
        "papel": d.get("papel", "Responsável"),
        "telefone": d.get("telefone", ""),
        "consentimentoLGPD": d["consentimentoLGPD"] if isinstance(d["consentimentoLGPD"], str) else agora(),
    }
    banco.salvar("mediadores", mediador)
    return jsonify(token=novo_token(mediador["id"]), mediador=sem_senha(mediador)), 201


@app.post("/api/auth/login")
def login():
    d = request.get_json(force=True)
    achados = banco.listar("mediadores", email=str(d.get("email", "")).strip().lower())
    if achados:
        sal, h = achados[0]["senhaHash"].split("$")
        if hash_senha(d.get("senha", ""), sal) == h:
            return jsonify(token=novo_token(achados[0]["id"]), mediador=sem_senha(achados[0]))
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
    d = request.get_json(force=True)
    m.update({k: d[k] for k in ("nome", "papel", "telefone") if k in d})
    banco.salvar("mediadores", m)
    return jsonify(sem_senha(m))


@app.put("/api/conta/senha")
@autenticado
def alterar_senha(mediador_id):
    m = banco.obter("mediadores", mediador_id)
    d = request.get_json(force=True)
    sal, h = m["senhaHash"].split("$")
    if hash_senha(d.get("atual", ""), sal) != h:
        return erro("Senha atual incorreta.", 403)
    if len(d.get("nova", "")) < 8:
        return erro("A nova senha precisa ter pelo menos 8 caracteres.")
    novo_sal = secrets.token_hex(8)
    m["senhaHash"] = f"{novo_sal}${hash_senha(d['nova'], novo_sal)}"
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
    existente = banco.obter(colecao, doc_id)
    if existente and existente.get("mediadorId") != mediador_id:
        return erro("Sem permissão", 403)
    doc = request.get_json(force=True)
    doc.update(id=doc_id, mediadorId=mediador_id, atualizadoEm=agora())
    problema = validar(colecao, doc)
    if problema:
        return erro(problema)
    return jsonify(banco.salvar(colecao, doc)), 200 if existente else 201


@app.delete("/api/<colecao>/<doc_id>")
@autenticado
def excluir(mediador_id, colecao, doc_id):
    if colecao not in COLECOES_DO_MEDIADOR:
        return erro("Coleção inválida", 404)
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
    d = request.get_json(force=True)
    itens = d if isinstance(d, list) else [d]
    minhas = {c["id"] for c in banco.listar("criancas", mediadorId=mediador_id)}
    validos = [i for i in itens if i.get("criancaId") in minhas and i.get("id")]
    if validos:
        banco.salvar_varios(tipo, validos)
    return jsonify(recebidos=len(validos)), 201


@app.get("/api/criancas/<crianca_id>/relatorio")
@autenticado
def relatorio(mediador_id, crianca_id):
    if not crianca_do_mediador(crianca_id, mediador_id):
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
