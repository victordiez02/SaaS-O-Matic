# 02 — Contrato de la API

API REST del backend (FastAPI). Prefijo común: `/api/v1`. Todos los importes en las
respuestas están **en EUR** y serializados como *string* decimal (`"140.00"`) para no
perder precisión en JSON.

> **Decisión de diseño — endpoints GET no pedidos por el enunciado.** El enunciado solo
> exige `POST /customers` y `POST /simulations`, pero las vistas obligatorias del
> frontend (buscador, detalle con historial) necesitan leer datos. Se añaden tres
> endpoints GET: `GET /customers?search=` (buscador por nombre o identificador fiscal),
> `GET /customers/{id}` (detalle) y `GET /customers/{id}/simulations` (historial).
> Detectar esta carencia en fase de specs evita improvisar la API a mitad del frontend.

## Formato de error unificado

Todos los errores devuelven este JSON (regla de `CLAUDE.md`):

```json
{
  "detail": "Mensaje legible orientado al usuario",
  "code": "CODIGO_MAQUINA"
}
```

| Código HTTP | Cuándo | Ejemplos de `code` |
|---|---|---|
| 404 | Recurso inexistente | `CUSTOMER_NOT_FOUND` |
| 409 | Conflicto de unicidad | `TAX_ID_ALREADY_EXISTS` |
| 422 | Validación de entrada (incluida la fiscal) | `INVALID_TAX_ID`, `VALIDATION_ERROR` |

> **Decisión de diseño — 409 para duplicados.** Un `tax_id` repetido no es un error de
> formato (422) sino un conflicto de estado, así que se usa 409 Conflict. Los errores
> de validación de Pydantic se normalizan al mismo formato unificado con code
> `VALIDATION_ERROR`.

### `errors`: detalle por campo en los `VALIDATION_ERROR`

Los 422 con `code: "VALIDATION_ERROR"` **añaden** un array `errors` de `{field, message}`
sobre el formato base. El resto de errores (`INVALID_TAX_ID`, `TAX_ID_ALREADY_EXISTS`,
`CUSTOMER_NOT_FOUND`…) no lo llevan: apuntan a la petición entera, no a un campo.

```json
{
  "detail": "Los datos enviados no son válidos.",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "field": "email", "message": "value is not a valid email address: An email address must have an @-sign." },
    { "field": "plan", "message": "Input should be 'basic', 'pro' or 'enterprise'" }
  ]
}
```

- `field` es el nombre tal como lo envía el cliente (`email`, `plan`, `customer_id`), sin
  el prefijo de origen (`body`/`query`/`path`) que añade Pydantic; los campos anidados se
  unen con puntos. Casa directamente con el `name` del input del formulario.
- `detail` es un mensaje único y genérico: **no** es el sitio del que extraer el campo.

> **Decisión de diseño — el campo va en formato máquina, no dentro del texto.** Antes el
> campo viajaba pegado en el string de `detail` (`"email: value is not a valid..."`), así
> que la vista 3 del frontend (spec 04: mostrar el error junto al campo) solo podía
> conseguirlo parseando el mensaje hasta el primer `:` — acoplando la UI al formato de un
> literal de Pydantic. Exponer la estructura es responsabilidad de quien la conoce, que
> es el backend. Ver F14 en `03-sesiones-ia/correcciones-y-auditoria.md`.
>
> **Límite conocido:** los `message` son el texto original de Pydantic, **en inglés**.
> Traducirlos exigiría un mapa propio de mensajes por tipo de error; queda fuera del
> alcance actual y el frontend puede sustituirlos por su propio texto usando `field`.

---

## POST /api/v1/customers

Registra un cliente corporativo. Si `country == "ES"`, el `tax_id` se valida con el
algoritmo oficial (ver [01-reglas-de-negocio.md](01-reglas-de-negocio.md) §3).

**Request:**

```json
{
  "company_name": "Acme Ibérica S.L.",
  "tax_id": "B12345674",
  "email": "cfo@acme-iberica.es",
  "country": "ES",
  "plan": "pro"
}
```

Campos: todos obligatorios. `country` = código ISO alpha-2. `plan` ∈
`{"basic", "pro", "enterprise"}`.

> **Decisión de diseño — el plan no afecta al precio.** El enunciado pide guardar el
> "Plan Elegido" pero la tarificación solo depende de usuarios. Se modela como enum
> cerrado, se persiste como dato comercial y se documenta como extensión futura del
> motor de precios.

**Response `201 Created`:**

```json
{
  "id": 1,
  "company_name": "Acme Ibérica S.L.",
  "tax_id": "B12345674",
  "email": "cfo@acme-iberica.es",
  "country": "ES",
  "plan": "pro",
  "created_at": "2026-07-14T10:30:00Z"
}
```

**Errores:** `422 INVALID_TAX_ID` (identificador fiscal español que no supera el
algoritmo), `422 VALIDATION_ERROR` (email inválido, plan desconocido, campo ausente),
`409 TAX_ID_ALREADY_EXISTS`.

> **Ojo — la respuesta normaliza lo enviado.** `tax_id` se devuelve en mayúsculas y sin
> espacios ni guiones, y `country` en mayúsculas: un alta con `"b12345674"` / `"es"`
> responde `"B12345674"` / `"ES"`. Tras crear un cliente hay que pintar **la respuesta
> del servidor**, nunca el estado del formulario.

Ejemplo de 422:

```json
{
  "detail": "El identificador fiscal 'B12345670' no es válido: dígito de control incorrecto",
  "code": "INVALID_TAX_ID"
}
```

---

## POST /api/v1/simulations

Registra una simulación de consumo para un cliente. **El backend calcula y persiste el
desglose completo**; el cliente HTTP nunca envía importes.

**Request:**

```json
{
  "customer_id": 1,
  "active_users": 15,
  "storage_gb": 500,
  "api_calls": 100000
}
```

Campos: `active_users` entero ≥ 0 (obligatorio); `storage_gb` y `api_calls` enteros
≥ 0 (obligatorios; se persisten sin coste en el alcance actual, ver reglas de negocio).

**Response `201 Created`** (cliente español, 15 usuarios):

```json
{
  "id": 7,
  "customer_id": 1,
  "active_users": 15,
  "storage_gb": 500,
  "api_calls": 100000,
  "base_cost": "140.00",
  "tax_rate": "0.21",
  "tax_amount": "29.40",
  "total_cost": "169.40",
  "currency": "EUR",
  "created_at": "2026-07-14T10:35:00Z"
}
```

**Errores:** `404 CUSTOMER_NOT_FOUND`, `422 VALIDATION_ERROR` (usuarios negativos,
tipos incorrectos).

---

## GET /api/v1/customers?search={texto}

Buscador del dashboard. Sin `search` devuelve todos los clientes (herramienta interna,
volumen bajo; la paginación se documenta como límite conocido).

- Búsqueda parcial e insensible a mayúsculas y a acentos sobre `company_name` **y** `tax_id`.
- Sin resultados → `200` con lista vacía (no 404: la búsqueda vacía no es un error).

**Response `200 OK`** para `GET /api/v1/customers?search=acme`:

```json
{
  "items": [
    {
      "id": 1,
      "company_name": "Acme Ibérica S.L.",
      "tax_id": "B12345674",
      "email": "cfo@acme-iberica.es",
      "country": "ES",
      "plan": "pro",
      "created_at": "2026-07-14T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

## GET /api/v1/customers/{id}

Detalle de cliente para la vista de cards.

**Response `200 OK`:** mismo objeto cliente que en el alta.
**Errores:** `404 CUSTOMER_NOT_FOUND`.

---

## GET /api/v1/customers/{id}/simulations

Historial de simulaciones del cliente, ordenado de más reciente a más antigua.

**Response `200 OK`:**

```json
{
  "items": [
    {
      "id": 7,
      "customer_id": 1,
      "active_users": 15,
      "storage_gb": 500,
      "api_calls": 100000,
      "base_cost": "140.00",
      "tax_rate": "0.21",
      "tax_amount": "29.40",
      "total_cost": "169.40",
      "currency": "EUR",
      "created_at": "2026-07-14T10:35:00Z"
    }
  ],
  "total": 1
}
```

**Errores:** `404 CUSTOMER_NOT_FOUND` (el cliente no existe). Cliente existente sin
simulaciones → `200` con lista vacía.

---

## Resumen de la superficie de la API

| Método y ruta | Propósito | Éxito | Errores |
|---|---|---|---|
| `POST /api/v1/customers` | Alta de cliente | 201 | 409, 422 |
| `POST /api/v1/simulations` | Crear y persistir simulación | 201 | 404, 422 |
| `GET /api/v1/customers?search=` | Buscador | 200 | — |
| `GET /api/v1/customers/{id}` | Detalle de cliente | 200 | 404 |
| `GET /api/v1/customers/{id}/simulations` | Historial | 200 | 404 |

La documentación interactiva queda disponible en `/docs` (Swagger automático de FastAPI).

---

## Extras no documentados en el contrato original

Detectado al verificar el contrato real contra esta spec antes de la Fase 4 (ver
`03-sesiones-ia/correcciones-y-auditoria.md`, segunda ronda). Existen en el código y no
estaban aquí; se documentan para que la spec deje de contradecirlo:

**`GET /api/health`** — liveness del servicio, fuera de `/api/v1` porque no es negocio y
no debe versionarse con él. Responde `200` con:

```json
{ "status": "ok", "service": "backend" }
```

**`code` genéricos `HTTP_404` / `HTTP_405`** — las rutas inexistentes y los métodos no
permitidos los emite el enrutado de Starlette, no nuestro código, así que carecen de un
`code` de dominio. Un handler los reenvuelve al formato unificado con `HTTP_<status>` y
el `detail` original de Starlette (en inglés: `"Not Found"`, `"Method Not Allowed"`).
Son errores de programación del cliente HTTP, no situaciones que la UI deba explicar al
usuario; los `code` de dominio de la tabla de arriba son los que se muestran.

**Barra final → 307** — `POST /api/v1/customers/` redirige a `/api/v1/customers`
(`redirect_slashes` de FastAPI). Las rutas se construyen **sin** barra final.

**Precisión de `created_at`** — el valor real incluye microsegundos
(`"2026-07-16T14:18:13.561769Z"`); los ejemplos de esta spec los omiten por brevedad. Es
ISO 8601 válido y `new Date()` lo parsea; no asumir longitud fija ni cortar el string.
