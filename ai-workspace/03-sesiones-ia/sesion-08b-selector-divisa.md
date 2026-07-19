# Sesión 08b — Selector de divisa: estado compartido entre vistas

- **Fecha:** 2026-07-16
- **Objetivo:** cerrar el selector de divisa como pieza propia antes de la sesión 9.
  Es **estado compartido entre vistas**, no una feature de una pantalla: si lo montara
  cada vista, habría un fetch de tipos por página y la divisa se perdería al navegar.
- **Origen:** el pendiente que dejó la [sesión 08](sesion-08-detalle-cliente.md)
  ("decidir si el selector entra en la 9 o en una sesión propia").

- **Specs de partida:**
  - [04-frontend-ux.md](../01-specs/04-frontend-ux.md) — EUR canónico, conversión solo
    de presentación, EUR/USD/GBP, **un solo fetch por sesión**, `Intl.NumberFormat`,
    fallback a EUR con aviso y reintento si er-api falla o tarda > 5 s.

- **Qué se generó:**
  - **`context/CurrencyContext.tsx`** — el fichero a revisar. Contiene `CURRENCIES`,
    el tipo `Currency`, el `CurrencyProvider` y el hook `useCurrency()`.
  - **`components/CurrencySelector.tsx`** — el desplegable EUR/USD/GBP y sus tres
    estados (cargando / activo / bloqueado con aviso y reintento).

- **Qué se modificó:**
  - **`App.tsx`** — `<CurrencyProvider>` envuelve el shell entero y el selector vive en
    la cabecera, junto al toggle de tema: un solo sitio, visible en las tres vistas.
  - **`components/SimulationHistory.tsx`** — base, impuesto y total salen de
    `formatAmount()` del contexto en vez de `formatMoney(..., simulation.currency)`.
  - **`hooks/useExchangeRates.ts`** — **añadido `retry()`**: la spec pedía botón de
    reintento y la caché de módulo lo hacía imposible (con los tipos cacheados a
    `null` y sin forma de relanzar, el estado de error era terminal).
  - **`api/exchangeRates.ts`** — **añadido el corte a 5 s** (`AbortSignal.timeout`) que
    la spec exige y no existía: sin él, un er-api lento dejaba el selector deshabilitado
    para siempre en vez de caer al fallback.
  - **`utils/format.ts`** — `formatMoney` acepta `number` además del string del backend,
    porque el importe convertido ya no es el string original.

- **Decisiones de diseño de la sesión:**
  1. **La divisa efectiva la decide el contexto, no el componente.** Si los tipos no
     están (cargando o caídos), `currency` vale EUR aunque el usuario hubiera elegido
     otra cosa. Así ningún componente puede pintar cifras sin convertir bajo un símbolo
     de dólar: el fallback es invariante del proveedor, no disciplina de quien consume.
  2. **El contexto expone `convert(amountEUR, currency)` y además `formatAmount(eur)`.**
     Lo primero es la primitiva (la pedirá el preview de la sesión 9 con su propia
     divisa); lo segundo evita que cada celda repita `formatMoney(convert(...))` y se
     equivoque de divisa. El historial usa solo `formatAmount`.
  3. **`useExchangeRates` se instancia SOLO en el proveedor.** La caché de módulo ya
     garantizaba un fetch por sesión, pero un hook por página seguiría siendo N
     suscripciones a un estado que es único. Ahora hay un dueño.
  4. **La tasa (21 %) no se convierte:** es un porcentaje, no un importe. Parece obvio
     hasta que alguien mapea "todo lo numérico" por el conversor.
  5. **El aviso de error es el propio botón de reintento**, no un texto suelto más un
     botón: en una cabecera, cada elemento extra compite con el CTA principal. El
     mensaje técnico (`Failed to fetch`) va en el `title`, disponible sin ocupar sitio.
  6. **La divisa no se persiste** (ni URL ni localStorage): recargar vuelve a EUR. Fuera
     de la spec; anotado por si interesa.

- **Verificación (Chrome conducido por CDP, backend y er-api reales):**
  - No había runner ni Puppeteer instalado, así que se condujo Chrome por el protocolo
    de DevTools con el `WebSocket` nativo de Node 24 (`scratchpad/drive.mjs`): clic real
    en el selector, no simulación de estado.
  - **Cambio de divisa en vivo** sobre `/customers/1`, fila de 15 usuarios:
    - EUR → `140,00 €` / `29,40 €` / **`169,40 €`** (el ejemplo canónico de la spec).
    - USD → `160,29 US$` / `33,66 US$` / **`193,95 US$`**.
    - Contrastado con la tasa real de er-api (1 EUR = 1,14492 USD): 169,40 × 1,14492 =
      **193,95** ✓. Base + impuesto = total en las dos divisas ✓. La tasa sigue en 21 % ✓.
    - Sin recargar y sin tocar la red: el cambio solo vuelve a formatear lo ya cargado.
  - **Fallback real** (`Network.setBlockedURLs` sobre `*open.er-api.com*`, es decir,
    er-api caída de verdad, no un mock): selector **deshabilitado y bloqueado en EUR**,
    aviso "Reintentar tipos" con el detalle en el `title` ("...mostrando EUR (Failed to
    fetch)") e importes intactos en `169,40 €`. La app no se bloquea.
  - `tsc --noEmit` limpio y `pnpm build` OK (JS 324.10 kB / 105.48 kB gzip).

- **Tests que lo cubren:** ninguno automatizado (sigue sin runner; Vitest llega en la
  sesión 9). La conversión quedó verificada contra la tasa real y a mano.

- **Pendiente / notas:**
  - **El Dashboard no se conectó al contexto porque no pinta ni un importe:** sus cards
    muestran clave fiscal, nombre, email y plan. No hay nada que convertir ahí; el
    selector se ve igualmente (está en la cabecera) pero no altera esa vista.
  - El estado `loading` del selector (spinner) no se capturó: con er-api respondiendo en
    ~2 s y la caché de módulo, la ventana es demasiado corta para una captura fiable.
    Su código es el mismo camino que el estado de error ya verificado.
  - La divisa vuelve a EUR al recargar (decisión 6).

- **Siguiente sesión:** sesión 9 — Vista 3: formulario de simulación con slider, preview
  en vivo (`utils/pricing.ts` + Vitest) y `POST /simulations`, **consumiendo este
  contexto** en vez de crear su propio estado de divisa.
