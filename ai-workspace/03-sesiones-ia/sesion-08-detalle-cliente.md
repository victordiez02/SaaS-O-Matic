# Sesión 08 — Detalle del cliente: ficha e historial de simulaciones

- **Fecha:** 2026-07-16
- **Objetivo:** construir la Vista 2 de la spec 04 (ficha completa del cliente +
  historial de simulaciones guardadas) sobre la ruta `/customers/:id` que la sesión 7
  dejó como stub, con sus estados de red y sin duplicar estilos ya existentes.

- **Specs de partida:**
  - [04-frontend-ux.md](../01-specs/04-frontend-ux.md) — Vista 2: dos peticiones con
    estados independientes, card responsive, historial de más reciente a más antigua,
    404 con mensaje propio, historial vacío con CTA.
  - [02-contrato-api.md](../01-specs/02-contrato-api.md) — `GET /customers/{id}` y
    `GET /customers/{id}/simulations`, sobre `{items, total}`, importes como string
    decimal, `created_at` con microsegundos, `code: CUSTOMER_NOT_FOUND`.

- **Qué se generó:**
  - **`pages/CustomerDetail.tsx`** (90) — la vista: ficha, historial y los estados
    `loading` / 404 / error de red / éxito.
  - **`components/CustomerDetailCard.tsx`** — ficha completa: clave fiscal, nombre,
    email, plan y fecha de alta.
  - **`components/SimulationHistory.tsx`** (158) — tabla del historial (fecha,
    usuarios, base, impuesto con su tasa, total), su skeleton, su estado de error
    propio y el estado vacío con CTA.
  - **`hooks/useResource.ts`** — carga de un recurso con `loading/error/success`,
    `retry()` y cancelación de la respuesta obsoleta. Usado dos veces en la vista.
  - **`utils/format.ts`** — `formatMoney`, `formatRate` y `formatDateTime` con `Intl`.
  - **`pages/NewSimulation.tsx`** — stub de `/customers/:id/simulate` para la sesión 9.

- **Qué se extrajo (no duplicar estilos):**
  - **`components/StatePanel.tsx`** — la caja centrada de filete discontinuo. El
    Dashboard ya repetía sus clases **dos veces** (error y vacío) y el detalle
    necesitaba **tres más**; ahora son cinco usos de un componente. El Dashboard se
    refactorizó para consumirlo: mismo render, catorce líneas menos.
  - **`components/FiscalKey.tsx`** — la clave fiscal `ES · B12345674`, que estaba
    copiada entre `CustomerCard` y el stub del detalle. `term` opcional: el índice
    resalta la coincidencia, el detalle no la necesita.
  - **`components/PlanTag.tsx`** — el plan en mono y versales. **Sin variante de color
    por plan a propósito:** el plan no afecta al precio (spec 02) y darle jerarquía
    cromática sugeriría lo contrario.
  - Las clases de posición (márgenes, filetes, `text-ellipsis`) las pasa quien usa el
    componente vía `className` + `cn()`: lo compartido es el vocabulario visual, no el
    hueco que ocupa en cada vista.

- **Decisiones de diseño de la sesión:**
  1. **El id se valida antes de montar la vista.** `/customers/abc` no gasta una
     petición ni enseña un 422 de Pydantic: para quien navega, un id que no es número
     es exactamente lo mismo que una ficha que no existe. La página es un envoltorio
     que valida y delega, porque los hooks no admiten un `return` antes.
  2. **404 y error de red son estados distintos**, como pide la spec: "Cliente no
     encontrado" (con vuelta al índice) se distingue leyendo `ApiError.code ===
     "CUSTOMER_NOT_FOUND"`, no el status suelto. Un fallo genérico para las dos cosas
     haría creer que la herramienta está rota cuando solo sobra un dígito en la URL.
  3. **El historial solo se pinta con la ficha ya cargada.** Las dos peticiones son
     independientes y salen a la vez (la ficha no espera al historial), pero si el
     cliente no existe su historial devuelve el mismo 404 y enseñar dos avisos del
     mismo problema sería ruido.
  4. **El orden no se reimplementa en cliente.** El backend ya devuelve de más reciente
     a más antigua y está verificado; reordenar aquí solo abriría la puerta a que las
     dos versiones discrepen. Verificado en pantalla: 120 → 15 → 5.
  5. **La tasa (`21 %`) acompaña al impuesto** en la fila: es la tasa **congelada** en
     la simulación, no la de hoy (spec 02), y verla explica el importe sin abrir nada.
  6. **`useResource` exige un `load` estable** (una función exportada de `src/api/`, no
     una lambda del render). Así el efecto depende del argumento, no de que quien llama
     acierte a memorizar la función, y se evita el patrón de la ref mutada en render.
  7. **País e identificador NO se repiten** como campos sueltos bajo la ficha: ya los
     lleva la clave fiscal de arriba. Se detectó viendo la captura, no leyendo el
     código: la primera versión los pintaba dos veces.

- **Verificación (Chrome headless, backend real, BD de usar y tirar):**
  - `tsc --noEmit` limpio; `pnpm build` OK (CSS 39.25 kB, JS 320.85 kB / 104.40 kB gzip).
  - **Ficha con historial** (`/customers/1`, Acme Ibérica ES + 3 simulaciones): importes
    correctos contra la spec (15 usuarios → 140,00 € + 29,40 € = **169,40 €**), orden
    correcto, fechas y euros formateados en `es-ES`.
  - **Historial vacío** (`/customers/2`, Globex sin simulaciones): "Aún no hay
    simulaciones para este cliente" + CTA que ahora **sí** tiene destino.
  - **404** (`/customers/999`): "Cliente no encontrado", no un error genérico.
  - **Error de red** (`VITE_API_URL` a un puerto muerto): aviso + "Failed to fetch" +
    «Reintentar».
  - **Móvil (512 px):** ficha en columna única; la tabla scrollea dentro de su caja.
  - Todos los ficheros < 200 líneas (el mayor, `SimulationHistory.tsx`, 158).

- **Qué se corrigió durante la verificación:**
  - **Los datos se pintaban dos veces** (país e identificador, ver decisión 7).
  - **La verificación empezó mintiendo:** el primer `uvicorn` no llegó a arrancar
    (puerto 8000 ocupado por otro backend ya en marcha) y los `curl` de siembra fueron
    a parar a **la BD de desarrollo**, no a la de pruebas. Se detectó porque la "BD
    recién creada" devolvía un cliente `sss` de las 16:06 y un IVA del 0 % donde debía
    haber 21 %. Se repitió todo en el puerto 8137 **comprobando el log de arranque
    antes de creer ninguna respuesta**. Efecto colateral pendiente de limpiar: ver
    abajo.

- **Tests que lo cubren:** ninguno automatizado (sigue sin haber runner en el frontend;
  Vitest llega en la sesión 9 con `utils/pricing.ts`, donde `CLAUDE.md` sí lo exige).
  Al montarlo, `utils/format.ts` es candidato inmediato: es función pura y ya tiene
  casos verificados a mano (169,40 €, 21 %, fecha con microsegundos).

- **Pendiente / notas:**
  - ~~**El selector de divisa NO está en esta vista.**~~ **Resuelto** en la
    [sesión 08b](sesion-08b-selector-divisa.md): se cerró como pieza propia (contexto
    compartido + selector en la cabecera), y el historial de esta vista quedó conectado
    a él.
  - **En móvil el TOTAL queda fuera hasta que se desliza** la tabla. Asumido: cinco
    columnas de cifras comprimidas a 360 px se vuelven ilegibles, y el scroll dentro de
    la caja es el comportamiento estándar para datos tabulares. Si molesta, la
    alternativa es una lista apilada solo bajo 640 px, a costa de dos renders del mismo
    dato.
  - El skeleton de carga de la ficha reutiliza `CustomerCardSkeleton` (el del índice):
    la silueta no coincide del todo con la card del detalle, que es más alta.

- **Siguiente sesión:** sesión 9 — Vista 3: formulario de simulación con slider,
  preview en vivo (`utils/pricing.ts` + Vitest) y `POST /simulations`.
