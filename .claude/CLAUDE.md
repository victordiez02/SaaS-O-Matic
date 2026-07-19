# Directrices del proyecto SaaS-O-Matic

## Contexto

Herramienta interna de simulación de suscripciones SaaS. Backend FastAPI + SQLite,
frontend React (Vite, pnpm). Las specs viven en ai-workspace/01-specs/ y son la
fuente de verdad: si el código contradice una spec, gana la spec.

## Reglas de arquitectura (backend)

- Capas estrictas: routers (api/) → schemas Pydantic → services → models SQLAlchemy.
- La lógica de negocio (tramos, impuestos, validación fiscal) vive SOLO en
  services/ y validators/, nunca en los routers.
- Ningún fichero > 200 líneas: si crece, se divide.
- Toda función de negocio lleva test en tests/ antes de darse por terminada.
- Errores: formato JSON unificado {"detail": ..., "code": ...}; validación → 422.

## Reglas de arquitectura (frontend)

- Componentes pequeños y tipados; llamadas HTTP solo en src/api/; estado de
  red con estados explícitos loading/error/success.
- Los importes se almacenan y calculan en EUR; la conversión de divisa es
  solo de presentación.

## Reglas de calidad

- Nada de código muerto, TODOs sin ticket, ni dependencias innecesarias.
- Nombres en inglés en el código; documentación de negocio en español.

## Documentación obligatoria

- Al finalizar cada tarea, crear/actualizar el resumen de sesión en
  ai-workspace/03-sesiones-ia/ siguiendo la plantilla, incluyendo qué se
  generó, qué se corrigió y qué tests lo cubren.
