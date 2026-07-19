# ADR-006 — Preview en cliente vs. cálculo del backend

- **Fecha:** 2026-07-16
- **Estado:** aceptado
- **Contexto de creación:** la sesión 9 introduce `frontend/src/utils/pricing.ts`, que
  reimplementa en TypeScript la fórmula que ya vive en
  `backend/app/services/pricing.py`. Hasta ahora la duplicación era una intención
  documentada en la spec 04; desde hoy es código real y merece su ADR.

## Contexto

La vista 3 (spec 04) pide una **proyección de factura en tiempo real**: al mover el
slider de usuarios, el desglose (base por tramos + IVA del país) se actualiza mientras
se arrastra. El coste depende solo del número de usuarios (spec 01 §1) y del país del
cliente (§2).

Hay dos formas de conseguir ese número:

1. **Pedirlo al backend** en cada movimiento del slider.
2. **Calcularlo en el cliente** replicando la fórmula.

## Decisión

**Las dos, con papeles distintos y jerarquía explícita:**

- El **preview** se calcula en el cliente (`utils/pricing.ts`), sin red.
- Lo que se **guarda y se muestra como definitivo** es siempre lo que devuelve
  `POST /api/v1/simulations`. La respuesta del backend **sustituye** al preview en
  cuanto llega.

## Por qué no pedirle cada cifra al backend

Un slider genera decenas de valores por segundo mientras se arrastra. Consultar la API
en cada uno significaría o bien una petición por fotograma (absurdo: red y CPU de
servidor para aritmética de tres multiplicaciones), o bien un debounce que haría que la
cifra **fuera por detrás del dedo** — que es justo lo que la vista intenta evitar. El
valor de la pantalla está en que la factura responde *mientras* se decide, no medio
segundo después de soltar. Además, encadenar el preview a la red lo haría fallar cuando
el backend esté lento o caído, cuando en realidad no hay ninguna razón para no poder
enseñar una estimación.

## Por qué el backend sigue siendo la fuente de verdad

El cliente es un entorno que no controlamos: JavaScript con coma flotante, versión
cacheada del bundle, o directamente manipulado desde la consola. Un importe que se
persiste y sobre el que alguien decide un presupuesto **no puede depender de eso**.

Por eso:

- El cliente HTTP **nunca envía importes** (spec 02): manda contadores de consumo y el
  backend calcula. No hay forma de que el preview contamine lo guardado, ni siquiera
  por error de programación: el campo sencillamente no existe en el request.
- El desglose se persiste completo y con la tasa congelada (`tax_rate`), auditable.
- En la UI, el preview se etiqueta **"Proyección mensual"** y lo guardado
  **"Simulación guardada"**: la diferencia entre estimación y dato no es un matiz de
  implementación, se lee en pantalla.

## Consecuencia asumida: la fórmula vive en dos sitios

Si cambian los tramos (10/8/5 €) o la tabla de IVA, **hay que tocar los dos lados**:

| Qué | Backend | Frontend |
|---|---|---|
| Tramos y tabla de IVA | `app/core/billing.py` | `src/utils/pricing.ts` |
| Cálculo | `app/services/pricing.py` | `src/utils/pricing.ts` |
| Tests | `tests/test_tiered_pricing.py` | `src/utils/pricing.test.ts` |

**Este es el coste que se acepta a cambio de la fluidez.** El riesgo real no es olvidar
un sitio y que el preview cambie: es olvidarlo y que el preview **siga funcionando**
mostrando el precio viejo, sin romperse, hasta que un comercial promete una cifra que la
factura no confirma.

### Mitigaciones

1. **Una sola fuente de verdad legible.** Ambas implementaciones derivan de
   `01-reglas-de-negocio.md` §1–2 y de la skill `tiered-pricing`, que fija fórmula,
   tabla y ejemplos. Ninguna de las dos "inventa" el algoritmo: lo aplican.
2. **La misma batería de ejemplos verificados en los dos lados** (5 → 50 €, 15 → 140 €,
   50 → 420 €, 120 → 770 €, y 15/ES → 169,40 €). Un cambio de fórmula que se aplique en
   un solo sitio hace fallar los tests del otro. Es la red que convierte la divergencia
   en un fallo ruidoso en vez de silencioso.
3. **El daño está acotado por diseño:** aunque las dos implementaciones divergieran, lo
   que se persiste es correcto siempre. Una divergencia sería un defecto de UI (una
   cifra provisional engañosa), nunca un dato económico corrupto en la base.
4. **Si divergen en pantalla, manda el backend y se dice sin alarma.** Al guardar, el
   panel pasa a la cifra del backend y, si no coincidía con la proyección, aparece una
   línea discreta ("Importe ajustado al cálculo del backend"). No es un error del
   usuario y no merece un modal: merece corregirse en silencio y dejar rastro.

## Alternativas descartadas

- **Endpoint de "cálculo sin guardar"** (`POST /simulations/preview`): elimina la
  duplicación pero no el problema — el slider seguiría atado a la latencia, que es lo
  que había que evitar. Añade superficie de API para un cálculo que el cliente puede
  hacer en microsegundos.
- **Exponer los tramos y la tabla de IVA por API** y que el cliente los aplique: mueve
  la duplicación de los *datos* al *algoritmo* (los tramos son acumulativos: el cliente
  seguiría reimplementando el recorrido de tramos), y suma una petición al arranque
  para algo que cambia una vez al año.
- **Compartir código entre Python y TypeScript** (WASM, generación de código, un motor
  en JS para ambos): sobre-ingeniería absoluta para tres multiplicaciones y una tabla
  de cinco filas.

## Referencias

- `ai-workspace/01-specs/01-reglas-de-negocio.md` §1–2 — la fórmula y la tabla.
- `ai-workspace/01-specs/04-frontend-ux.md` — vista 3 y la decisión de UX que lo motiva.
- `.claude/skills/tiered-pricing/SKILL.md` — fórmula y ejemplos aplicados en ambos lados.
