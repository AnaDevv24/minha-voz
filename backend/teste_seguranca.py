"""
Testes de segurança da API do Minha Voz.

Ataca a API de verdade (com o banco que ela estiver usando) como um invasor faria:
injeção de SQL, acesso a dados de outra conta, roubo de conta, força bruta etc.
Cada teste cria contas novas e aleatórias, então pode rodar quantas vezes quiser.

Como rodar (com a API ligada em outro terminal: python app.py):
    cd backend
    python teste_seguranca.py                       -> testa http://localhost:5000
    python teste_seguranca.py https://seu-site/      -> testa outro endereço
"""
import json
import secrets
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5000").rstrip("/") + "/api"
resultados = []


def req(metodo, caminho, corpo=None, token=None, cru=None):
    dados = cru if cru is not None else (json.dumps(corpo).encode() if corpo is not None else None)
    r = urllib.request.Request(BASE + urllib.parse.quote(caminho, safe="/"), data=dados, method=metodo)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(r, timeout=30) as resp:
            texto = resp.read().decode()
            return resp.status, (json.loads(texto) if texto else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode(errors="replace")
        try:
            return e.code, json.loads(texto)
        except ValueError:
            return e.code, texto


def teste(area, nome, ok, detalhe=""):
    resultados.append((area, nome, ok, detalhe))
    print(f"[{'PASSOU' if ok else 'FALHOU'}] {area} | {nome}" + (f"  ({detalhe})" if detalhe else ""))


def nova_conta(**extra):
    email = f"teste-{secrets.token_hex(4)}@exemplo.com"
    senha = "Senha-" + secrets.token_hex(4)
    s, d = req("POST", "/auth/cadastro", {"email": email, "senha": senha, "nome": "Teste", "consentimentoLGPD": True, **extra})
    assert s == 201, (s, d)
    return {"email": email, "senha": senha, "token": d["token"], "id": d["mediador"]["id"]}


def montar_dados(conta):
    """Cria criança, categoria, cartão, evento e frase de uma conta."""
    sufixo = secrets.token_hex(3)
    ids = {k: f"{k}-{sufixo}" for k in ("cri", "cat", "car", "ev", "fr")}
    t = conta["token"]
    req("PUT", f"/criancas/{ids['cri']}", {"nomeApelido": "Lucas"}, t)
    req("PUT", f"/categorias/{ids['cat']}", {"nome": "Comida"}, t)
    req("PUT", f"/cartoes/{ids['car']}", {"texto": "Água", "categoriaId": ids["cat"]}, t)
    req("POST", "/eventos", [{"id": ids["ev"], "criancaId": ids["cri"], "texto": "Água", "categoriaId": ids["cat"], "data": "2026-10-01T10:00:00+00:00"}], t)
    req("POST", "/frases", [{"id": ids["fr"], "criancaId": ids["cri"], "texto": "Eu quero água", "data": "2026-10-01T10:00:00+00:00"}], t)
    return ids


def main():
    s, d = req("GET", "/saude")
    print(f"API em {BASE} usando: {d.get('banco') if isinstance(d, dict) else d}\n")

    vitima = nova_conta()
    dv = montar_dados(vitima)
    invasor = nova_conta()
    di = montar_dados(invasor)
    ti = invasor["token"]

    # ---------------- 1. Autenticação ----------------
    A = "1. Autenticação"
    s, _ = req("GET", "/criancas")
    teste(A, "Sem token não acessa dados", s == 401, f"HTTP {s}")
    s, _ = req("GET", "/criancas", token="token-inventado-" + secrets.token_hex(16))
    teste(A, "Token inventado é recusado", s == 401, f"HTTP {s}")
    s, _ = req("POST", "/auth/login", {"email": vitima["email"], "senha": "senha-errada"})
    teste(A, "Senha errada é recusada", s == 401, f"HTTP {s}")
    s, d = req("POST", "/auth/login", {"email": vitima["email"], "senha": vitima["senha"]})
    teste(A, "Resposta do login não devolve a senha nem o hash", s == 200 and "senhaHash" not in json.dumps(d), f"HTTP {s}")
    s, d = req("GET", "/meus-dados", token=vitima["token"])
    teste(A, "Exportação de dados não devolve o hash da senha", s == 200 and "senhaHash" not in json.dumps(d), f"HTTP {s}")
    t_sair = req("POST", "/auth/login", {"email": vitima["email"], "senha": vitima["senha"]})[1]["token"]
    req("POST", "/auth/sair", token=t_sair)
    s, _ = req("GET", "/criancas", token=t_sair)
    teste(A, "Depois de sair, o token antigo não funciona mais", s == 401, f"HTTP {s}")
    s, _ = req("POST", "/auth/cadastro", {"email": "x@exemplo.com", "senha": "123", "consentimentoLGPD": True})
    teste(A, "Senha curta (menos de 8) é recusada no cadastro", s == 400, f"HTTP {s}")
    s, _ = req("POST", "/auth/cadastro", {"email": f"y{secrets.token_hex(3)}@exemplo.com", "senha": "12345678"})
    teste(A, "Cadastro sem consentimento LGPD é recusado", s == 400, f"HTTP {s}")

    # ---------------- 2. Injeção de SQL ----------------
    B = "2. Injeção de SQL"
    for carga in ["' OR '1'='1", "' OR 1=1 -- ", "admin'#", "\" OR \"\"=\"", "' UNION SELECT dados FROM mediadores -- "]:
        s, _ = req("POST", "/auth/login", {"email": carga, "senha": carga})
        teste(B, f"Login com {carga!r} não entra", s in (400, 401, 429), f"HTTP {s}")
    s, _ = req("POST", "/auth/login", {"email": vitima["email"] + "' -- ", "senha": "x"})
    teste(B, "E-mail da vítima + comentário SQL não entra", s in (400, 401, 429), f"HTTP {s}")
    s, d = req("GET", "/criancas", token="' OR '1'='1")
    teste(B, "Token com injeção de SQL é recusado", s == 401, f"HTTP {s}")
    s, _ = req("PUT", "/criancas/x' OR '1'='1", {"nomeApelido": "Hack"}, ti)
    teste(B, "Id com injeção de SQL na URL é recusado", s in (400, 404), f"HTTP {s}")
    s, _ = req("DELETE", "/criancas/1' OR '1'='1", token=ti)
    s2, lista = req("GET", "/criancas", token=vitima["token"])
    teste(B, "DELETE com injeção na URL não apaga dados de ninguém", any(c["id"] == dv["cri"] for c in lista), f"HTTP {s}")
    texto = "Robert'); DROP TABLE criancas; --"
    req("PUT", f"/criancas/{di['cri']}", {"nomeApelido": texto[:20]}, ti)
    s, lista = req("GET", "/criancas", token=ti)
    teste(B, "Texto com comando SQL é gravado como texto comum (tabela continua lá)",
          s == 200 and any(c.get("nomeApelido") == texto[:20] for c in lista), f"HTTP {s}")

    # ---------------- 3. Acesso a dados de outra conta ----------------
    C = "3. Isolamento entre contas"
    s, lista = req("GET", "/criancas", token=ti)
    teste(C, "Listar crianças mostra só as do próprio usuário", s == 200 and all(c["mediadorId"] == invasor["id"] for c in lista), f"{len(lista)} itens")
    for col, chave, corpo in [("criancas", "cri", {"nomeApelido": "Hackeado"}), ("categorias", "cat", {"nome": "Hackeado"}),
                              ("cartoes", "car", {"texto": "Hackeado", "categoriaId": di["cat"]})]:
        s, _ = req("PUT", f"/{col}/{dv[chave]}", corpo, ti)
        teste(C, f"Não altera {col} de outra conta", s == 403, f"HTTP {s}")
        s, _ = req("DELETE", f"/{col}/{dv[chave]}", token=ti)
        teste(C, f"Não apaga {col} de outra conta", s == 403, f"HTTP {s}")
    s, _ = req("PUT", f"/criancas/{di['cri']}", {"nomeApelido": "Teste", "mediadorId": vitima["id"]}, ti)
    s2, lista = req("GET", "/criancas", token=vitima["token"])
    teste(C, "Mandar mediadorId de outra pessoa no corpo não passa o dado para ela",
          not any(c["id"] == di["cri"] for c in lista), f"HTTP {s}")
    s, _ = req("GET", f"/criancas/{dv['cri']}/relatorio", token=ti)
    teste(C, "Não lê o relatório da criança de outra conta", s == 404, f"HTTP {s}")
    s, d = req("POST", "/eventos", [{"id": "ev-novo-" + secrets.token_hex(3), "criancaId": dv["cri"], "texto": "x", "categoriaId": dv["cat"], "data": "2026-10-01"}], ti)
    teste(C, "Não registra uso em criança de outra conta", s == 201 and d["recebidos"] == 0, f"recebidos={d.get('recebidos') if isinstance(d, dict) else d}")
    s, d = req("POST", "/eventos", [{"id": dv["ev"], "criancaId": di["cri"], "texto": "x", "categoriaId": di["cat"], "data": "2026-10-01"}], ti)
    s2, rel = req("GET", f"/criancas/{dv['cri']}/relatorio", token=vitima["token"])
    teste(C, "Não sobrescreve um registro de uso de outra conta reaproveitando o id",
          rel.get("totalCliques") == 1, f"cliques da vítima={rel.get('totalCliques')}")
    s, d = req("POST", "/frases", [{"id": dv["fr"], "criancaId": di["cri"], "texto": "x", "data": "2026-10-01"}], ti)
    s2, dados = req("GET", "/meus-dados", token=vitima["token"])
    teste(C, "Não sobrescreve uma frase de outra conta reaproveitando o id",
          any(f["id"] == dv["fr"] for f in dados["frases"]), "")
    s, _ = req("PUT", f"/cartoes/car-{secrets.token_hex(3)}", {"texto": "x", "categoriaId": dv["cat"]}, ti)
    teste(C, "Não cria cartão dentro da categoria de outra conta", s == 400, f"HTTP {s}")

    # ---------------- 4. Roubo de conta ----------------
    D = "4. Roubo de conta"
    s, d = req("POST", "/auth/cadastro", {"id": vitima["id"], "email": f"inv{secrets.token_hex(3)}@exemplo.com",
                                         "senha": "Invasor123", "consentimentoLGPD": True})
    s2, lista = req("GET", "/criancas", token=d["token"]) if isinstance(d, dict) and d.get("token") else (0, [])
    s3, _ = req("POST", "/auth/login", {"email": vitima["email"], "senha": vitima["senha"]})
    teste(D, "Cadastro novo com o id de outra conta não toma a conta dela",
          s3 == 200 and not any(c["id"] == dv["cri"] for c in (lista or [])), f"cadastro HTTP {s}, login da vítima HTTP {s3}")
    s, _ = req("POST", "/auth/cadastro", {"email": vitima["email"], "senha": "Outra-senha-1", "consentimentoLGPD": True})
    teste(D, "Não cria outra conta com o e-mail de alguém", s == 409, f"HTTP {s}")
    s, _ = req("PUT", "/conta/senha", {"atual": "chute", "nova": "NovaSenha123"}, ti)
    teste(D, "Trocar a senha exige a senha atual", s == 403, f"HTTP {s}")
    s, d = req("PUT", "/conta", {"email": vitima["email"], "senhaHash": "x$y", "id": vitima["id"]}, ti)
    s2, _ = req("POST", "/auth/login", {"email": invasor["email"], "senha": invasor["senha"]})
    teste(D, "Editar a conta não deixa trocar e-mail, id ou hash da senha", s2 == 200, f"login depois HTTP {s2}")

    # ---------------- 5. Força bruta e abuso ----------------
    E = "5. Força bruta e abuso"
    alvo = nova_conta()
    codigos = [req("POST", "/auth/login", {"email": alvo["email"], "senha": f"chute{i}"})[0] for i in range(12)]
    teste(E, "Muitas senhas erradas seguidas bloqueiam novas tentativas", 429 in codigos, f"códigos: {sorted(set(codigos))}")
    s, _ = req("PUT", f"/criancas/{'a' * 300}", {"nomeApelido": "x"}, ti)
    teste(E, "Id gigante na URL é recusado sem erro interno", s in (400, 404), f"HTTP {s}")
    s, _ = req("PUT", f"/criancas/cri-{secrets.token_hex(3)}", cru=b"{isto nao e json", token=ti)
    teste(E, "Corpo inválido (não-JSON) não derruba a API", s == 400, f"HTTP {s}")
    s, _ = req("PUT", f"/criancas/cri-{secrets.token_hex(3)}", [1, 2, 3], ti)
    teste(E, "Corpo em formato errado (lista) não derruba a API", s == 400, f"HTTP {s}")
    s, _ = req("PUT", f"/criancas/cri-{secrets.token_hex(3)}", {"nomeApelido": "x", "lixo": "A" * (6 * 1024 * 1024)}, ti)
    teste(E, "Envio gigante (6 MB) é recusado", s == 413, f"HTTP {s}")

    # ---------------- 6. Conteúdo malicioso (XSS) ----------------
    F = "6. Conteúdo malicioso"
    xss = "<img src=x onerror=alert(1)>"
    req("PUT", f"/cartoes/car-{secrets.token_hex(3)}", {"texto": xss, "categoriaId": di["cat"]}, ti)
    s, lista = req("GET", "/cartoes", token=ti)
    teste(F, "Texto com código HTML é guardado sem ser executado pela API (o React mostra como texto)",
          s == 200 and any(c["texto"] == xss for c in lista), "")

    # ---------------- resumo ----------------
    ok = sum(1 for r in resultados if r[2])
    print(f"\n{ok} de {len(resultados)} testes passaram.")
    return 0 if ok == len(resultados) else 1


if __name__ == "__main__":
    sys.exit(main())
