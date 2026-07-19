# Plan Maestro — Reto SaaS-O-Matic

**Stack elegido (100% compatible con las reglas del reto):**

- Backend: **Python + FastAPI** ✅ (el enunciado dice "libre elección, preferiblemente Node.js o Python" → Python es opción preferida)
- Base de datos: **SQLite** ✅ (obligatoria según el enunciado)
- Frontend: **React (Vite) + pnpm** ✅ (libre elección)
- Orquestación: **Docker Compose** ✅ (no lo piden, pero suma muchos puntos en el criterio "README y Despliegue")

---

## 0. Idea clave: el reto NO evalúa solo el código

Lee bien los porcentajes: **Planificación (35%) + Criterio técnico (25%) = 60%** de la nota está en el proceso, no en el resultado. Por eso este plan invierte el orden habitual: primero escribes las especificaciones (specs), luego la arquitectura, y solo después le pides código a la IA. Todo lo que escribas ANTES de programar va directo a `/ai-workspace` y es lo que más puntúa.

---

## 1. Estructura final del repositorio

```
saas-o-matic/
├── README.md                  ← instrucciones de arranque (10% de la nota)
├── docker-compose.yml
├── CLAUDE.md                  ← directrices para la IA (¡esto ES un entregable de arquitectura!)
├── ai-workspace/              ← el 60% de tu nota vive aquí
│   ├── 01-specs/
│   │   ├── 00-vision-general.md
│   │   ├── 01-reglas-de-negocio.md      (tramos, impuestos, validación fiscal)
│   │   ├── 02-contrato-api.md           (endpoints, request/response, errores)
│   │   ├── 03-modelo-de-datos.md        (tablas, relaciones, restricciones)
│   │   └── 04-frontend-ux.md            (vistas, estados de carga/error)
│   ├── 02-arquitectura/
│   │   ├── decisiones/                  (ADRs: un fichero por decisión)
│   │   │   ├── ADR-001-fastapi-vs-flask.md
│   │   │   ├── ADR-002-estructura-capas-backend.md
│   │   │   ├── ADR-003-sqlite-y-sqlalchemy.md
│   │   │   └── ADR-004-cache-tipos-de-cambio.md
│   │   └── estructura-proyecto.md
│   ├── 03-sesiones-ia/
│   │   ├── sesion-01-backend-validaciones.md
│   │   ├── sesion-02-motor-tarificacion.md
│   │   ├── ...                          (exports/notas de cada sesión con la IA)
│   │   └── correcciones-y-auditoria.md  (código que rechazaste y por qué ⭐)
│   └── 04-prompts-clave/
│       └── prompts-reutilizables.md
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml (o requirements.txt)
│   ├── app/
│   │   ├── main.py
│   │   ├── api/            (routers: customers.py, simulations.py)
│   │   ├── core/           (config, constantes de tramos/impuestos)
│   │   ├── models/         (SQLAlchemy)
│   │   ├── schemas/        (Pydantic)
│   │   ├── services/       (pricing.py, tax.py)
│   │   ├── validators/     (spanish_tax_id.py)
│   │   └── db/             (session, init)
│   └── tests/
│       ├── test_tax_id_validator.py
│       ├── test_tiered_pricing.py
│       └── test_api.py
└── frontend/
    ├── Dockerfile
    ├── package.json (pnpm)
    └── src/
        ├── api/            (cliente HTTP hacia backend + er-api)
        ├── components/     (CustomerCard, SimulationForm, SearchBar…)
        ├── hooks/          (useExchangeRates, useSimulation…)
        ├── pages/          (Dashboard, CustomerDetail)
        └── utils/          (formatCurrency, pricing preview)
```

---

## 2. Fases del proyecto (en orden estricto)

### FASE 0 — Preparación (30-60 min)

1. Crea el repo en GitHub, `git init`, primer commit con la estructura de carpetas vacía y este plan dentro de `ai-workspace/`.
2. Crea el fichero `CLAUDE.md` en la raíz (plantilla en la sección 4). Es la pieza que demuestra "cómo configuraste tu entorno para que la IA genere código limpio".
3. Decide tu herramienta: lo ideal es **Claude Code** (la empresa dice que internamente usan Claude), porque lee `CLAUDE.md` automáticamente y permite exportar sesiones. Si trabajas desde el chat de claude.ai también vale: copia/pega los hilos a `03-sesiones-ia/`.

### FASE 1 — Specs (Spec-Driven Development) — ~medio día ⭐ 35% de la nota

Escribe TÚ (con ayuda de la IA si quieres, pero revisándolo) estos documentos antes de una sola línea de código:

**`01-reglas-de-negocio.md`** debe contener:

- El algoritmo de tramos con tabla y 3-4 ejemplos calculados a mano (5 usuarios, 15, 50, 120). Esto luego se convierte en tests.
- Tabla de IVA por país (define tú el alcance, p. ej.: España 21%, Francia 20%, Alemania 19%, Portugal 23%, Italia 22%, resto 0% o genérico). Documenta la decisión: "alcance limitado a UE, extensible vía tabla en BD/config".
- Especificación de la validación fiscal española (algoritmos abajo, sección 5 — inclúyelos en la spec).

**`02-contrato-api.md`** debe contener:

- `POST /customers` y `POST /simulations` con JSON de ejemplo de request y response, códigos de estado (201, 400, 404, 422) y formato de error unificado.
- Endpoints extra que necesitará el frontend aunque el enunciado no los liste explícitamente (¡detectar esto demuestra criterio!): `GET /customers?search=...` (buscador), `GET /customers/{id}` (detalle), `GET /customers/{id}/simulations` (historial). Justifícalo en la spec.

**`03-modelo-de-datos.md`**:

- Tabla `customers` (id, company_name, tax_id UNIQUE, email, country, plan, created_at).
- Tabla `simulations` (id, customer_id FK, active_users, storage_gb, api_calls, base_cost, tax_rate, tax_amount, total_cost, currency='EUR', created_at). Persiste el desglose del cálculo, no solo el total: es una decisión de auditoría que puedes defender en un ADR.

**`04-frontend-ux.md`**:

- Las 3 vistas obligatorias, qué estados maneja cada una (loading / error / vacío / éxito), y cómo funciona el selector de divisa (los importes se guardan en EUR y solo se CONVIERTEN en visualización — decisión importante, documéntala).

### FASE 2 — Arquitectura — ~2-3 horas ⭐

1. Escribe `estructura-proyecto.md` explicando la separación de capas del backend (router → schema → service → model) y por qué evita "archivos masivos".
2. Escribe 3-4 ADRs cortos (media página cada uno): por qué FastAPI, por qué SQLAlchemy + SQLite, por qué cachear los tipos de cambio en el frontend (er-api se actualiza 1 vez/día → basta con 1 fetch por sesión), por qué pnpm/Vite.
3. Termina el `CLAUDE.md` con las reglas de código.

### FASE 3 — Backend con IA — ~1 día

Orden recomendado de sesiones (una sesión = un fichero en `03-sesiones-ia/`):

1. **Sesión 1:** scaffolding de FastAPI + SQLAlchemy + configuración según `estructura-proyecto.md`. Prompt: pega la spec del modelo de datos.
2. **Sesión 2:** validador `spanish_tax_id.py` (DNI/NIE/CIF) **con sus tests primero** (TDD: pide los tests a partir de tu spec, revísalos, y luego la implementación).
3. **Sesión 3:** servicio de tarificación por tramos + impuestos, también con tests basados en tus ejemplos calculados a mano.
4. **Sesión 4:** endpoints (customers, simulations, búsqueda) conectando todo.
5. **Sesión 5 (auditoría):** pide a la IA que revise su propio código contra tu `CLAUDE.md` y detecta tú al menos 2-3 mejoras (manejo de errores, inyección de dependencias, índices en BD…). **Documenta lo que rechazaste o corregiste**: esto es exactamente el 25% de "Criterio Técnico".

### FASE 4 — Frontend con IA — ~1 día

1. **Sesión 6:** scaffolding Vite + React + pnpm, cliente API, hook `useExchangeRates` con estados loading/error y caché en memoria.
2. **Sesión 7:** Dashboard con buscador (debounce) + cards responsive de cliente.
3. **Sesión 8:** vista detalle con historial de simulaciones.
4. **Sesión 9:** formulario de simulación con slider y cálculo en tiempo real. Ojo a un detalle de calidad: el cálculo en vivo del slider puede hacerse en el cliente (duplicando la lógica de tramos en `utils/`) para fluidez, y al guardar se persiste el cálculo del backend, que es la fuente de verdad. Documenta esta decisión.
5. **Sesión 10:** manejo de errores de la API externa (si er-api falla → mostrar EUR con aviso, botón reintentar).

### FASE 5 — Docker Compose — ~2-3 horas

- `backend/Dockerfile`: imagen `python:3.12-slim`, instala deps, `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- `frontend/Dockerfile`: multi-stage → `node:20-alpine` con `corepack enable && pnpm install && pnpm build`, y una etapa final `nginx:alpine` sirviendo el build (con proxy_pass a `/api` hacia el backend para evitar CORS, o bien habilita CORS en FastAPI y usa `VITE_API_URL`).
- `docker-compose.yml`: servicio `backend` (volumen para el fichero SQLite: `./data:/app/data`), servicio `frontend` (puerto 80 o 5173), `depends_on`.
- Objetivo del README: **`docker compose up` y funciona**. También documenta el arranque manual sin Docker (uvicorn + pnpm dev) por si el evaluador no tiene Docker.

### FASE 6 — QA final — ~2-3 horas

- Ejecuta los tests (`pytest`) y pega el resultado en el README o en una sesión.
- Prueba manual completa: alta de cliente con NIF inválido (debe dar 422 con mensaje claro), NIF válido, simulación con 15 usuarios (debe dar 140 € + IVA), cambio de divisa, búsqueda.
- Revisa que no haya secretos hardcodeados, que exista `.gitignore` (BD, node_modules, **pycache**).

### FASE 7 — README y entrega — ~1-2 horas

El README debe tener: descripción en 3 líneas, stack, **arranque en 1 comando con Docker Compose**, arranque manual alternativo, URL del frontend y de `/docs` (Swagger automático de FastAPI — menciónalo, queda muy bien), cómo ejecutar los tests, enlace destacado a `/ai-workspace` con un índice de su contenido, y decisiones/límites conocidos.

---

## 3. Cómo hacer que la IA lo deje TODO documentado

Tres mecanismos complementarios (usa los tres):

**A) `CLAUDE.md` como contrato permanente.** Si usas Claude Code, lee este fichero automáticamente en cada sesión, así no tienes que repetir las reglas. Añade en él una instrucción explícita de documentación (ver plantilla abajo): al terminar cada tarea, la IA debe escribir/actualizar un resumen de sesión en `ai-workspace/03-sesiones-ia/`. Es decir: la propia IA mantiene su bitácora.

**B) Exporta las conversaciones reales.** En Claude Code puedes exportar la conversación de la sesión (comando `/export`) y guardar el resultado en `03-sesiones-ia/`; si trabajas en claude.ai, copia el hilo o haz capturas de los prompts clave. Consulta la documentación oficial para tu versión: https://docs.claude.com/en/docs/claude-code/overview

**C) Git como evidencia.** Haz commits pequeños y frecuentes con mensajes tipo `feat(pricing): motor de tramos según spec 01-reglas-de-negocio.md`. El historial de commits referenciando specs demuestra el flujo spec → código mejor que cualquier explicación.

**Plantilla de resumen de sesión** (`03-sesiones-ia/sesion-XX-tema.md`):

```markdown
# Sesión XX — <tema>

- **Objetivo:** …
- **Specs de partida:** enlaces a ai-workspace/01-specs/…
- **Prompts clave usados:** …
- **Qué generó la IA:** …
- **Qué corregí/rechacé y por qué:** … ← la parte más valiosa
- **Resultado:** commits asociados, tests que pasan
```

---

## 5. Chuleta técnica de los puntos difíciles

### 5.1 Validación fiscal española (métela íntegra en la spec `01-reglas-de-negocio.md`)

**DNI (personas físicas):** 8 dígitos + letra de control. La letra se obtiene con `número % 23` como índice en la cadena `TRWAGMYFPDXBNJZSQVHLCKE`. Ejemplo: 12345678 % 23 = 14 → letra `Z` → `12345678Z` es válido.

**NIE (extranjeros):** empieza por X, Y o Z + 7 dígitos + letra. Se sustituye X→0, Y→1, Z→2 y se aplica el mismo algoritmo del DNI. Ejemplo: `X1234567L`.

**CIF (empresas):** letra inicial (A, B, C, D, E, F, G, H, J, N, P, Q, R, S, U, V, W) + 7 dígitos + carácter de control.

1. Suma los dígitos en posiciones pares (2ª, 4ª, 6ª de los 7 dígitos).
2. Para cada dígito en posición impar (1ª, 3ª, 5ª, 7ª): multiplícalo por 2 y suma los dígitos del resultado (p. ej. 8×2=16 → 1+6=7).
3. Suma ambos totales; el dígito de control es `(10 − (suma % 10)) % 10`.
4. Si la letra inicial es P, Q, R, S, W (o N) el control es una LETRA: índice en `JABCDEFGHI`. Si es A, B, E, H el control es un DÍGITO. Para el resto se aceptan ambos.

Casos de test que debes incluir: DNI válido/inválido, DNI con letra en minúscula (normalizar), NIE de cada prefijo, CIF de letra que exige dígito, CIF de letra que exige letra, cadenas con guiones/espacios (normalizar), longitud incorrecta. **Regla del enunciado:** la validación estricta solo es obligatoria si `country == "ES"`; para otros países basta un formato mínimo (documenta esta decisión).

### 5.2 Motor de tramos (acumulativo, no por escalón)

```
coste(u) = 10€ × min(u, 10)
         + 8€  × min(max(u − 10, 0), 40)
         + 5€  × max(u − 50, 0)
```

Verificaciones de la spec: u=5 → 50 €; u=15 → 140 € (coincide con el ejemplo del enunciado); u=50 → 100+320 = 420 €; u=120 → 100+320+350 = 770 €. Después: `total = base × (1 + iva_pais)`. Implementa con `Decimal`, no con float, y redondeo a 2 decimales — mencionarlo en la spec/ADR es un punto extra de criterio técnico.

Nota: el enunciado pide guardar almacenamiento y llamadas API en la simulación pero solo define precio por usuarios. Decide y documenta: se persisten como datos de la simulación sin coste asociado (alcance actual), dejando el motor de precios extensible. Detectar y cerrar esta ambigüedad por escrito en la spec es oro para el 35% de planificación.

### 5.3 Tipos de cambio (frontend)

`GET https://open.er-api.com/v6/latest/EUR` → `{ "result": "success", "rates": { "USD": 1.08, "GBP": 0.85, ... } }`. Haz un hook `useExchangeRates` que: haga fetch una vez al montar, cachee en memoria, exponga `convert(amountEUR, currency)`, y maneje error con fallback a EUR + aviso visual. Formatea con `Intl.NumberFormat(locale, { style: 'currency', currency })`.

---

## 6. Checklist final contra los criterios de evaluación

**Planificación 35%:** ☐ 5 specs completas antes del código ☐ ambigüedades detectadas y resueltas por escrito (endpoints GET, storage/API calls sin precio, tabla de IVA) ☐ ejemplos numéricos en la spec convertidos en tests.

**Criterio técnico 25%:** ☐ CLAUDE.md con reglas de arquitectura ☐ ADRs ☐ documento de auditoría con al menos 3 correcciones al código de la IA ☐ Decimal en dinero ☐ TDD en validador y pricing.

**Calidad del software 30%:** ☐ validación DNI/NIE/CIF con suite de tests ☐ tramos correctos (140 € para 15 usuarios) ☐ persistencia con desglose ☐ frontend responsive ☐ estados loading/error en API externa ☐ buscador funcional.

**README y despliegue 10%:** ☐ `docker compose up` funciona a la primera ☐ alternativa sin Docker ☐ Swagger en `/docs` mencionado ☐ índice de ai-workspace enlazado.

**Estimación total: 3-4 días de trabajo.** Reparto sugerido: día 1 = fases 0-2 (specs y arquitectura), día 2 = backend, día 3 = frontend, día 4 = Docker, QA y README.
