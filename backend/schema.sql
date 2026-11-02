-- Minha Voz - CAA: esquema do banco MySQL (MySQL 8 ou MariaDB 10.5+)
--
-- PASSO 1 (uma vez, como administrador "root", no MySQL Workbench ou no terminal):
-- cria o banco e um usuário só para o aplicativo, com permissão apenas nas tabelas dele.
-- Troque 'TroqueEstaSenha' por uma senha forte e use a mesma no arquivo backend/.env.
--
-- CREATE DATABASE minha_voz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- CREATE USER 'minhavoz_app'@'localhost' IDENTIFIED BY 'TroqueEstaSenha';
-- GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX ON minha_voz.* TO 'minhavoz_app'@'localhost';
-- FLUSH PRIVILEGES;
--
-- PASSO 2: as tabelas abaixo são criadas sozinhas quando a API (python app.py) liga.
-- Se preferir criar à mão, rode este arquivo dentro do banco minha_voz.
--
-- Cada tabela guarda o documento completo na coluna `dados` (JSON) e repete em colunas
-- próprias os campos usados nas buscas. Senhas são guardadas só como hash PBKDF2 (com sal)
-- e os tokens de sessão só como hash SHA-256: quem ler o banco não vê nenhuma senha.

CREATE TABLE IF NOT EXISTS mediadores (
  id VARCHAR(64) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  dados JSON NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessoes (
  id CHAR(64) PRIMARY KEY,
  mediador_id VARCHAR(64) NOT NULL,
  dados JSON NOT NULL,
  INDEX idx_sessoes_mediador (mediador_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS criancas (
  id VARCHAR(64) PRIMARY KEY,
  mediador_id VARCHAR(64) NOT NULL,
  dados JSON NOT NULL,
  INDEX idx_criancas_mediador (mediador_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS categorias (
  id VARCHAR(64) PRIMARY KEY,
  mediador_id VARCHAR(64) NOT NULL,
  dados JSON NOT NULL,
  INDEX idx_categorias_mediador (mediador_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cartoes (
  id VARCHAR(64) PRIMARY KEY,
  mediador_id VARCHAR(64) NOT NULL,
  categoria_id VARCHAR(64) NOT NULL,
  dados JSON NOT NULL,
  INDEX idx_cartoes_mediador (mediador_id),
  INDEX idx_cartoes_categoria (categoria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS eventos (
  id VARCHAR(64) PRIMARY KEY,
  crianca_id VARCHAR(64) NOT NULL,
  dados JSON NOT NULL,
  INDEX idx_eventos_crianca (crianca_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS frases (
  id VARCHAR(64) PRIMARY KEY,
  crianca_id VARCHAR(64) NOT NULL,
  dados JSON NOT NULL,
  INDEX idx_frases_crianca (crianca_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
