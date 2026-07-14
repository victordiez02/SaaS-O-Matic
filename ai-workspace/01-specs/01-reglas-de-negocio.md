# 01 — Reglas de negocio

Fuente de verdad de la lógica de negocio: tarificación por tramos, IVA por país y
validación fiscal española. Los ejemplos numéricos de este documento **se convierten
en tests** en `backend/tests/`.

> **Decisión de diseño — enfoque híbrido spec + skills.** Las dos piezas de lógica
> reutilizable de este documento (validación fiscal y tarificación por tramos) están
> extraídas además a skills: `.claude/skills/spanish-tax-id-validator/` y
> `.claude/skills/tiered-pricing/`. El motivo: ambas se reaplican en más de un sitio
> (backend y preview en vivo del frontend, más sus tests) y quiero que la IA las
> aplique siempre igual, de forma auditable, sin reinterpretar la spec en cada sesión.
> **Esta spec sigue siendo la fuente de verdad legible; las skills derivan de ella** y
> si divergen, gana la spec. El resto de specs (visión, API, datos, UX) no se convierte
> en skill porque se consume una sola vez como documento de diseño, no como lógica
> ejecutable recurrente.

---

## 1. Tarificación acumulativa por tramos (tiered pricing)

El coste mensual base depende **solo del número de usuarios activos** y es
**acumulativo**: cada tramo se cobra a su precio, no se aplica el precio del tramo
final a todos los usuarios.

| Tramo | Usuarios | Precio por usuario |
|---|---|---|
| 1 | 1 – 10 | 10 € |
| 2 | 11 – 50 | 8 € |
| 3 | 51 en adelante | 5 € |

**Fórmula** (con `u` = usuarios activos, `u ≥ 0` entero):

```
base(u) = 10 × min(u, 10)
        + 8  × min(max(u − 10, 0), 40)
        + 5  × max(u − 50, 0)
```

**Total con impuestos:** `total = base × (1 + tasa_iva_pais)`, redondeado a 2 decimales.

### Ejemplos verificados a mano (obligatorios como tests)

| Usuarios | Tramo 1 | Tramo 2 | Tramo 3 | Base |
|---|---|---|---|---|
| 5 | 5 × 10 = 50 € | — | — | **50,00 €** |
| 15 | 10 × 10 = 100 € | 5 × 8 = 40 € | — | **140,00 €** (ejemplo del enunciado ✓) |
| 50 | 10 × 10 = 100 € | 40 × 8 = 320 € | — | **420,00 €** |
| 120 | 10 × 10 = 100 € | 40 × 8 = 320 € | 70 × 5 = 350 € | **770,00 €** |

Ejemplo completo con IVA: cliente español (21 %), 15 usuarios →
base 140,00 € · impuesto 29,40 € · **total 169,40 €**.

### Reglas de implementación

- **`Decimal` obligatorio** para todo importe; prohibido float. Redondeo
  `ROUND_HALF_UP` a 2 decimales solo en el resultado final (impuesto y total).
- `u = 0` es válido y produce base 0,00 € (simulación de cliente sin usuarios aún).
- `u` negativo o no entero → error de validación (422 en la API).
- La lógica vive en `backend/app/services/pricing.py`, nunca en routers.

> **Decisión de diseño — almacenamiento y llamadas API sin coste.** El enunciado pide
> registrar `storage_gb` y `api_calls` en la simulación pero **no define precio** para
> ellos. Decisión: se **persisten como datos de la simulación sin coste asociado** en
> el alcance actual, y el motor de precios se diseña extensible (función por concepto
> facturable) para poder añadirles precio sin tocar el cálculo de usuarios. Así el dato
> queda registrado desde el día 1 y el modelo no cambia cuando negocio defina tarifas.

---

## 2. IVA por país

> **Decisión de diseño — alcance de la tabla de IVA.** El enunciado exige aplicar "el
> impuesto correspondiente al país del cliente" sin definir países. Decisión: alcance
> limitado a los 5 países de la UE donde opera el equipo comercial, con **0 % por
> defecto para cualquier otro país** (tratado como exportación fuera de alcance
> fiscal). La tabla vive en configuración (`backend/app/core/`), no hardcodeada en la
> lógica, para que sea extensible sin tocar el servicio.

| País | Código ISO 3166-1 alpha-2 | Tipo de IVA |
|---|---|---|
| España | ES | 21 % |
| Portugal | PT | 23 % |
| Francia | FR | 20 % |
| Alemania | DE | 19 % |
| Italia | IT | 22 % |
| Resto de países | * | 0 % |

- El país se almacena como código ISO alpha-2 en mayúsculas.
- La tasa se persiste en cada simulación (`tax_rate`) como valor decimal (`0.21`),
  de modo que un cambio futuro de la tabla **no altera simulaciones históricas**.

---

## 3. Validación fiscal española (DNI / NIE / CIF)

**Regla del enunciado:** la validación algorítmica estricta es **obligatoria solo si
`country == "ES"`**.

> **Decisión de diseño — otros países.** Para países distintos de España el enunciado
> no exige validación. Decisión: se aplica un formato mínimo (no vacío, 3–20
> caracteres alfanuméricos tras normalizar) y se documenta como límite conocido. Añadir
> validadores por país es una extensión natural del módulo `validators/`.

**Normalización previa (todos los tipos):** convertir a mayúsculas y eliminar espacios
y guiones. `12345678-z` → `12345678Z`. Después de normalizar, el tipo se detecta por
patrón: 8 dígitos + letra → DNI; empieza por X/Y/Z → NIE; empieza por letra de
organización → CIF. Si no encaja en ningún patrón → inválido.

### 3.1 DNI (personas físicas)

Formato: **8 dígitos + 1 letra de control**.

Algoritmo: la letra correcta es el carácter en la posición `número % 23` de la cadena:

```
TRWAGMYFPDXBNJZSQVHLCKE
```

Ejemplo: `12345678 % 23 = 14` → posición 14 → `Z` → **`12345678Z` es válido**.

### 3.2 NIE (extranjeros residentes)

Formato: **X, Y o Z + 7 dígitos + 1 letra de control**.

Algoritmo: sustituir el prefijo (X→0, Y→1, Z→2), formar el número de 8 cifras y aplicar
**el mismo algoritmo del DNI**.

Ejemplos: `X1234567L` (01234567 % 23 = 19 → L ✓), `Y1234567X` (11234567 % 23 = 10 → X ✓),
`Z7654321H` (27654321 % 23 = 18 → H ✓).

### 3.3 CIF (personas jurídicas)

Formato: **letra de organización + 7 dígitos + 1 carácter de control** (dígito o letra).

Letras de organización válidas: `A B C D E F G H J N P Q R S U V W`.

Algoritmo del dígito de control (sobre los 7 dígitos centrales):

1. **Posiciones pares** (2.ª, 4.ª, 6.ª): sumar los dígitos tal cual.
2. **Posiciones impares** (1.ª, 3.ª, 5.ª, 7.ª): multiplicar cada dígito por 2 y sumar
   los dígitos del resultado (ej.: 8 × 2 = 16 → 1 + 6 = 7).
3. `suma = pares + impares`; dígito de control = `(10 − (suma % 10)) % 10`.
4. El carácter esperado depende de la letra de organización:
   - `P, Q, R, S, W` (y `N`): control **obligatoriamente letra** → índice del dígito en `JABCDEFGHI`.
   - `A, B, E, H`: control **obligatoriamente dígito**.
   - Resto (`C, D, F, G, J, U, V`): se aceptan **ambos** (dígito o su letra equivalente).

Ejemplo trabajado — `B12345674`: dígitos `1234567`. Impares (1,3,5,7): 1→2, 3→6,
5→10→1, 7→14→5, suma 14. Pares (2,4,6): 2+4+6 = 12. Total 26 → control
`(10 − 6) % 10 = 4`. `B` exige dígito → **`B12345674` válido**.

### 3.4 Casos de test obligatorios

| # | Entrada | Tipo | Esperado | Qué cubre |
|---|---|---|---|---|
| 1 | `12345678Z` | DNI | válido | Caso base DNI |
| 2 | `12345678A` | DNI | inválido | Letra de control errónea |
| 3 | `12345678z` | DNI | válido | Normalización a mayúsculas |
| 4 | `12345678-Z` | DNI | válido | Normalización de guiones |
| 5 | `1234567Z` | DNI | inválido | Longitud incorrecta (7 dígitos) |
| 6 | `X1234567L` | NIE | válido | Prefijo X |
| 7 | `Y1234567X` | NIE | válido | Prefijo Y |
| 8 | `Z7654321H` | NIE | válido | Prefijo Z |
| 9 | `X1234567T` | NIE | inválido | Letra de control errónea |
| 10 | `B12345674` | CIF | válido | Letra que exige dígito |
| 11 | `B12345670` | CIF | inválido | Dígito de control erróneo |
| 12 | `A58818501` | CIF | válido | Letra A (exige dígito) |
| 13 | `Q2826000H` | CIF | válido | Letra que exige letra de control |
| 14 | `Q28260008` | CIF | inválido | Q con dígito donde exige letra |
| 15 | `B 1234567 4` | CIF | válido | Normalización de espacios |
| 16 | `M1234567X` | — | inválido | Letra de organización no válida para CIF |
| 17 | `` (vacío) | — | inválido | Entrada vacía |
| 18 | `HOLA` | — | inválido | No encaja en ningún patrón |

La suite completa vive en `backend/tests/test_tax_id_validator.py` y debe existir
**antes** de dar por terminado el validador (TDD, regla de `CLAUDE.md`).
