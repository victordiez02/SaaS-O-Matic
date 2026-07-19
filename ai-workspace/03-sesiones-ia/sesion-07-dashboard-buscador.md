# Sesión 07 — Dashboard: buscador y fichas de cliente

- **Fecha:** 2026-07-16
- **Objetivo:** construir la Vista 1 de la spec 04 (buscador con debounce + cards
  responsive con sus cuatro estados de red), montar el router con las rutas de la
  Fase 4 y darle identidad visual propia a la herramienta.

- **Specs de partida:**
  - [04-frontend-ux.md](../01-specs/04-frontend-ux.md) — Vista 1: debounce ~300 ms,
    estados inicial/loading/success/vacío/error, columna única < 640 px.
  - [02-contrato-api.md](../01-specs/02-contrato-api.md) — `GET /customers?search=`,
    sobre `{items, total}`, lista vacía nunca es 404.
  - [estructura-proyecto.md](../02-arquitectura/estructura-proyecto.md) — `pages/`,
    `components/`, `hooks/`, `utils/`; fetch solo en `src/api/`.

- **Dirección de diseño (aprobada antes de escribir código):** "papel de registro".
  La herramienta es un **índice de fichas fiscales**, no un panel de analítica, así
  que el vocabulario visual sale del registro mercantil: gris frío azulado
  (`#EDF0F4`), tinta marina (`#131C2E`), datos en slate (`#5A6A83`), filetes
  (`#D3DAE4`) y un único acento burdeos de sello (`#7A1F2B`) reservado a tres sitios:
  clave fiscal, anillo de foco y coincidencia de búsqueda. Tipografía: **Archivo**
  (display + cuerpo, grotesca institucional de impresión) e **IBM Plex Mono** (solo
  datos: identificadores fiscales y plan). Se descartó de partida el look por defecto
  (crema + terracota, o slate + azul 500, que era lo que había).

- **Qué se generó / modificó:**
  - **`pages/Dashboard.tsx`** (+ módulo CSS) — buscador, línea de estado viva, rejilla
    de fichas y los cuatro estados: skeleton, error con reintento, vacío por índice sin
    clientes y vacío por búsqueda sin resultados (mensajes distintos).
  - **`components/CustomerCard.tsx`** (+ módulo CSS) — ficha con clave fiscal, nombre,
    email y plan; navega a `/customers/:id`. Incluye los estilos del esqueleto.
  - **`components/CustomerCardSkeleton.tsx`** — hueco de ficha durante la carga.
  - **`components/SearchBar.tsx`** (+ módulo CSS) — campo de búsqueda con etiqueta,
    icono y anillo de foco en el contenedor.
  - **`components/Highlighted.tsx`** (+ módulo CSS) y **`utils/highlight.ts`** —
    resaltado del fragmento coincidente con `<mark>`.
  - **`hooks/useCustomerSearch.ts`** — debounce de 350 ms, estados
    `loading/error/success`, `retry()` y cancelación de respuestas obsoletas.
  - **`pages/NewCustomer.tsx`** (+ módulo CSS) — página fina que envuelve el
    `CustomerForm` existente, **sin tocar el formulario**.
  - **`pages/CustomerDetail.tsx`** (+ módulo CSS) — stub de la ruta para la sesión 8.
  - **`App.tsx`** — pasa a ser el shell (cabecera + `<Outlet/>`); su demo anterior
    (semáforo de salud y lista inline) queda sustituida por el Dashboard.
  - **`main.tsx`** — `BrowserRouter` y las rutas. **`index.css`** — tokens de diseño,
    foco visible global y `prefers-reduced-motion`. **`index.html`** — fuentes.
  - **Dependencia:** `react-router-dom` 7.18.1.

- **Decisiones de diseño de la sesión:**
  1. **La clave fiscal (`ES · B12345674`) encabeza la ficha como una unidad**, que es
     como se escribe un identificador en la UE. Absorbe el país, que deja de ser un
     campo huérfano. El nombre de empresa manda en la jerarquía: es por donde se busca.
  2. **Resaltado de la coincidencia**: el backend busca por nombre *y* por
     identificador, así que la ficha muestra *por qué* ha entrado en los resultados.
  3. **El resaltado NO pliega acentos aunque el backend sí lo haga** (ver
     `utils/highlight.ts`): replicar el plegado (NFD + descarte de combinantes)
     desplazaría los índices respecto al texto original y resaltaría el fragmento
     equivocado. Buscar "iberica" devuelve igual la ficha de "Acme Ibérica", solo que
     sin resaltar. Un resaltado de menos es un detalle; uno mal puesto, un error.
  4. **Debounce solo al teclear** (350 ms): la carga inicial y el borrado del campo van
     directos, porque ahí no hay nada que "acabar de escribir".
  5. **El mensaje técnico del error se muestra** ("Failed to fetch") junto al texto de
     usuario: es una herramienta interna y quien la usa puede levantar el backend.
  6. **La animación de entrada va en el `<li>` y el hover en la card**: con
     `animation-fill-mode: both` en el mismo elemento, el estado final de la animación
     congelaría el `transform` del hover.
  7. **Comodín de ruta → `/`**: nginx sirve `index.html` para cualquier ruta, así que
     una URL inventada llegaría al router; sin comodín sería una página en blanco.

- **Qué se corrigió/rechazó:** durante la verificación pareció haber un desbordamiento
  horizontal en móvil. Antes de "arreglarlo" se midió: Chrome headless en Windows tiene
  un ancho mínimo de ventana de **512 px** y estaba escalando la captura, recortándola.
  Medido con `getBoundingClientRect`, ningún elemento se sale del viewport. **No se tocó
  el CSS**: el bug era de la medición, no del código.

- **Verificación (Chrome headless, backend real):**
  - `tsc --noEmit` limpio y `pnpm build` OK (CSS 6.24 kB, JS 192.54 kB / 63.68 kB gzip).
  - Dashboard con datos a 1240 px (rejilla) y a 512 px (columna única): sin recortes.
  - Estado de error real, apuntando `VITE_API_URL` a un puerto muerto: aviso, detalle
    técnico y botón «Reintentar».
  - Estado vacío real, contra un backend de pega que devuelve `{"items": [], "total": 0}`:
    "El índice está vacío" + CTA a `/customers/new`.
  - `utils/highlight.ts` ejecutado con `node --experimental-strip-types` sobre 7 casos:
    minúsculas/mayúsculas, CIF parcial, término vacío, sin coincidencia y el caso con
    acento (degrada a "sin resaltado", como está documentado).

- **Tests que lo cubren:** ninguno automatizado todavía. `splitMatch` es la primera
  función pura del frontend y merece test; no hay runner instalado (Vitest llegaría con
  los tests de `utils/pricing.ts` de la sesión 9, donde `CLAUDE.md` sí lo exige). Queda
  anotado: al montar Vitest, migrar los 7 casos ya ejecutados a mano.

- **Pendiente / notas:**
  - **El `CustomerForm` mantiene sus estilos oscuros** (`#0f172a`, botón `#3b82f6`)
    sobre el papel claro: funciona, pero desentona. Se movió tal cual por decisión
    explícita; su adaptación al sistema de diseño está pendiente de valoración.
  - `api/health.ts` se queda sin consumidor: el shell ya no hace el chequeo de salud
    (el estado de error del Dashboard cubre "backend caído"). Decidir si se elimina.
  - El término de búsqueda no viaja en la URL: no hay búsquedas enlazables ni
    navegación atrás dentro del buscador. Fuera de la spec; anotado por si interesa.
  - Los anchos por debajo de 512 px no son verificables con Chrome headless sin un
    driver de emulación de dispositivo; la columna única está confirmada a 512 px.

- **Siguiente sesión:** sesión 8 — Vista 2 (detalle del cliente): card, historial de
  simulaciones y selector de divisa con `useExchangeRates`.
