# Sesión 11 — Fase 5: Docker Compose

- **Fecha:** 2026-07-19
- **Objetivo:** que `docker compose up` levante backend y frontend funcionando juntos
  sin pasos manuales adicionales, revisando primero los ficheros de una primera pasada
  (existían `backend/Dockerfile`, `frontend/Dockerfile`, `docker-compose.yml` de antes de
  varias sesiones de desarrollo sin Docker) en vez de reescribirlos a ciegas.

## Punto de partida (revisión antes de tocar nada)

- **`docker-compose.yml`** — estructura de base correcta (`backend`, `frontend`,
  volumen `./data`), pero sin ningún paso de `init_db`: el README documentaba
  `docker compose run --rm backend python -m scripts.init_db` como paso manual previo,
  que es justo lo que el objetivo de esta sesión pedía eliminar. Puertos hardcodeados.
- **`backend/Dockerfile`** — base (`python:3.12-slim`, `uvicorn --host 0.0.0.0`)
  correcta, se conserva. **Bug:** solo copiaba `app/`, no `scripts/` — el script de
  init no podía ejecutarse dentro del contenedor tal cual estaba.
- **`backend/.dockerignore`** — correcto (excluye `data/`, `tests/`, `.venv/`), sin
  cambios.
- **`frontend/Dockerfile`** — build multi-stage (`node:20-alpine` + `corepack enable`
  + `pnpm build` → `nginx:alpine`) correcto, se conserva casi íntegro.
- **`frontend/.dockerignore`** — **bug real, el más importante de la revisión:** no
  excluía `.env`. `frontend/.env` (usado solo por `pnpm dev` local) contiene
  `VITE_API_URL=http://localhost:8000/api`; con el `COPY . .` del Dockerfile ese
  fichero habría entrado en el contexto de build y Vite lo habría horneado en el
  bundle de producción, rompiendo el requisito de usar la ruta relativa `/api` en
  Docker (el frontend habría intentado hablar con `localhost:8000` desde el navegador
  del usuario, no con el proxy de nginx).
- **`frontend/nginx.conf`** — ya implementaba exactamente el proxy pedido
  (`/api/` → `http://backend:8000/api/`, mismo patrón que `vite.config.ts` en dev,
  sin CORS). No se tocó.

## Qué se cambió

- **`backend/Dockerfile`** — añadido `COPY scripts ./scripts`.
- **`frontend/.dockerignore`** — añadido `.env` y `.env.*`.
- **`frontend/Dockerfile`** — `pnpm install` → `pnpm install --frozen-lockfile`
  (reproducibilidad; ya existía `pnpm-lock.yaml`).
- **`docker-compose.yml`** — reescrito:
  - Nuevo servicio `init-db`: `command: ["python", "-m", "scripts.init_db"]`, mismo
    volumen y `DATABASE_PATH` que `backend`. Termina tras crear el esquema.
  - `backend` añade `depends_on: init-db: condition: service_completed_successfully`
    — no arranca hasta que el esquema existe.
  - Puertos y ruta de BD parametrizados: `${BACKEND_PORT:-8000}`,
    `${FRONTEND_PORT:-8080}`, `${DATABASE_PATH:-/app/data/saas_o_matic.db}`.
- **`.env.example`** (nuevo, raíz) — documenta `BACKEND_PORT`, `FRONTEND_PORT`,
  `DATABASE_PATH`; `docker compose up` funciona sin copiarlo (usa los valores por
  defecto).
- **`README.md`** — reestructurado en dos arranques: "Docker Compose (recomendado)"
  primero, "sin Docker" después (backend + frontend, ya existía solo la parte de
  backend). Ambas rutas dejan explícito el paso de init de la BD.
- **[ADR-005](../02-arquitectura/decisiones/ADR-005-gestion-de-esquema.md)** — adenda
  documentando la decisión de orquestación (ver más abajo).

## Decisión de arquitectura: init de BD como servicio de Compose, no paso manual

Dos opciones sobre la mesa: (a) documentar `docker compose run --rm backend python -m
scripts.init_db` como paso manual antes de `up` (lo que ya había), o (b) un servicio
`init-db` con `depends_on: condition: service_completed_successfully`.

**Elegida: (b).** Razones:
- El objetivo explícito de la sesión era `docker compose up` sin pasos manuales
  adicionales salvo que se documentaran a propósito — un paso manual obligatorio antes
  del primer `up` incumple eso directamente.
- No entra en conflicto con [ADR-005](../02-arquitectura/decisiones/ADR-005-gestion-de-esquema.md):
  el script sigue siendo el único punto que llama a `create_all`; el ADR ya contemplaba
  esta evolución ("puede correr en CI, en un `docker exec` o a mano"). Documentado como
  adenda al ADR en vez de un ADR nuevo, porque no cambia la decisión de fondo (dónde
  vive la creación del esquema), solo quién la invoca.
- Idempotente por construcción: relanzar `docker compose up` vuelve a correr `init-db`
  sobre una base ya poblada sin efecto (mismo comportamiento que ejecutar el script a
  mano dos veces).

## Cómo levantar todo desde cero

```bash
docker compose up --build
```

Un único comando. `init-db` crea el esquema y termina, luego arrancan `backend` y
`frontend` en ese orden. No hay ningún paso manual antes ni después.

- Frontend: <http://localhost:8080>
- API: <http://localhost:8000/api/health>
- Swagger: <http://localhost:8000/docs>

Para partir de una BD limpia: borrar el directorio `./data` (volumen) antes de
`docker compose up`.

## Verificación

- `docker compose config --quiet` → sin errores (compose file válido, interpolación de
  variables y `depends_on: condition` correctos).
- **No se pudo completar un `docker compose up --build` real en esta sesión**: el
  motor de Docker Desktop del entorno devolvía `500 Internal Server Error` /
  colgaba en `docker ps` y `docker info` de forma persistente — problema del daemon
  local, no relacionado con los ficheros tocados (el error ocurre antes de que
  Compose llegue a construir nada). No se intentó reiniciar Docker Desktop para no
  interferir con otros contenedores que pudiera tener la persona usuaria corriendo.
- Revisión manual línea a línea de los cinco ficheros (`docker-compose.yml`,
  `backend/Dockerfile`, `backend/.dockerignore`, `frontend/Dockerfile`,
  `frontend/.dockerignore`, `frontend/nginx.conf`) contra el código actual
  (`app/core/config.py`, `app/db/session.py`, `scripts/init_db.py`, `app/main.py`,
  `vite.config.ts`, `src/api/client.ts`) para confirmar coherencia de rutas, nombres
  de servicio y variables de entorno.
- Sin tests nuevos (no aplica: esta fase es infraestructura de despliegue, no lógica
  de negocio).

## Pendiente / notas

- **Queda por hacer en la próxima sesión con Docker disponible:** ejecutar
  `docker compose up --build` de verdad, confirmar que `/api/health` responde a
  través de nginx y que un cliente creado vía frontend persiste en `./data` tras
  `docker compose down && docker compose up`. Si algo falla en el build real (p. ej.
  alguna dependencia nativa de un paquete pnpm), no está cubierto por esta revisión
  estática.
- El `.env` de `frontend/` sigue existiendo y sirviendo a `pnpm dev` local sin cambios;
  solo se excluyó del contexto de build de Docker.
