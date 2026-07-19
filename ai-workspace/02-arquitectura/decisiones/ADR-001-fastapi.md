# ADR-001 — FastAPI como framework del backend

**Estado:** aceptada · **Fecha:** 2026-07-14

## Contexto

El enunciado deja la tecnología del backend a libre elección, "preferiblemente Node.js
(TypeScript) o Python". Necesitamos un framework que facilite: validación estricta de
entrada (la validación fiscal es un requisito central), documentación de la API sin
esfuerzo extra, y una estructura en capas testeable. Candidatos considerados: FastAPI,
Flask y Express/NestJS.

## Decisión

**Python + FastAPI.**

- **Pydantic integrado**: los schemas de request/response del contrato de API se
  declaran una vez y validan automáticamente, devolviendo 422 — encaja exactamente con
  el formato de error unificado que exigen las specs.
- **OpenAPI/Swagger gratis** en `/docs`: el contrato de la spec 02 queda autoverificable
  y es un plus directo en el criterio "README y Despliegue".
- **`decimal.Decimal` nativo** en Python: la regla "dinero con Decimal, nunca float"
  es idiomática; en Node habría que traer una librería externa (big.js/decimal.js).
- **Inyección de dependencias** (`Depends`) para la sesión de BD: mantiene los routers
  finos y hace triviales los tests con BD en memoria.
- Frente a Flask: Flask exigiría añadir y pegar a mano validación (marshmallow),
  documentación y tipado — más piezas, mismo resultado.

## Consecuencias

- (+) Menos código de infraestructura; la IA genera menos "pegamento" y la revisión se
  concentra en la lógica de negocio.
- (+) Tests de API sencillos con `TestClient` (httpx) sin servidor real.
- (−) El equipo debe conocer Pydantic v2 (sintaxis distinta a v1; se fija la versión
  en `pyproject.toml`).
- (−) Async opcional puede tentar a complejidad innecesaria: para SQLite se decide
  usar el stack síncrono, suficiente para una herramienta interna.
