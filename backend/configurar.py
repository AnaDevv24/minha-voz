"""
Configuração automática do MySQL para o Minha Voz (rode uma vez em cada computador).

O que ele faz sozinho:
  1. pede a senha do usuário "root" do MySQL (a que você criou ao instalar);
  2. cria o banco "minha_voz" e o usuário "minhavoz_app" com uma senha forte aleatória;
  3. grava o arquivo backend/.env com essa senha (o .env não vai para o GitHub).

Uso (na pasta backend):  python configurar.py
Pode rodar de novo quando quiser: ele só troca a senha do minhavoz_app e regrava o .env.
"""

import getpass
import os
import secrets
import sys

try:
    import pymysql
except ImportError:
    sys.exit("Falta instalar as bibliotecas. Rode antes:  python -m pip install -r requirements.txt")

PASTA = os.path.dirname(os.path.abspath(__file__))
ARQUIVO_ENV = os.path.join(PASTA, ".env")
BANCO = "minha_voz"
USUARIO = "minhavoz_app"


def conectar_root():
    host = os.environ.get("MYSQL_HOST", "localhost")
    porta = int(os.environ.get("MYSQL_PORTA", "3306"))
    for tentativa in range(3):
        senha = getpass.getpass("Senha do usuario root do MySQL (nao aparece ao digitar): ")
        try:
            return pymysql.connect(host=host, port=porta, user="root", password=senha, charset="utf8mb4")
        except pymysql.err.OperationalError as erro:
            codigo = erro.args[0]
            if codigo == 1045:
                print("Senha do root incorreta. Tente de novo.")
            elif codigo == 2003:
                sys.exit(
                    "Nao consegui falar com o MySQL em localhost:3306.\n"
                    "Confira se o MySQL esta instalado e ligado (Servicos do Windows > MySQL80 > Iniciar)."
                )
            else:
                sys.exit(f"Erro do MySQL: {erro}")
    sys.exit("Senha errada 3 vezes. Rode de novo quando lembrar a senha do root.")


def main():
    print("== Configuracao do MySQL para o Minha Voz ==\n")
    con = conectar_root()
    senha_app = secrets.token_urlsafe(18)  # só letras, números, - e _ (sem aspas nem #)
    with con.cursor() as cur:
        cur.execute(f"CREATE DATABASE IF NOT EXISTS {BANCO} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cur.execute(f"CREATE USER IF NOT EXISTS '{USUARIO}'@'localhost' IDENTIFIED BY %s", (senha_app,))
        cur.execute(f"ALTER USER '{USUARIO}'@'localhost' IDENTIFIED BY %s", (senha_app,))
        cur.execute(
            f"GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX ON {BANCO}.* TO '{USUARIO}'@'localhost'"
        )
        cur.execute("FLUSH PRIVILEGES")
    con.commit()
    con.close()

    with open(ARQUIVO_ENV, "w", encoding="utf-8") as f:
        f.write(
            "# Criado automaticamente por configurar.py. Este arquivo NUNCA vai para o GitHub.\n"
            "MYSQL_HOST=localhost\n"
            "MYSQL_PORTA=3306\n"
            f"MYSQL_BANCO={BANCO}\n"
            f"MYSQL_USUARIO={USUARIO}\n"
            f"MYSQL_SENHA={senha_app}\n"
            "DIAS_SESSAO=30\n"
            "FLASK_DEBUG=0\n"
        )

    # Confere se o usuário novo entra de verdade.
    teste = pymysql.connect(host="localhost", user=USUARIO, password=senha_app, database=BANCO)
    teste.close()
    print(f"\nPronto! Banco '{BANCO}' e usuario '{USUARIO}' criados e conferidos.")
    print(f"Senha do app salva em: {ARQUIVO_ENV}")
    print("Agora ligue a API com:  python app.py")


if __name__ == "__main__":
    main()
