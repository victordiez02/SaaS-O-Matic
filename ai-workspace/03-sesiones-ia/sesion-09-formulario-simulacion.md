# Sesión 09 — Formulario de simulación con proyección en vivo

- **Fecha:** 2026-07-16
- **Objetivo:** Vista 3 de la spec 04: slider de usuarios con proyección de factura en
  tiempo real calculada en el cliente, guardado contra `POST /simulations` y el
  resultado del backend como cifra definitiva.

- **Specs de partida:**
  - [01-reglas-de-negocio.md](../01-specs/01-reglas-de-negocio.md) §1–2 y la skill
    `tiered-pricing` — fórmula acumulativa, tabla de IVA y los 4 ejemplos obligatorios.
  - [04-frontend-ux.md](../01-specs/04-frontend-ux.md) — vista 3: slider 0–200 con input
    sincronizado, preview sin red, estados de guardado.
  - [02-contrato-api.md](../01-specs/02-contrato-api.md) — el cliente HTTP nunca envía
    importes; 422 con `errors` por campo.

- **Qué se generó:**
  - **`utils/pricing.ts`** — `estimateCost` / `calculateBaseCost` / `getTaxRate`.
    Función pura, sin React ni red.
  - **`utils/pricing.test.ts`** — 20 tests con los mismos ejemplos que fijan el backend.
  - **`components/SimulationForm.tsx`** — slider + input sincronizado, almacenamiento y
    llamadas API, preview en vivo, guardado y sus estados.
  - **`components/CostBreakdown.tsx`** — el desglose. **Un solo componente para el
    preview y para lo guardado**: si la proyección y el dato definitivo se pintaran con
    dos componentes distintos, acabarían divergiendo en formato y el usuario leería la
    diferencia como si fuera del cálculo.
  - **`components/ui/slider.tsx`** — añadido con la CLI de shadcn (`radix-nova`), para
    que herede el estilo del resto de `ui/` en vez de inventarlo.
  - **`ADR-006`** — la duplicación de la fórmula (ver abajo).
  - **Dependencia:** `vitest` 4.1.10 (dev) + script `pnpm test`. Es el runner que la
    sesión 7 dejó anotado para cuando `CLAUDE.md` lo exigiera; `utils/pricing.ts` es
    lógica de negocio, así que ya lo exige.

- **Qué se modificó:**
  - **`pages/NewSimulation.tsx`** — deja de ser el stub de la sesión 8: carga el cliente
    (el preview necesita su país para el IVA) y monta el formulario.
  - **`utils/format.ts`** — `formatRate` acepta también `number` (la tasa del preview no
    viene como string del backend).
  - **`01-specs/04-frontend-ux.md`** — su decisión sobre la duplicación ahora enlaza al
    ADR-006, que la desarrolla.

- **Decisiones de diseño de la sesión:**
  1. **El preview trabaja en enteros y redondea al final.** En IEEE 754,
    `140 × 0.21 = 29.400000000000002`; el preview no puede enseñar un céntimo que el
    backend no va a cobrar. Hay un test dedicado a ese caso exacto.
  2. **Tocar cualquier control invalida el resultado guardado.** Al mover el slider
     después de guardar, el panel vuelve a "Proyección mensual": una cifra etiquetada
     como guardada que ya no corresponde a lo que hay en pantalla sería mentira.
  3. **La etiqueta del panel es la que distingue estimación de dato**
     ("Proyección mensual" vs "Simulación guardada"), no un color ni un icono: la
     diferencia entre lo que *podría* costar y lo que *se guardó* se lee, no se intuye.
  4. **Si backend y preview no coinciden, gana el backend y se dice en voz baja**
     ("Importe ajustado al cálculo del backend", texto pequeño y apagado). No es culpa
     de quien usa la herramienta y no merece un modal (encargo explícito, y coherente
     con el ADR-006).
  5. **Los 422 se pintan junto a su campo** aprovechando el array `errors` que se añadió
     al backend en F14. Es la primera vista que cobra ese arreglo: `active_users`,
     `storage_gb` y `api_calls` casan por `field` con el `name` de su input, sin parsear
     texto.
  6. **El error de guardado dice que no se ha perdido nada** ("los datos siguen aquí"):
     la spec pide reintentar sin perder lo introducido, y el formulario no se limpia.
  7. **El slider llega a 200 y el input acepta más** (spec 04): el slider es para
     explorar, el campo para valores exactos o grandes.

- **Verificación (Chrome conducido por CDP, backend real):**
  - `pnpm test` → **20 passed**. `tsc --noEmit` limpio.
  - **Preview inicial** (15 usuarios, cliente ES): `140,00 € / 29,40 € / 169,40 €` — el
    ejemplo canónico de la spec, leído del DOM.
  - **Slider en vivo** (15 → 20 con 5 pulsaciones reales de flecha): `180,00 € / 37,80 €
    / 217,80 €`, y **0 peticiones a la API durante el movimiento** — contadas
    instrumentando `Network.requestWillBeSent`, que era la razón de ser de todo esto.
  - **Guardado**: un único `POST /v1/simulations`; el panel pasa a "Simulación guardada"
    con las cifras del backend; sin aviso de ajuste (coincidían exactamente).
  - **El historial recoge la fila**: `20 usuarios -> 217.80` como la más reciente.
  - El selector de divisa de la sesión 08b actúa sobre el preview y sobre lo guardado
    sin trabajo extra: el desglose usa `formatAmount` del contexto.

- **Pendiente / notas:**
  - **Vitest entra solo con los tests de `pricing.ts`.** `utils/highlight.ts` (sesión 7)
    y `utils/format.ts` siguen sin tests y ya son candidatos inmediatos: ahora hay
    runner y sus casos están verificados a mano.
  - `storage_gb` y `api_calls` no afectan al coste (decisión ya documentada en la spec
    01); la UI lo dice con un texto sutil bajo los campos.

---

## Corrección posterior (2026-07-19) — hueco de integración y aviso de divergencia

Tres arreglos surgidos al revisar el recorrido real de la vista, antes de cerrar la Fase 4.

- **C1 — No había forma de simular sin escribir la URL a mano (el fallo grave).** El
  formulario existía y funcionaba, pero **el único enlace a él vivía dentro del estado
  vacío del historial** (`SimulationHistory`). Consecuencia: la *primera* simulación de un
  cliente era alcanzable, pero **en cuanto tenía una, el camino desaparecía** y la segunda
  exigía teclear `/customers/:id/simulate`. `CustomerDetail` no tenía ningún botón. Es el
  recorrido que prueba cualquiera que use la app, así que sin esto la vista 3 estaba de
  hecho desconectada de la 2.
  - **Arreglo:** botón **"Nueva simulación"** en la cabecera del historial
    (`SimulationHistory`), visible en todos los estados **salvo** el vacío —que ya trae su
    propio CTA "Crear la primera simulación"—, para no poner dos botones idénticos a un
    palmo. Navegación a la ruta con el `customerId` (no modal): encaja con lo que ya
    existía (`/customers/:id/simulate` ya montada) y hace la simulación enlazable.
  - **Retorno tras guardar:** el botón pasó de "Ver historial" (secundario) a **"Ver en el
    historial"** como acción principal. No hay salto automático a propósito: al guardar, el
    desglose del backend sustituye a la proyección y hay que poder leerlo (spec 04). Al
    volver, `CustomerDetail` se monta de nuevo y su `useResource` recarga el historial
    solo — la simulación nueva ya está, **sin recarga manual del navegador**.
  - **Se documenta como corrección, no como sesión nueva**, porque tapa un agujero que la
    sesión 8+9 dejó entre las dos vistas.

- **C2 — El aviso de divergencia, ahora probado por ejecución.** Lo que en la sesión quedó
  "probado por revisión, no por ejecución" ya tiene test: `SimulationForm.test.tsx`
  (jsdom + Testing Library) mockea `createSimulation` para devolver un total distinto al
  proyectado (backend 175,00 € vs cliente 169,40 €) y comprueba que aparece "Importe
  ajustado al cálculo del backend", que se ve la cifra del backend y no la del cliente, y
  que al retocar el slider vuelve la proyección y el aviso desaparece. 4 casos.
  - **Infraestructura añadida:** `jsdom`, `@testing-library/react`, `@testing-library/dom`
    (dev). El slider de Radix exige `ResizeObserver`, que jsdom no trae: se stubea en el
    propio test.

- **C3 — Datos de prueba borrados.** Se vació la BD de desarrollo (`customers` y
  `simulations` a 0, tablas intactas), incluidos los clientes de prueba de sesiones
  anteriores. Queda limpia para probar el flujo desde la UI.

- **Verificación del recorrido completo (Chrome por CDP, BD scratch limpia, sin ensuciar
  la de desarrollo):** Dashboard vacío ("El índice está vacío") → alta de "Nébula Systems
  S.L." (`POST /customers`) → búsqueda **"nebula"** sin acento encuentra la ficha (F13) →
  detalle con historial vacío → "Crear la primera simulación" → 25 usuarios, preview
  **266,20 €** (220 base + 46,20 IVA al 21 %) → guardar (`POST /simulations`, panel →
  "Simulación guardada") → "Ver en el historial" → la fila aparece (25 usuarios, 266,20 €)
  **sin recarga manual**. Todo verde.

- **Suites tras la corrección:** `pytest` **91 passed**; `vitest` **24 passed** (20 de
  `pricing` + 4 de `SimulationForm`); `tsc --noEmit` limpio.

- **Siguiente sesión:** repaso final de la Fase 4 — tests pendientes del frontend
  (`highlight.ts`, `format.ts`), adaptación del `CustomerForm` al sistema de diseño
  (pendiente de la sesión 7) y verificación del conjunto en Docker.
