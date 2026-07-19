# Sesión 01 — Specs y arquitectura (Fases 1 y 2)

- **Fecha:** 2026-07-14
- **Objetivo:** producir todos los entregables de documentación de la Fase 1
  (Spec-Driven Development) y la Fase 2 (Arquitectura) del plan maestro, sin escribir
  aún código de aplicación. Además, extraer la lógica de negocio reutilizable a skills.

- **Specs de partida:** `enunciado.md` (requisitos oficiales), `plan-saas-o-matic.md`
  (plan de 8 fases y chuleta técnica), `.claude/CLAUDE.md` (directrices de
  arquitectura y calidad).

- **Prompts clave usados:**
  1. Prompt inicial con el alcance cerrado de la sesión (solo Fases 1 y 2, nada de
     código), la lista exacta de ficheros a crear y la instrucción de proponer un
     índice antes de generar nada.
  2. Ajuste tras el índice: enfoque híbrido specs + skills (extraer validación fiscal
     y tarificación a `.claude/skills/` usando el patrón de /skill-creator, dejando
     las specs como fuente de verdad) y creación de una bitácora narrada en primera
     persona.

- **Qué generó la IA:**
  - `ai-workspace/01-specs/`: `00-vision-general.md`, `01-reglas-de-negocio.md`
    (tramos con 4 ejemplos a mano, tabla de IVA, algoritmos DNI/NIE/CIF con 18 casos
    de test), `02-contrato-api.md` (5 endpoints con JSON de ejemplo y errores
    unificados), `03-modelo-de-datos.md` (customers + simulations con desglose
    persistido), `04-frontend-ux.md` (3 vistas con estados y selector de divisa).
  - `ai-workspace/02-arquitectura/`: `estructura-proyecto.md` y 4 ADRs (FastAPI,
    capas, SQLite+SQLAlchemy, caché de tipos de cambio).
  - Skills: `.claude/skills/spanish-tax-id-validator/SKILL.md` y
    `.claude/skills/tiered-pricing/SKILL.md`, derivadas de la spec 01.
  - `ai-workspace/bitacora.md` (diario narrado del proyecto).

- **Decisiones de diseño cerradas por escrito** (ambigüedades del enunciado):
  1. Endpoints GET no especificados → se proponen buscador, detalle e historial
     (spec 02).
  2. `storage_gb` y `api_calls` sin precio definido → se persisten sin coste, motor
     extensible (spec 01).
  3. Alcance del IVA → 5 países UE + 0 % por defecto, tabla en configuración y tasa
     congelada por simulación (spec 01).
  4. "Plan Elegido" sin efecto en precio → enum comercial `basic|pro|enterprise`
     (spec 02).
  5. Duplicado de `tax_id` → 409 Conflict, no 422 (spec 02).
  6. Enfoque híbrido spec + skill para la lógica reutilizable (nota en spec 01).

- **Qué corregí/rechacé y por qué:** el índice inicial de la IA proponía solo specs
  markdown; pedí además extraer la validación fiscal y el pricing a skills para que
  backend y preview del frontend apliquen exactamente el mismo algoritmo de forma
  auditable, y una bitácora narrada como registro legible del proceso.

- **Resultado:** 14 ficheros de documentación/skills creados; cero código de
  aplicación (según el alcance acordado). Tests aún no aplican: las tablas de casos
  de la spec 01 (§1 y §3.4) quedan listas para convertirse en
  `test_tiered_pricing.py` y `test_tax_id_validator.py` en la Fase 3 (TDD).

- **Siguiente sesión:** Fase 3, sesión 1 — scaffolding FastAPI + SQLAlchemy según
  `estructura-proyecto.md` y `03-modelo-de-datos.md`.
