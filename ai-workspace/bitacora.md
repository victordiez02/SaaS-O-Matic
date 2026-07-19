# Bitácora del proyecto

Diario breve del reto SaaS-O-Matic, escrito sobre la marcha.

## El plan

Sigo el plan maestro que dejé en [plan-saas-o-matic.md](../plan-saas-o-matic.md):
8 fases, empezando por lo que más puntúa — escribir las especificaciones y la
arquitectura **antes** de pedirle una sola línea de código a la IA. Primero el qué,
luego el cómo, y al final el código.

## El stack

Backend en Python con FastAPI, base de datos SQLite (obligatoria en el enunciado) con
SQLAlchemy, y frontend en React con Vite y pnpm. Todo orquestado con Docker Compose
para que arrancar el proyecto sea un solo comando.

## La arquitectura

Backend en capas estrictas (router → schema → service → model) para que la lógica de
negocio viva en un único sitio testeable y ningún fichero se convierta en un monstruo.
El detalle completo y el porqué están en
[02-arquitectura/estructura-proyecto.md](02-arquitectura/estructura-proyecto.md) y en
los ADRs de [02-arquitectura/decisiones/](02-arquitectura/decisiones/) (6 en total al
cierre del proyecto; ver nota más abajo).

## Qué llevamos hecho

> **Nota:** esta bitácora se escribió sobre la marcha y se detuvo tras la Fase 2. El
> resto del proceso (backend, frontend, Docker, auditoría) queda documentado en
> [03-sesiones-ia/](03-sesiones-ia/) sesión por sesión y en
> [correcciones-y-auditoria.md](03-sesiones-ia/correcciones-y-auditoria.md); no se ha
> vuelto a extender esta entrada para no duplicar esa fuente.

**14 de julio de 2026.** Fases 1 y 2 completadas, todavía sin código:

- Las **5 specs** en [01-specs/](01-specs/): visión general, reglas de negocio
  (tramos, IVA y validación fiscal con ejemplos calculados a mano), contrato de la
  API, modelo de datos y UX del frontend. Por el camino cerré por escrito las
  ambigüedades del enunciado: los endpoints GET que faltaban, el almacenamiento y las
  llamadas API sin precio, y el alcance de la tabla de IVA.
- Las **dos skills de negocio** en `.claude/skills/`: `spanish-tax-id-validator`
  (DNI/NIE/CIF) y `tiered-pricing` (tramos + IVA). La idea: esa lógica se aplica en
  el backend y también en el preview en vivo del frontend, así que la fijo en una
  skill para que la IA la aplique siempre igual, con la spec como fuente de verdad.
- La **arquitectura documentada**: estructura de carpetas y los primeros 4 ADRs
  (FastAPI, capas del backend, SQLite+SQLAlchemy, y caché de tipos de cambio en el
  frontend). Dos ADRs más (gestión del esquema, preview cliente vs. backend) se
  añadieron durante las fases de backend y frontend.

Siguiente paso: Fase 3, el backend — scaffolding de FastAPI y, con TDD, el validador
fiscal y el motor de tramos a partir de las tablas de casos de las specs.
