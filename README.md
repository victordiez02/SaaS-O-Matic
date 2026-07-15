# SaaS-O-Matic

Herramienta interna de simulación de suscripciones SaaS. Backend FastAPI + SQLite
(SQLAlchemy), frontend React (Vite, pnpm).

## Arranque del backend (desarrollo local)

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

### Configuración

La ruta del fichero SQLite se controla con la variable de entorno `DATABASE_PATH`
(por defecto `./data/saas_o_matic.db`). El script de init y el servidor leen la misma
variable, así que apuntan a la misma base:

```bash
# Ejemplo: usar otra ruta (mismo valor para init y arranque)
set DATABASE_PATH=./data/mi_base.db   # Windows
export DATABASE_PATH=./data/mi_base.db # Linux/macOS
```

## Arranque con Docker

`docker compose up` levanta backend y frontend. En ese entorno `DATABASE_PATH` apunta a
`/app/data/saas_o_matic.db` (volumen `./data`). Recuerda ejecutar la creación del esquema
dentro del contenedor antes del primer uso:

```bash
docker compose run --rm backend python -m scripts.init_db
docker compose up
```
