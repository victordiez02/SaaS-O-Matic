# Índice del espacio de trabajo con IA

Este es el registro de **cómo** se construyó SaaS-O-Matic, no solo del resultado. El
orden de trabajo fue deliberado: **primero las especificaciones, luego la arquitectura,
y solo después el código** (desarrollo guiado por especificaciones). Cada sesión con la
IA dejó un resumen curado de qué se pidió, qué generó y qué se corrigió.

## Cómo se organizó el trabajo (las fases)

El desarrollo siguió fases en orden estricto; las sesiones de
[`03-sesiones-ia/`](03-sesiones-ia/) se refieren a ellas:

| Fase | Qué | Dónde queda registrado |
|---|---|---|
| 0 | Preparación: repo, directrices para la IA (`.claude/CLAUDE.md`) y skills de negocio | `sesion-00` |
| 1 | **Specs** (reglas de negocio, contrato de API, datos, UX) | [`01-specs/`](01-specs/), `sesion-01` |
| 2 | **Arquitectura**: estructura de capas y ADRs | [`02-arquitectura/`](02-arquitectura/), `sesion-01` |
| 3 | **Backend** con TDD: validador fiscal, motor de tramos, endpoints y auditoría | `sesion-02`…`04` + `correcciones-y-auditoria` |
| 4 | **Frontend**: cliente API, las 3 vistas, selector de divisa y robustez | `sesion-06`…`10` |
| 5 | **Docker Compose**: arranque de un comando | `sesion-11` |

Lo que más peso tiene en el reto es el proceso (planificación y criterio técnico), por
eso las specs y la arquitectura se escribieron **antes** de una sola línea de código.

## Por dónde empezar (recorrido de 30 segundos)

1. [`../enunciado.md`](../enunciado.md) — el reto original, para tener el contexto.
2. [`01-specs/00-vision-general.md`](01-specs/00-vision-general.md) — qué es el
   proyecto, su alcance y el mapa del resto de specs. **El mejor punto de entrada.**
3. [`02-arquitectura/estructura-proyecto.md`](02-arquitectura/estructura-proyecto.md) —
   cómo está organizado el código y por qué.
4. Una sesión de ejemplo, p. ej.
   [`03-sesiones-ia/sesion-03-motor-tarificacion.md`](03-sesiones-ia/sesion-03-motor-tarificacion.md),
   para ver el método (specs → tests → implementación → verificación) en acción.

## Qué hay en cada carpeta

### [`01-specs/`](01-specs/) — Especificaciones (la fuente de verdad)

Las reglas de negocio y el contrato de la API escritos **antes** de programar. Si el
código contradice una spec, gana la spec. Se leen en orden:

- `00-vision-general.md` — alcance, stack, principios transversales.
- `01-reglas-de-negocio.md` — tramos de precio, IVA por país y validación fiscal
  española (DNI/NIE/CIF), con ejemplos calculados a mano que luego son tests.
- `02-contrato-api.md` — los 5 endpoints, request/response y formato de error unificado.
- `03-modelo-de-datos.md` — las dos tablas, sus restricciones e índices.
- `04-frontend-ux.md` — las 3 vistas, sus estados de red y el selector de divisa.

### [`02-arquitectura/`](02-arquitectura/) — Decisiones de arquitectura

- `estructura-proyecto.md` — la separación de capas del backend y por qué evita
  "archivos masivos".
- `decisiones/` — un **ADR** (Architecture Decision Record) por decisión, cada uno con
  su contexto, la decisión y sus consecuencias:
  - ADR-001 — FastAPI como framework.
  - ADR-002 — estructura en capas (router → schema → service → model).
  - ADR-003 — SQLite + SQLAlchemy.
  - ADR-004 — caché de tipos de cambio en el frontend.
  - ADR-005 — creación del esquema con un script explícito, fuera del arranque.
  - ADR-006 — el preview del frontend duplica el cálculo del backend (a propósito).

### [`03-sesiones-ia/`](03-sesiones-ia/) — Bitácora del desarrollo con IA

Un resumen por sesión: objetivo, specs de partida, qué generó la IA, **qué se corrigió o
rechazó y por qué**, y cómo se verificó. Van en orden de desarrollo (00, 01, 02…). También hay una corrección de errores y auditoría:

- [`correcciones-y-auditoria.md`](03-sesiones-ia/correcciones-y-auditoria.md) — la
  auditoría de calidad del backend: qué hallazgos se corrigieron, cuáles se dejaron como
  límite conocido, y el razonamiento de cada decisión. Es el núcleo del criterio técnico.

### Skills propias (`.claude/skills/`)

Dos piezas de lógica reutilizable extraídas a _skills_ para que la IA aplique siempre el
mismo algoritmo en backend y frontend, de forma auditable:

- `spanish-tax-id-validator` — algoritmos oficiales de DNI/NIE/CIF y sus casos canónicos.
- `tiered-pricing` — fórmula de tramos + tabla de IVA y los ejemplos verificados.

Ambas **derivan** de [`01-specs/01-reglas-de-negocio.md`](01-specs/01-reglas-de-negocio.md);
si divergen de la spec, gana la spec.
