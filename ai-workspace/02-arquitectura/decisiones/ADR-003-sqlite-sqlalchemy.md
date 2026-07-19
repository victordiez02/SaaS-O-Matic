# ADR-003 — SQLite + SQLAlchemy para la persistencia

**Estado:** aceptada · **Fecha:** 2026-07-14

## Contexto

SQLite es **obligatorio** por el enunciado, así que la decisión real es cómo acceder a
él: SQL crudo (`sqlite3`), un micro-ORM, o SQLAlchemy. Requisitos que pesan: persistir
el desglose del cálculo con `Decimal` (spec 03), restricciones de integridad (UNIQUE en
`tax_id`, FK con cascada, CHECKs), y tests que necesitan una BD limpia y rápida.

## Decisión

**SQLAlchemy 2.x (ORM, stack síncrono)** sobre SQLite.

- Los modelos declarativos documentan el esquema en código y coinciden 1:1 con la
  spec `03-modelo-de-datos.md` — una sola fuente que revisar.
- `Numeric(10, 2)` con `asdecimal=True` hace que los importes viajen como
  `decimal.Decimal` de extremo a extremo, cumpliendo la regla de `CLAUDE.md` sin
  conversiones manuales.
- Restricciones (UNIQUE, CHECK, FK) declaradas en el modelo y creadas por
  `metadata.create_all()`: sin sistema de migraciones (Alembic) porque el esquema es
  estable y la herramienta interna; se documenta como límite conocido.
- Detalle importante de SQLite: las FK no se aplican por defecto → se activa
  `PRAGMA foreign_keys=ON` en cada conexión mediante un event listener en `db/`.
- Tests con SQLite en memoria (`sqlite://`): suite completa en milisegundos.

## Consecuencias

- (+) Integridad garantizada por la BD, no solo por la aplicación.
- (+) Si el proyecto creciera a PostgreSQL, el cambio es de cadena de conexión y
  revisión de tipos, no de reescritura.
- (−) SQLite serializa escrituras; irrelevante para el volumen de una herramienta
  interna comercial.
- (−) Sin Alembic, un cambio de esquema en producción exigiría migración manual —
  aceptado y documentado para este alcance.
- El fichero de BD vive en `./data/` (volumen en Docker Compose) y está en `.gitignore`.
