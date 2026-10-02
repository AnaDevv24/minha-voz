# Imagem do Minha Voz para servidor: monta o app React e roda a API Flask (que também entrega o app).
# Usada pelo docker-compose.yml (veja PUBLICAR-ONLINE.md).

# 1) Monta o front-end (pasta dist/)
FROM node:22-alpine AS frontend
WORKDIR /src
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build:servidor

# 2) API Flask com gunicorn (servidor de produção)
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt gunicorn
COPY backend/ backend/
COPY --from=frontend /src/dist dist/
RUN rm -f backend/.env backend/dados.json && useradd --system --create-home app && chown -R app /app
USER app
EXPOSE 8000
CMD ["gunicorn", "--chdir", "backend", "--bind", "0.0.0.0:8000", "--workers", "2", "app:app"]
