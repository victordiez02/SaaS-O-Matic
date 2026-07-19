# 04 — Frontend: vistas, estados y divisa

Frontend React (Vite, pnpm). Reglas transversales (de `CLAUDE.md`): componentes
pequeños y tipados, llamadas HTTP solo en `src/api/`, y todo estado de red modelado
explícitamente como `loading / error / success`.

> **Extra no pedido por el enunciado — modo claro/oscuro.** Toggle de tema global
> (`hooks/useTheme.ts`), persistido en `localStorage` y sin parpadeo inicial (script en
> `index.html`). Es comodidad de uso para el equipo comercial, no una vista obligatoria;
> no afecta a ninguna regla de negocio.

## Principio rector: EUR como moneda canónica

**Todos los importes se almacenan y calculan en EUR.** El backend nunca sabe de otras
divisas. El selector de divisa del frontend es **pura presentación**: convierte los
importes EUR recibidos (o calculados en el preview) justo antes de pintarlos.

> **Decisión de diseño.** Alternativa descartada: pedir al backend los importes ya
> convertidos. Eso acoplaría el backend a una API externa, rompería la auditabilidad
> del desglose persistido y haría el historial dependiente del tipo de cambio del día.
> Con conversión solo en presentación, cambiar de divisa es instantáneo (una
> multiplicación en cliente) y el dato persistido es estable. Ver ADR-004 para la caché.

## Selector de divisa (global, visible en las 3 vistas)

- Divisas ofrecidas: **EUR, USD, GBP** (ampliable: cualquier divisa presente en la
  respuesta de er-api).
- Fuente de tipos de cambio: `GET https://open.er-api.com/v6/latest/EUR`, **un solo
  fetch por sesión**, cacheado en memoria (hook `useExchangeRates`; justificación en
  ADR-004).
- Formateo con `Intl.NumberFormat(locale, { style: "currency", currency })`.
- **Fallback:** si er-api falla o tarda > 5 s → se muestran los importes en EUR, un
  aviso no bloqueante ("Tipos de cambio no disponibles, mostrando EUR") y un botón
  «Reintentar». La app nunca se bloquea por la API externa.

Estados del selector:

| Estado | Comportamiento |
|---|---|
| `loading` | Selector deshabilitado con indicador; importes en EUR |
| `success` | Selector activo; conversión instantánea al cambiar |
| `error` | Selector bloqueado en EUR + aviso + botón reintentar |

---

## Vista 1 — Dashboard con buscador

**Ruta:** `/`. Buscador por nombre de empresa o identificador fiscal + resultados.

- Input con **debounce de 300 ms** → `GET /api/v1/customers?search=...`.
- Cada resultado navega al detalle del cliente.

| Estado | Cuándo | UI |
|---|---|---|
| Inicial/vacío | Sin búsqueda aún | Mensaje invitando a buscar + listado completo de clientes |
| `loading` | Petición en vuelo | Skeleton de resultados (no spinner bloqueante) |
| `success` con resultados | Lista no vacía | Cards/filas clicables |
| `success` sin resultados | Lista vacía | "Sin resultados para «{texto}»" + acción de crear cliente |
| `error` | Fallo de red/5xx | Mensaje de error + botón reintentar |

---

## Vista 2 — Detalle del cliente (cards + historial)

**Ruta:** `/customers/:id`. Dos peticiones: detalle (`GET /customers/{id}`) e
historial (`GET /customers/{id}/simulations`), con estados independientes.

- **Card de cliente** (responsive): nombre, identificador fiscal, email, país, plan.
- **Historial de simulaciones**: lista ordenada de más reciente a más antigua; cada
  entrada muestra fecha, usuarios, y el desglose base / impuesto / total **convertido
  a la divisa seleccionada** (con la tasa persistida, sin recalcular).
- Acceso directo al formulario de nueva simulación para ese cliente.

| Estado | Cuándo | UI |
|---|---|---|
| `loading` | Cargando cliente | Skeleton de card |
| `error` 404 | Cliente inexistente | "Cliente no encontrado" + volver al dashboard |
| `error` red | Fallo de red/5xx | Mensaje + reintentar |
| Historial vacío | Cliente sin simulaciones | "Aún no hay simulaciones" + CTA a crear la primera |
| `success` | Todo cargado | Card + historial |

Responsive: cards en columna única en móvil (< 640 px), grid en escritorio.

---

## Vista 3 — Formulario de simulación interactiva

**Ruta:** `/customers/:id/simulate`. Slider de usuarios + campos de almacenamiento y
llamadas API, con **proyección de factura en tiempo real**.

- **Slider de usuarios** (0–200, paso 1) con input numérico sincronizado para valores
  exactos o > 200.
- Campos numéricos para `storage_gb` y `api_calls` (≥ 0; sin efecto en el precio en el
  alcance actual — la UI lo indica con un texto sutil "sin coste en el plan actual").
- **Preview en vivo:** al mover el slider se recalcula el desglose (base por tramos +
  IVA del país del cliente) **en el cliente**, sin llamar al backend, y se muestra
  convertido a la divisa seleccionada.
- Botón «Guardar simulación» → `POST /api/v1/simulations`. **Lo persistido es siempre
  el cálculo del backend** (fuente de verdad); la respuesta reemplaza el preview.

> **Decisión de diseño — duplicación controlada de la lógica de tramos.** Desarrollada
> en [ADR-006](../02-arquitectura/decisiones/ADR-006-preview-cliente-vs-backend.md). El
> preview replica el algoritmo de tramos e IVA en el cliente (`src/utils/pricing.ts`)
> para que el slider sea fluido (recalcular a 60 fps contra la API sería absurdo). Riesgo:
> divergencia entre ambas implementaciones. Mitigación: (1) ambas derivan de la misma
> spec ([01-reglas-de-negocio.md](01-reglas-de-negocio.md)) y de la skill
> `tiered-pricing`, que fija fórmula y ejemplos; (2) los 4 ejemplos verificados (5, 15,
> 50, 120 usuarios) se testean en ambos lados; (3) el valor persistido es siempre el del
> backend.

| Estado | Cuándo | UI |
|---|---|---|
| `loading` inicial | Cargando datos del cliente | Skeleton del formulario |
| Edición | Usuario mueve controles | Preview recalculado en vivo, sin red |
| `loading` al guardar | POST en vuelo | Botón deshabilitado con indicador |
| `success` al guardar | 201 | Confirmación + desglose del backend + enlace al historial |
| `error` 422 | Datos inválidos | Mensaje del error unificado junto al campo |
| `error` red | Fallo de red/5xx | Mensaje + reintentar sin perder lo introducido |
