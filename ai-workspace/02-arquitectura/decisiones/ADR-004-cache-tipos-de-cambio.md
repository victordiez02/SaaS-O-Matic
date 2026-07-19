# ADR-004 — Caché de tipos de cambio en el frontend

**Estado:** aceptada · **Fecha:** 2026-07-14

## Contexto

El frontend debe convertir importes a la divisa elegida usando una API pública
(`https://open.er-api.com/v6/latest/EUR`). Dos hechos condicionan el diseño: (1) er-api
**actualiza sus tasas una vez al día** — pedirlas más a menudo no aporta datos nuevos;
(2) el plan gratuito tiene límite de peticiones y una latencia no controlada por
nosotros. Además, el selector de divisa debe sentirse instantáneo y la app no puede
romperse si la API externa cae (criterio de evaluación: manejo de estados de
carga/error con la API externa).

## Decisión

**Un único fetch por sesión, cacheado en memoria, con fallback a EUR.**

- Hook `useExchangeRates`: hace el fetch al montar la aplicación, guarda el mapa de
  tasas en memoria (contexto de React) y expone `convert(amountEUR, currency)` y el
  estado `loading | error | success`.
- Cambiar de divisa **no dispara red**: es una multiplicación sobre importes EUR ya
  presentes (los importes canónicos siempre están en EUR, ver spec 04).
- Fallback: si el fetch falla o supera 5 s → la app muestra EUR, un aviso no
  bloqueante y un botón «Reintentar» que reejecuta el fetch.
- Descartado: cachear en `localStorage` con TTL de 24 h. Válido, pero añade
  invalidación y estado persistente para ahorrar una petición diaria por usuario —
  complejidad no justificada en una herramienta interna.
- Descartado: proxy de tipos de cambio en el backend. Acoplaría el backend a un
  servicio externo y contradice la regla "el backend solo conoce EUR".

## Consecuencias

- (+) Una petición externa por sesión: fricción y consumo de cuota mínimos.
- (+) Conversión instantánea (sin spinner al cambiar divisa) y app utilizable aunque
  er-api esté caída.
- (−) Una sesión muy larga podría usar tasas de hasta ~24 h de antigüedad — aceptable:
  son simulaciones comerciales orientativas, y el importe contractual persistido está
  en EUR.
- (−) Estado compartido vía contexto de React: el hook debe instanciarse una sola vez
  (en el provider raíz) — se documenta en el propio hook.

## Adenda (2026-07-19) — el estado de reintento necesita su propio hueco

Al robustecer el manejo de errores (sesión 10) apareció un matiz que esta ADR no
cubría: **"cargando" no es un único estado**. Hay dos situaciones distintas que
`loading: boolean` no distinguía:

1. El **primer** intento de la sesión (nunca ha fallado): el selector se deshabilita
   con un indicador discreto, sin ningún aviso — es la espera normal de arranque.
2. Un **reintento** tras un fallo: si se trata igual que el caso 1, el aviso de error
   desaparece de golpe mientras dura el reintento y solo vuelve a aparecer si falla
   otra vez. Para quien lo ve, el aviso "parpadea" sin explicación.

**Decisión:** `useExchangeRates` expone un `status` de cuatro valores
(`loading | retrying | error | success`) en vez de un booleano `loading` +
`error: string | null`. `retrying` mantiene el aviso visible con un indicador de carga
propio ("Reintentando…") en el mismo hueco, en vez de ceder el sitio al indicador
genérico de "cargando" del selector.

**Detalle de implementación que merece quedar anotado:** la forma obvia de derivar
`retrying` — un `useEffect([error, loading])` que recuerda si hubo un fallo previo —
tiene una condición de carrera real. `retry()` limpia `error` de forma síncrona al
pulsar el botón, pero `loading` no pasa a `true` hasta que el efecto de recarga corre
tras el siguiente repintado (los `useEffect` de React son asíncronos respecto al
commit). Eso abre un fotograma con `error = null` y `loading = false` a la vez, que
un efecto derivado interpreta como "éxito" y resetea el aviso antes de que el
reintento siquiera empiece. La corrección: el fallo previo se registra en un `ref`
mutado directamente dentro del `.then()/.catch()` del propio fetch — el mismo
callback que ya actualiza `error` y `rates` — en vez de inferirse observando esos dos
valores desde fuera. Cubierto por test (`CurrencySelector.test.tsx`): el primer
intento de esta ADR sin el `ref` fallaba justo ese caso.

- (+) El fallback (EUR + aviso + reintento) ya funcionaba desde el diseño original;
  esta adenda solo afina la transición *durante* el reintento, no cambia la decisión.
