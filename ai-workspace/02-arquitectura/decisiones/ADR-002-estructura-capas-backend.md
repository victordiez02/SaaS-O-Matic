# ADR-002 — Estructura en capas del backend (router → schema → service → model)

**Estado:** aceptada · **Fecha:** 2026-07-14

## Contexto

El código generado con IA tiende a dos patologías: controladores que acumulan lógica de
negocio y ficheros monolíticos difíciles de auditar. El reto evalúa explícitamente
(criterio "Definición de la Arquitectura") cómo se evita "código desorganizado o
archivos masivos". Además, la lógica crítica (tramos, validación fiscal) debe poder
testearse de forma aislada, sin HTTP ni base de datos.

## Decisión

Cuatro capas estrictas con dependencias en un solo sentido:

```
api/ (routers) → schemas/ (Pydantic) → services/ + validators/ → models/ (SQLAlchemy)
```

- Los routers solo orquestan; **cero lógica de negocio** en `api/`.
- Tramos, IVA y validación fiscal viven **exclusivamente** en `services/` y
  `validators/`, como funciones puras siempre que sea posible.
- Los modelos SQLAlchemy nunca se exponen directamente: los schemas Pydantic son el
  único contrato con el exterior.
- Regla complementaria: **ningún fichero > 200 líneas** (en `CLAUDE.md`, que la IA lee
  en cada sesión, convirtiendo la directriz en restricción permanente y no en un deseo).

## Consecuencias

- (+) La lógica de negocio se testea con unit tests puros y rápidos; los ejemplos
  numéricos de la spec 01 se traducen 1:1 a asserts.
- (+) Cualquier sesión de IA sabe dónde colocar código nuevo: la estructura es el
  mapa; la revisión humana localiza los errores por capa.
- (+) Cambiar la capa HTTP o la BD no toca la lógica (bajo acoplamiento real, no
  teórico).
- (−) Más ficheros y algo de ceremonia para un CRUD pequeño — coste asumido: el reto
  puntúa mantenibilidad y criterio, no minimalismo.
- (−) Riesgo de "capa anémica" si un service solo delega; se mitiga permitiendo que
  los casos triviales (GET por id) vivan como consultas simples sin service artificial.
