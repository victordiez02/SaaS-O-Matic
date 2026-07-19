# Sesión 00 — Infraestructura Docker (placeholder)

- **Objetivo:** montar el esqueleto mínimo Dockerizado (FastAPI + SQLite, React/Vite,
  Docker Compose) con un placeholder que demuestre que los tres servicios se comunican.
- **Specs de partida:** [estructura-proyecto.md](../02-arquitectura/estructura-proyecto.md)
  (carpetas backend/frontend), plan maestro FASE 5.
- **Qué generó la IA:**
  - Backend: `backend/Dockerfile` (python:3.12-slim + uvicorn), `requirements.txt`,
    `app/main.py` (endpoints `GET /api/health` y `GET /api/ping` bajo router con
    prefijo `/api`, CORS para dev, lifespan que inicializa la BD) y
    `app/db/database.py` (SQLite crudo, tabla `health_pings`).
  - Frontend: `frontend/Dockerfile` multi-stage (node:20-alpine + pnpm build → nginx:alpine),
    `nginx.conf` con `proxy_pass /api → backend:8000` (mismo origen, sin CORS en prod),
    proyecto Vite+React+TS (`package.json`, `vite.config.ts` con proxy en dev,
    `tsconfig.json`, `index.html`, `src/api/client.ts` como único punto de fetch,
    `src/App.tsx` que muestra el estado de los 3 servicios y un botón de persistencia).
  - Raíz: `docker-compose.yml` (backend con volumen `./data:/app/data`, frontend
    `8080:80`, `depends_on`), `.dockerignore` en ambos servicios, `.gitignore` y README
    actualizados.
- **Qué corregí/rechacé y por qué:**
  - `React.CSSProperties` → `import { type CSSProperties }`: con `jsx: react-jsx` el
    namespace `React` no está en ámbito global y rompería el typecheck.
  - Elegido `requirements.txt` en vez de `pyproject.toml` (el plan lo permite) para
    mantener el placeholder mínimo; se migrará al añadir dependencias reales.
  - BD con `sqlite3` crudo a propósito (no SQLAlchemy todavía): esto es solo verificación
    de infraestructura; la capa de modelos real llegará en la sesión de backend.
- **Resultado:** `docker compose build` OK en ambas imágenes. Levantado con
  `docker compose up`:
  - `GET /api/health` → `{"status":"ok","database":"ok"}` directo y vía proxy nginx (8080).
  - `GET /api/ping` incrementa el contador (1 → 2 → 3).
  - Persistencia verificada: tras `docker compose restart backend` el contador se mantiene
    y `./data/saas_o_matic.db` existe en el host.
- **Tests que lo cubren:** ninguno todavía (es scaffolding de infraestructura); la lógica
  de negocio de fases posteriores sí llevará tests según CLAUDE.md.
