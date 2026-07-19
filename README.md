# SaaS-O-Matic

Herramienta interna de simulación de suscripciones SaaS. Backend FastAPI + SQLite
(SQLAlchemy), frontend React (Vite, pnpm).

## Arranque con Docker Compose (recomendado)

Un único comando levanta la base de datos (esquema creado), el backend y el frontend:

```bash
docker compose up --build
```

- Frontend: <http://localhost:8080>
- API: <http://localhost:8000/api/health>
- Documentación interactiva (Swagger): <http://localhost:8000/docs>

No hace falta ningún paso manual adicional. El orden de arranque (ver
[ADR-005](ai-workspace/02-arquitectura/decisiones/ADR-005-gestion-de-esquema.md)) lo
resuelve el propio `docker-compose.yml`: el servicio `init-db` ejecuta
`python -m scripts.init_db` (idempotente) y termina; `backend` no arranca hasta que
`init-db` finaliza con éxito (`depends_on: condition: service_completed_successfully`).
El frontend habla con el backend a través del proxy de nginx en `/api` (mismo origen,
sin CORS — ver `frontend/nginx.conf`), replicando en producción el mismo patrón que usa
`vite.config.ts` en desarrollo.

El fichero SQLite se persiste en `./data` (volumen), así que sobrevive a
`docker compose down` / `docker compose up`. Para partir de una base de datos limpia,
borra ese directorio antes de levantar los servicios.

### Configuración

Puertos publicados y ruta del SQLite son configurables sin tocar el `docker-compose.yml`,
copiando `.env.example` a `.env` en la raíz del repo (opcional: los valores por defecto
ya funcionan sin él):

```bash
cp .env.example .env   # BACKEND_PORT, FRONTEND_PORT, DATABASE_PATH
```

## Arranque sin Docker (desarrollo local)

### Backend

Ejecutar desde el directorio `backend/`. **El orden importa**: el esquema de la base
de datos se crea con un script explícito antes de arrancar el servidor (la app no lo
crea al arrancar, ver [ADR-005](ai-workspace/02-arquitectura/decisiones/ADR-005-gestion-de-esquema.md)).

```bash
cd backend

# 1) Instalar dependencias (en un entorno virtual)
python -m venv .venv
.venv\Scripts\activate            # Windows (PowerShell/CMD)
# source .venv/bin/activate       # Linux/macOS
pip install -r requirements.txt

# 2) Crear el esquema de la base de datos (idempotente, se puede repetir)
python -m scripts.init_db

# 3) Arrancar el servidor
uvicorn app.main:app --reload
```

Una vez arrancado:

- API: <http://127.0.0.1:8000/api/health>
- Documentación interactiva (Swagger): <http://127.0.0.1:8000/docs>

La ruta del fichero SQLite se controla con la variable de entorno `DATABASE_PATH`
(por defecto `./data/saas_o_matic.db`). El script de init y el servidor leen la misma
variable, así que apuntan a la misma base:

```bash
# Ejemplo: usar otra ruta (mismo valor para init y arranque)
set DATABASE_PATH=./data/mi_base.db   # Windows
export DATABASE_PATH=./data/mi_base.db # Linux/macOS
```

### Frontend

Ejecutar desde el directorio `frontend/` (requiere el backend ya arrancado, esquema
incluido, en el paso anterior):

```bash
cd frontend
pnpm install
pnpm dev
```

`vite.config.ts` proxya `/api` hacia `http://localhost:8000` en desarrollo, así que no
hace falta CORS ni tocar `VITE_API_URL` salvo que el backend viva en otro host/puerto.
