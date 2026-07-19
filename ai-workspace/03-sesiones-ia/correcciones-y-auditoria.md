# Auditoría de calidad del backend y correcciones

- **Fecha:** 2026-07-15 (primera ronda) · 2026-07-16 (segunda ronda)
- **Sesión:** 5 (última del backend, Fase 3 del plan maestro). La segunda ronda surge
  al preparar la Fase 4 y se añade aquí para no partir la auditoría en dos documentos.
- **Alcance:** revisión de todo el backend generado (scaffolding, validador fiscal,
  motor de tarificación y endpoints) contra `.claude/CLAUDE.md` y las specs.

Este documento recoge **mis decisiones** como responsable técnico: qué se auditó, qué
decidí corregir y por qué, y qué decidí **no** tocar y por qué. Es la evidencia de mi
criterio, no una lista de sugerencias de la IA. La IA produjo el informe de hallazgos;
la priorización y el corte de alcance son míos.

---

## Correcciones aplicadas

### F1 — Rutas y métodos no manejados rompían el formato de error unificado

**Hallazgo:** `GET` a una ruta inexistente devolvía `{"detail":"Not Found"}` y un método
no permitido `{"detail":"Method Not Allowed"}`, ambos **sin `code`**.

**Mi razonamiento:** esto no admite discusión. El formato `{"detail":..., "code":...}`
es una **regla explícita de CLAUDE.md** ("Errores: formato JSON unificado"), no una
preferencia. Que la mayoría de errores lo cumplan no vale: un cliente del API no puede
tener que distinguir "errores con `code`" de "errores sin `code`" según quién los
lanzó. Un contrato con excepciones no es un contrato.

**Cambio:** handler de `StarletteHTTPException` en `main.py` que reenvuelve a
`{detail, code}` con `code = HTTP_<status>`.
**Cubre:** `test_customers_api.py::test_unknown_route_uses_unified_error_format` y
`::test_method_not_allowed_uses_unified_error_format`.

### F2 — Los 500 no controlados tampoco seguían el formato ni se registraban

**Hallazgo:** cualquier excepción inesperada salía con el 500 por defecto (sin `code`)
y sin traza.

**Mi razonamiento:** mismo principio que F1 y por la misma razón: es la regla de
CLAUDE.md, no es opinable. Además, sin log un 500 en la demo sería una caja negra. Es
barato cerrarlo y va en el mismo bloque que F1.

**Cambio:** handler genérico de `Exception` → 500 `{"detail":..., "code":"INTERNAL_ERROR"}`
con `logging.exception`.
**Nota:** no lo cubro con un test unitario (habría que inyectar un fallo artificial en
la app); lo doy por verificado por revisión. Es la única corrección sin test dedicado.

### F3 — `country` aceptaba cualquier par de caracteres — **el hallazgo más grave**

**Hallazgo:** un alta con `"country":"12"` devolvía **201 Created**. El schema solo
exigía longitud 2.

**Mi razonamiento:** este es, con diferencia, **el hallazgo más importante de toda la
auditoría**, y quiero dejar claro por qué no es "un detalle más de validación laxa". Un
país inválido no se queda en un dato feo: cae en la tasa de IVA **0 % por defecto**
(regla de negocio de la spec 01 §2). Es decir, el sistema calcularía y **persistiría una
factura económicamente incorrecta, en silencio, sin ningún error**. En una herramienta
cuyo propósito es presupuestar, un importe mal calculado que nadie ve es el peor tipo de
bug: no rompe nada visible, corrompe el dato. Por eso lo trato como prioridad máxima
aunque técnicamente la corrección sea de una línea.

**Cambio:** `country: str = Field(pattern=r"^[A-Za-z]{2}$")`. No lo restrinjo a una lista
blanca de países a propósito: la spec permite países fuera de la tabla de IVA (con 0 %
legítimo, p. ej. exportación); lo que hay que impedir es basura (dígitos/símbolos), no
países reales.
**Cubre:** `test_customers_api.py::test_create_customer_rejects_non_iso_country`.

### F4 — El buscador no escapaba los comodines de `LIKE`

**Hallazgo:** buscar `"50%"` interpretaba el `%` como comodín.

**Mi razonamiento:** no es seguridad (SQLAlchemy parametriza el valor, no hay
inyección), pero sí correctitud de la búsqueda. Entra en el mismo bloque de trabajo sin
desviarme, así que decido aplicarlo en vez de dejarlo documentado.

**Cambio:** escapar `\`, `%` y `_` en el término y usar `ilike(pattern, escape="\\")`.
**Cubre:** `test_customers_api.py::test_search_escapes_like_wildcards`.

### F6 — `created_at` se serializaba sin el sufijo `Z` de la spec

**Hallazgo:** salía `"2026-07-15T14:39:47.056215"`; la spec 02 muestra `"...Z"`.

**Mi razonamiento:** desviación real del contrato documentado, y barata de cerrar en
este mismo bloque. La corrijo por coherencia con la spec, que es la fuente de verdad.

**Cambio:** helper compartido `schemas/serializers.py::iso_utc_z` y `field_serializer`
en `CustomerRead` y `SimulationRead`.
**Cubre:** aserciones `created_at.endswith("Z")` en los tests de alta y de simulación.

### F12 — La propia suite de integración incumplía la regla de tamaño de fichero

**Hallazgo:** `tests/test_api.py` tenía 251 líneas; el límite de CLAUDE.md son 200.

**Mi razonamiento:** esto importa más de lo que el informe inicial le atribuía ("baja").
No es un fichero cualquiera pasándose de tamaño: es **la auditoría de calidad
incumpliendo precisamente la regla de calidad que exige al resto del código**. Si el
propio andamiaje de verificación se salta el límite de 200 líneas, la regla pierde toda
autoridad. La coherencia de un estándar se demuestra aplicándotelo a ti mismo primero.

**Cambio:** dividido en `test_customers_api.py` (178) y `test_simulations_api.py` (99),
con ayudas comunes en `tests/helpers.py`. Todos los ficheros del proyecto vuelven a
estar por debajo de 200 líneas.

---

## Límites conocidos — NO corregidos a propósito

Que conste explícitamente: lo siguiente **no** se corrige por **decisión de alcance**,
no por descuido. Distingo entre "deuda que asumo con los ojos abiertos" y "cosas que se
me pasaron".

### F5 — El índice de `company_name` no acelera la búsqueda por subcadena

Los índices de la spec 03 están todos. Pero el buscador usa `ILIKE '%x%'` con comodín
inicial, que un índice B-tree no puede aprovechar. **Decido no tocarlo:** la solución
real (FTS5 o búsqueda por prefijo) es **sobre-ingeniería para una herramienta interna de
volumen bajo**. Meter un motor de full-text para una demo con decenas de clientes sería
optimizar un problema que no tengo. Lo dejo anotado para cuando (si) escale.

### F7 — `tax_rate` serializado a 2 decimales sobre columna `NUMERIC(5,4)`

Correcto para la tabla de IVA actual (todas las tasas tienen 2 decimales). Una tasa
futura tipo 8,5 % se redondearía a la baja. **Decido no tocarlo:** es deuda latente sin
efecto hoy; corregirla ahora es resolver un problema hipotético. La columna ya guarda 4
decimales, así que el dato no se pierde en BD; solo habría que ajustar la presentación
el día que exista una tasa así.

### F8 y F9 — Caminos de error defensivos inalcanzables hoy

`calculate_base_cost` lanza `ValueError` para negativos (Pydantic ya lo bloquea antes) y
`create_simulation` no envuelve el commit (la FK y los checks están garantizados aguas
arriba). **Decido no añadir manejo específico:** ambos casos son inalcanzables por el
API, y el handler genérico de F2 ya es la red de seguridad que los convertiría en un 500
con formato unificado si algún día se alcanzaran. Añadir try/except puntuales sería
defenderse de entradas que el sistema ya rechaza antes.

### F10 — Inyección de dependencias de la configuración

`settings` es un singleton de módulo y el `engine` se crea al importar. **Decido no
convertirlo en dependencia inyectable:** para el tamaño de este proyecto es
sobre-ingeniería. Lo único que necesito de verdad —poder apuntar los tests a otra BD— ya
lo tengo vía override de `get_db`, que es exactamente lo que hace `conftest.py`. Inyectar
config vía `Depends` añadiría ceremonia sin resolver ningún problema real que tenga.

### F11 — Sin logging estructurado

Más allá del log del handler de F2, no monto logging con niveles, formato ni handlers.
**Decido no hacerlo:** observabilidad completa excede el alcance de una demo. La red de
seguridad de F2 cubre lo mínimo (que un 500 deje rastro).

---

## Verificación

- **Tests tras cada bloque de cambios** (F1+F2 → F3 → F4 → F6 → F12), no solo al final:
  la suite se mantuvo en verde en cada paso.
- **Resultado final:** `pytest` → **88 passed** (4 tests nuevos que fijan F1, F3, F4 y
  F6; el resto del backend intacto).
- **Todos los ficheros del proyecto < 200 líneas** (el mayor de `app/` es el validador,
  138; el mayor de `tests/`, 178).
- **BD de desarrollo regenerada limpia** con `python -m scripts.init_db` sobre una base
  nueva, descartando las filas de prueba acumuladas durante los smoke-tests manuales.

## Resumen de la decisión

| # | Hallazgo | Decisión | Motivo |
|---|---|---|---|
| F1 | 404/405 sin `code` | Corregido | Regla explícita de CLAUDE.md, innegociable |
| F2 | 500 sin formato/log | Corregido | Misma regla; barato |
| F3 | `country` laxo → IVA 0 % silencioso | Corregido (prioridad máxima) | Dato económico incorrecto sin error visible |
| F4 | comodines LIKE sin escapar | Corregido | Cabía en el bloque, mejora correctitud |
| F6 | `created_at` sin `Z` | Corregido | Desviación real del contrato de la spec |
| F12 | test de 251 líneas | Corregido | La auditoría no puede saltarse su propia regla |
| F5 | índice inútil para subcadena | No tocar | Sobre-ingeniería para volumen bajo |
| F7 | rate a 2 decimales | No tocar | Deuda latente sin efecto hoy |
| F8/F9 | errores defensivos inalcanzables | No tocar | Ya cubiertos por F2; entradas ya rechazadas |
| F10 | DI de settings | No tocar | Override de `get_db` ya cubre lo necesario |
| F11 | logging estructurado | No tocar | Fuera de alcance de demo |

---

# Segunda ronda — auditoría del contrato al preparar el frontend

- **Fecha:** 2026-07-16
- **Origen:** antes de escribir una línea de la Fase 4 verifiqué el contrato real
  ejecutando los cinco endpoints y comparando su JSON con
  [02-contrato-api.md](../01-specs/02-contrato-api.md), en vez de fiarme de la spec.
- **Por qué aquí:** son hallazgos del mismo backend auditado en la Sesión 5, así que
  los añado a este documento en lugar de abrir uno nuevo. La numeración continúa
  desde F12 (F7 y F8 ya estaban ocupados por la primera ronda).

El contrato resultó fiel a la spec en lo esencial —campos, tipos, importes como string
decimal, códigos de error—, pero **la verificación por ejecución encontró dos cosas que
la lectura del código no habría sacado**. Las dos son requisitos de la spec 04 que el
backend no podía sostener, no cosmética.

## Correcciones aplicadas

### F13 — El buscador no encontraba "Ibérica" escribiendo "iberica"

**Hallazgo:** con "Acme Ibérica S.L." dado de alta, `?search=iberica` devolvía **0
resultados**. Y `?search=IBÉRICA` **también 0**: el `LIKE` de SQLite solo pliega
mayúsculas del rango ASCII, así que ni siquiera funcionaba el caso que el `ilike`
prometía. El docstring del router afirmaba "parcial, sin acentos" — era falso.

**Mi razonamiento:** esto no es un límite conocido aceptable, es la Vista 1 rota para
clientes españoles, que son justo los del caso de uso principal. Un buscador de una
herramienta interna española que falla al escribir sin tildes —lo que hace todo el
mundo— no cumple su función. Además el docstring mentía, que es peor que no documentar:
describía un comportamiento verificado como inexistente.

**Cambio:** el filtro pasa a Python (`services/customer.py::_normalize_for_search`):
`casefold()` + descomposición NFD + descarte de caracteres combinantes, aplicado a los
dos lados de la comparación. Descarto plegar acentos en SQL (`COLLATE` propio o columna
normalizada e indexada): para el volumen de esta demo es sobre-ingeniería, y en Python
la regla queda en una función testeable de cuatro líneas.
**Efecto lateral bueno:** al comparar texto plano, `%` y `_` son literales por
construcción y el escapado manual de F4 desaparece; su test sigue en verde sin tocarlo.
**Límite asumido:** recorre todos los clientes en memoria — coherente con lo ya decidido
en F5, y anotado en el docstring.
**Cubre:** `test_customers_api.py::test_search_is_accent_insensitive`, con los cuatro
términos ("iberica", "IBERICA", "Ibérica", "IBÉRICA").

### F14 — Los 422 no decían a qué campo pertenecía el error, en formato máquina

**Hallazgo:** el 422 de Pydantic salía como
`{"detail": "email: value is not a valid email address...", "code": "VALIDATION_ERROR"}`.
El campo iba **pegado dentro del string** de `detail`.

**Mi razonamiento:** la spec 04 (Vista 3) exige mostrar el error "junto al campo". Con
ese contrato, el frontend solo podía conseguirlo parseando el texto hasta el primer
`:` — acoplar la UI al formato de un mensaje de error, que es exactamente el tipo de
acoplamiento frágil que se rompe en silencio cuando Pydantic cambia un literal. El
arreglo va en el backend: el que conoce la estructura del error es quien debe exponerla.

**Cambio:** el handler de `RequestValidationError` en `main.py` añade un array
`errors` de `{field, message}`; `detail` pasa a ser un mensaje único legible en
español ("Los datos enviados no son válidos.") y deja de ser el portador del campo.
`_field_name()` descarta el origen que Pydantic antepone (`body`/`query`/`path`), de
modo que `("body","email")` → `"email"` y el frontend puede casar el `field` con el
`name` de su input directamente.
**Alcance deliberadamente cerrado:** solo toco este handler. `INVALID_TAX_ID` (422),
`TAX_ID_ALREADY_EXISTS` (409), `CUSTOMER_NOT_FOUND` (404) y los `HTTP_4xx` de F1 ya
tenían `code` y mensaje propio en español, y **no los toco**: ya cumplían.
**Cubre:** `test_customers_api.py::test_validation_error_reports_field_errors` (dos
campos malos a la vez → `["email","plan"]`) y `::test_validation_error_field_omits_request_location`
(un `path` param → `field == "customer_id"`, sin prefijo).
**Contrato actualizado:** el array `errors` es una ampliación del formato de error, así
que queda documentado en la spec 02; si no, el código volvería a contradecir a la spec.

## Anotado sin corregir — el resto de divergencias del contrato

La verificación encontró cinco diferencias más entre la spec 02 y el código real. **En
todas manda el código** y ninguna es un bug; se absorben al construir el cliente API:

| Divergencia | Decisión |
|---|---|
| `created_at` sale con microsegundos (`...:13.561769Z`); la spec muestra segundos | El frontend parsea con `new Date()`, sin asumir longitud fija |
| La respuesta normaliza lo enviado (`b12345674`→`B12345674`, `es`→`ES`) | Tras crear se pinta **siempre** la respuesta del servidor, nunca el estado del formulario |
| `POST /customers/` (barra final) → 307 | Las rutas del cliente se construyen sin barra final |
| El preview en vivo necesita la tabla de IVA y no hay endpoint que la exponga | Sin endpoint nuevo: se duplica en `utils/`, con el trade-off ya aceptado para los tramos |
| `GET /api/health` y los `code` genéricos `HTTP_404`/`HTTP_405` no estaban en la spec 02 | Documentados como "extras" en la spec 02 |

## Verificación

- **Ejecutando, no leyendo:** los dos arreglos se comprobaron por HTTP real contra la
  app (`iberica` → 1 resultado; 422 con `errors:[{field:"email",...}]`), además de por
  los tests. La primera ronda ya había enseñado que el código puede contradecir al
  docstring que lo describe.
- **Resultado:** `pytest` → **91 passed** (88 previos + 3 nuevos que fijan F13 y F14).
  Ningún test existente necesitó cambios: la superficie del resto del contrato no se
  movió.
- **Regla de las 200 líneas, otra vez:** al añadir los tests nuevos,
  `test_customers_api.py` llegó a **220 líneas** y volvió a incumplir el límite — el
  mismo tropiezo de F12, y en el mismo sitio. Divido sacando los tests de formato de
  error a `tests/test_error_format_api.py` (75): `{detail, code, errors}` es un
  contrato **transversal** a toda la API, no de los clientes, así que la división
  además de bajar el tamaño mejora la cohesión. Quedan `test_customers_api.py` 160,
  `services/customer.py` 103, `main.py` 106 — **todo el proyecto < 200**, verificado
  con `wc -l`, no a ojo.

| # | Hallazgo | Decisión | Motivo |
|---|---|---|---|
| F13 | buscador ciego a los acentos | Corregido | Vista 1 rota para clientes españoles, el caso de uso principal |
| F14 | 422 sin campo en formato máquina | Corregido | La spec 04 exige el error junto al campo; parsear texto es acoplamiento frágil |
