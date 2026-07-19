# ADR-005 — Creación del esquema mediante script explícito, no en el arranque

**Estado:** aceptada · **Fecha:** 2026-07-14

## Contexto

Con SQLAlchemy sobre SQLite (ADR-003) hay que decidir **quién y cuándo** crea las
tablas. El patrón que suele generar la IA es cómodo pero problemático: llamar a
`Base.metadata.create_all()` en el `lifespan`/`startup` de FastAPI, de modo que el
esquema aparece "solo" al arrancar la app. Ese acoplamiento mezcla dos ciclos de vida
distintos —el de la aplicación y el de la base de datos— y esconde un efecto colateral
(escribir el esquema en disco) dentro de una operación que debería ser de solo lectura
del estado (levantar el servidor). En un arranque en producción con varios procesos
worker, además, varios intentos concurrentes de `create_all` compiten por el mismo
fichero.

Requisitos que pesan: el esquema debe poder crearse de forma **predecible y explícita**,
la app debe poder arrancar sin sorpresas contra una BD ya existente, y el enunciado es
una herramienta interna donde SQLite es obligatorio (sin Alembic por ahora, ADR-003).

## Decisión

**El esquema lo crea un script independiente, `backend/scripts/init_db.py`, ejecutado a
mano por la persona usuaria antes de arrancar el servidor** (`python -m scripts.init_db`).

- Ese script es el **único** punto del proyecto que llama a `create_all`. Importa
  `Base.metadata` y los modelos, crea las tablas ausentes y deja un informe por consola
  (ruta del fichero y tablas creadas / ya existentes).
- Es **idempotente**: `create_all` usa `checkfirst=True`, así que reejecutarlo no rompe
  ni borra datos; sobre una BD ya poblada no hace nada.
- **FastAPI no crea ni modifica el esquema**: no hay `create_all` en el `lifespan`,
  en el arranque ni en las peticiones. La capa `app/db/` aporta engine, sesión y el
  `PRAGMA foreign_keys=ON`, pero nunca DDL. Si la app arranca y la BD no existe, es
  responsabilidad de quien despliega haber ejecutado antes el script.
- Orden de arranque documentado en el README: 1) instalar dependencias, 2) `init_db`,
  3) `uvicorn`.

## Consecuencias

- (+) **Separación de ciclos de vida**: gestionar la BD (crear/migrar) es una operación
  deliberada y observable, no un efecto colateral del arranque del servidor.
- (+) **Arranque predecible e idempotente**: la app siempre asume un esquema ya presente;
  el script puede correr en CI, en un `docker exec` o a mano sin condiciones de carrera.
- (+) **Camino natural a migraciones**: `init_db.py` ocupa el hueco que en producción
  ocuparía `alembic upgrade head`. Migrar a Alembic es sustituir la implementación del
  paso 2 del arranque, no rediseñar el flujo.
- (−) Un paso manual más antes del primer arranque; se mitiga documentándolo en el README
  y con el mensaje de consola del propio script.
- (−) El script no versiona cambios de esquema (no es su objetivo): un `ALTER` en una BD
  existente seguiría exigiendo intervención manual mientras no se adopte Alembic —
  límite conocido y aceptado para este alcance, coherente con ADR-003.

## Evolución en producción

En un despliegue real este script evolucionaría hacia **migraciones versionadas con
Alembic**: cada cambio de esquema sería una revisión con `upgrade`/`downgrade`
reproducible, aplicada como paso explícito del despliegue (`alembic upgrade head`),
manteniendo intacta la decisión de fondo de este ADR: **el esquema se gestiona fuera del
ciclo de vida de la aplicación**.

## Adenda (2026-07-19) — orquestación en Docker Compose

Al montar `docker-compose.yml` (Fase 5) se necesitaba que `docker compose up` levantara
todo sin pasos manuales, sin dejar de invocar el script explícitamente (no vale
`create_all` en el arranque de `backend`, seguiría violando la decisión de fondo).

**Decisión:** un servicio `init-db` en el compose ejecuta `python -m scripts.init_db`
como único comando y termina; `backend` declara
`depends_on: init-db: condition: service_completed_successfully`, así que no arranca
hasta que el esquema existe. Es exactamente el `docker exec`/CI que este ADR ya
contemplaba como evolución natural — el script sigue siendo el único punto que llama a
`create_all`, solo cambia quién lo invoca (Compose en vez de la persona usuaria a mano).
Sigue siendo idempotente: relanzar `docker compose up` vuelve a correr `init-db` sobre
una BD ya poblada sin efecto.
