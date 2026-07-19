# SaaS-O-Matic

Herramienta interna para que un equipo comercial simule y presupueste suscripciones SaaS.
Registra clientes corporativos (con validación fiscal española real: DNI/NIE/CIF), calcula
el coste mensual con tarificación por tramos más el IVA del país, y permite ver los importes
en varias divisas en tiempo real.

## Cómo trabajé (esto es lo que quiero que se vea)

Trabajé con desarrollo guiado por especificaciones. Antes de escribir código, redacté las
**specs de negocio y el contrato de la API**, y a partir de ahí tomé las decisiones de
arquitectura y las documenté como **ADRs** (un fichero por decisión, con su contexto y sus
consecuencias). Luego desarrollé por fases apoyándome en la IA, y de cada sesión dejé un
**resumen curado**: qué le pedí, qué generó, y sobre todo qué corregí o rechacé y por qué.
Extraje además la lógica de negocio reutilizable (validación fiscal y tarificación) a
**skills propias** para que la IA aplicara siempre el mismo algoritmo de forma auditable, y
me apoyé también en **skills de terceros**. Todo ese proceso vive en
[`ai-workspace/`](ai-workspace/).

Para entender bien el proceso que he seguido, se debe consultar
**[`ai-workspace/INDICE.md`](ai-workspace/INDICE.md)**.

## Stack

- **Backend:** Python 3.12 + FastAPI, SQLite con SQLAlchemy. Documentación automática en `/docs`.
- **Frontend:** React (Vite, TypeScript), pnpm.
- **Orquestación:** Docker Compose.

## Cómo levantarlo

### Con Docker Compose (recomendado)

Un solo comando levanta base de datos, backend y frontend:

```bash
docker compose up --build
```

- Frontend: <http://localhost:8080>
- API: <http://localhost:8000/api/health>
- Swagger: <http://localhost:8000/docs>

No hay pasos manuales. Un servicio `init-db` crea el esquema y termina; el `backend` no
arranca hasta que ese servicio acaba con éxito. Es por diseño: el esquema se crea con un
script explícito, nunca en el arranque de la app (ver
[ADR-005](ai-workspace/02-arquitectura/decisiones/ADR-005-gestion-de-esquema.md)). El SQLite
se guarda en `./data` (volumen); bórralo para empezar de cero. Los puertos y la ruta de la
base se pueden cambiar copiando `.env.example` a `.env`, pero los valores por defecto ya
funcionan.

### Sin Docker (desarrollo local)

**Backend** (desde `backend/`). El orden importa: primero se crea el esquema, luego se
arranca.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows;  source .venv/bin/activate en Linux/macOS
pip install -r requirements.txt
python -m scripts.init_db        # crea el esquema (idempotente)
uvicorn app.main:app --reload
```

**Frontend** (desde `frontend/`, con el backend ya arrancado):

```bash
cd frontend
pnpm install
pnpm dev
```

En desarrollo, Vite hace de proxy de `/api` hacia el backend, así que no hace falta tocar CORS.

### Tests

```bash
cd backend && pytest          # 91 tests (validador fiscal, tramos+IVA, API)
cd frontend && pnpm test      # 26 tests (preview de precios, selector de divisa, formulario)
```

## Límites conocidos

Son decisiones de alcance, tomadas y documentadas a propósito, no descuidos:

- **Sin autenticación:** es una herramienta interna en red de confianza.
- **Solo los usuarios activos afectan al precio.** El almacenamiento y las llamadas a la API
  se guardan con cada simulación pero no tienen coste todavía; el motor queda extensible.
- **El buscador filtra en memoria** (para poder ignorar acentos): correcto para el volumen de
  una herramienta interna, no para millones de clientes.
- **La divisa vuelve a EUR al recargar** la página: el importe canónico siempre es EUR y la
  conversión es solo de presentación.

El detalle de qué se auditó y qué se decidió no corregir está en
[`ai-workspace/03-sesiones-ia/correcciones-y-auditoria.md`](ai-workspace/03-sesiones-ia/correcciones-y-auditoria.md).
