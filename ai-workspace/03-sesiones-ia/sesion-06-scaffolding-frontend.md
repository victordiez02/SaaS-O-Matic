# Sesión 06 — Scaffolding del frontend: cliente API y hook de divisas

- **Fecha:** 2026-07-16
- **Objetivo:** montar el esqueleto del frontend de la Fase 4: estructura de carpetas
  de la spec de arquitectura, cliente API tipado contra el contrato **real** del
  backend, y el hook `useExchangeRates`. **Sin vistas de negocio** (dashboard, cards,
  formulario de simulación): eso son las sesiones 7–9.

- **Specs de partida:**
  - [estructura-proyecto.md](../02-arquitectura/estructura-proyecto.md) — carpetas
    `api/`, `components/`, `hooks/`, `pages/`, `utils/`; fetch **solo** en `src/api/`.
  - [04-frontend-ux.md](../01-specs/04-frontend-ux.md) — EUR como moneda canónica,
    conversión solo de presentación, un único fetch a er-api por sesión, fallback a EUR.
  - [02-contrato-api.md](../01-specs/02-contrato-api.md) — los 5 endpoints, sobres
    `{items, total}`, importes como *string* decimal, error unificado `{detail, code}`.

- **Contrato de partida (verificado, no asumido):** antes de escribir los tipos se
  sondearon los endpoints reales con `TestClient` sobre BD en memoria. Frente al
  Prompt 0, el backend ya incorpora las dos correcciones: la búsqueda ignora acentos
  (`?search=iberica` encuentra "Acme Ibérica") y los 422 de Pydantic traen
  `errors: [{field, message}]` junto a `{detail, code}`. Los tipos de `src/api/types.ts`
  reflejan el JSON observado, incluidos los `created_at` con microsegundos.

- **Qué se generó / modificó:**
  - **`.env.example`** (en `frontend/`, que es donde Vite carga los `.env`): documenta
    `VITE_API_URL`, su valor por defecto relativo y el aviso de que Vite la sustituye
    en tiempo de *build*, no de arranque.
  - **`src/api/types.ts`** — tipos del contrato: `Customer`, `CustomerCreate`, `Plan`,
    `Simulation`, `SimulationCreate` y el sobre genérico `ListResponse<T>`. Los importes
    se tipan como `string` (decimal serializado), no como `number`.
  - **`src/api/client.ts`** — reescrito como núcleo: `BASE_URL`
    (`import.meta.env.VITE_API_URL || '/api'`), `API_V1`, helpers `get`/`post` y la clase
    `ApiError` con `code`, `status` y `errors: FieldError[]`.
  - **`src/api/customers.ts`** — `createCustomer`, `searchCustomers(search?)`,
    `getCustomer(id)`, `listCustomerSimulations(id)`.
  - **`src/api/simulations.ts`** — `createSimulation`.
  - **`src/api/health.ts`** — `fetchHealth` (liveness, fuera de `/api/v1`).
  - **`src/api/exchangeRates.ts`** — `fetchExchangeRates()` contra er-api.
  - **`src/hooks/useExchangeRates.ts`** — caché de módulo + deduplicación de peticiones
    en vuelo; expone `{ rates, loading, error, convert }`.
  - **`src/pages/`, `src/utils/`** — creadas con `.gitkeep`; se llenarán en las sesiones
    de vistas (`Dashboard`, `CustomerDetail`, `SimulationPage`, `pricing.ts`).
  - **`App.tsx` / `CustomerForm.tsx`** — solo actualizados los imports al nuevo reparto
    de módulos (`listCustomers()` → `searchCustomers().items`) y corregido un comentario
    obsoleto que decía que aún no había validación fiscal en el backend.

- **Decisiones de diseño de la sesión:**
  1. **No se ejecutó `pnpm create vite`.** El andamiaje ya existía de la Sesión 5 (React
     18 + TS + pnpm, con el alta de clientes funcionando); `create vite` sobre un
     directorio no vacío habría pisado `package.json`, `App.tsx` y `main.tsx`. Se extendió
     lo existente.
  2. **TypeScript**, no JS plano: `CLAUDE.md` exige componentes tipados, y el contrato
     tiene trampas que solo los tipos atajan (importes que son `string` y no `number`,
     `plan` como unión cerrada, sobres `{items, total}`).
  3. **`client.ts` = núcleo, un módulo por recurso.** Evita el fichero cajón de sastre y
     respeta el límite de 200 líneas antes de que llegue el resto de endpoints.
  4. **URL base relativa por defecto (`/api`)**, no `http://localhost:8000`: la resuelve
     el proxy de Vite en desarrollo y nginx en Docker, así que localhost no aparece en
     el código de aplicación y la misma imagen sirve en los dos entornos. Se usa `||` en
     vez de `??` para que un `VITE_API_URL=""` también caiga al valor por defecto.
  5. **Caché de módulo (no `useState`) para los tipos de cambio:** el requisito es un
     fetch por *sesión*, no por componente. Un estado local volvería a pedirlos en cada
     montaje. `inFlight` deduplica además el doble montaje de `StrictMode`.
  6. **Rutas sin barra final** en el cliente: `/api/v1/customers/` devuelve un 307
     (comprobado en el Prompt 0).

- **Qué se corrigió/rechazó:** se rechazó parametrizar el `proxy` de `vite.config.ts` con
  `BACKEND_ORIGIN` (propuesto en el Prompt 0): `tsconfig.json` incluye `vite.config.ts` y
  leer `process.env` habría obligado a añadir `@types/node` solo para el destino de un
  proxy de desarrollo. `localhost:8000` sigue ahí, en config de desarrollo, no en código
  de aplicación; `VITE_API_URL` cubre el caso de apuntar a otro backend.

- **Verificación:**
  - `pnpm exec tsc --noEmit` → sin errores.
  - Backend (`uvicorn`, puerto 8000) + `pnpm dev` levantados juntos: a través del proxy
    de Vite, `GET /api/health` → `{"status":"ok","service":"backend"}` y
    `GET /api/v1/customers` → el sobre `{items, total}` con los 2 clientes de la BD de
    desarrollo. Cableado de la URL base confirmado de punta a punta.
  - Respuesta real de er-api contrastada con lo que parsea el hook: `result: "success"`,
    `base_code: "EUR"`, 166 divisas (USD 1.14492, GBP 0.848693, EUR 1).

- **Tests que lo cubren:** ninguno todavía, por diseño — no hay lógica de negocio en esta
  sesión (el cliente API es I/O y el hook, estado de red). El primer test del frontend
  nace con `src/utils/pricing.ts` (preview de tramos), donde `CLAUDE.md` sí obliga: los
  ejemplos 5/15/50/120 usuarios de la spec 01, los mismos que verifican el backend.

- **Pendiente / notas:**
  - `useExchangeRates` no tiene consumidor hasta que exista el selector de divisa; el
    aviso no bloqueante, el botón «Reintentar» y el timeout de 5 s son de la sesión 10.
  - No hay router instalado todavía: las rutas `/`, `/customers/:id` y
    `/customers/:id/simulate` de la spec 04 exigirán `react-router-dom` en la sesión 7.
  - El preview en cliente tendrá que duplicar la tabla de IVA de `core/billing.py`
    (la API no expone las tasas), además de los tramos ya previstos en la spec 04.

- **Siguiente sesión:** sesión 7 — Vista 1 (dashboard con buscador y debounce de 300 ms),
  con el router y los estados `loading/error/success` de la spec 04.
