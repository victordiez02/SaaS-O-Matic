---
name: spanish-tax-id-validator
description: Valida identificadores fiscales españoles (DNI, NIE y CIF) con los algoritmos oficiales de control. Usa esta skill SIEMPRE que haya que validar, implementar, testear o generar un DNI, NIF, NIE o CIF español — al escribir el validador del backend (validators/spanish_tax_id.py), sus tests, datos de prueba o seeds con clientes españoles, al revisar código que toque validación fiscal, o si el usuario pregunta si un identificador concreto es válido. Aplica incluso si solo se menciona "identificador fiscal", "tax id" o "NIF" sin nombrar el algoritmo.
---

# Validación fiscal española (DNI / NIE / CIF)

Deriva de `ai-workspace/01-specs/01-reglas-de-negocio.md` §3 (fuente de verdad: si
esta skill y la spec divergen, gana la spec). Aplica estos algoritmos exactamente —
no los reconstruyas de memoria.

## Normalización previa (siempre, antes de validar)

1. Convertir a mayúsculas.
2. Eliminar espacios y guiones (`12345678-z` → `12345678Z`).
3. Detectar tipo por patrón: 8 dígitos + letra → DNI · empieza por X/Y/Z → NIE ·
   empieza por letra de organización → CIF · nada encaja → **inválido**.

## DNI — 8 dígitos + letra de control

```
LETRAS = "TRWAGMYFPDXBNJZSQVHLCKE"
letra_correcta = LETRAS[numero % 23]
```

Ejemplo: `12345678 % 23 = 14` → `LETRAS[14] = 'Z'` → `12345678Z` válido.

## NIE — X/Y/Z + 7 dígitos + letra de control

Sustituir el prefijo (X→0, Y→1, Z→2), formar el número de 8 cifras y aplicar el
algoritmo del DNI. Ejemplo: `X1234567L` → `01234567 % 23 = 19` → `L` ✓.

## CIF — letra de organización + 7 dígitos + carácter de control

Letras de organización válidas: `A B C D E F G H J N P Q R S U V W`.

1. **Posiciones pares** de los 7 dígitos (2.ª, 4.ª, 6.ª): sumar tal cual.
2. **Posiciones impares** (1.ª, 3.ª, 5.ª, 7.ª): dígito × 2, sumar los dígitos del
   resultado (8×2=16 → 1+6=7).
3. `digito_control = (10 − ((pares + impares) % 10)) % 10`
4. Carácter esperado según la letra inicial:
   - `P Q R S W N` → **letra** obligatoria: `"JABCDEFGHI"[digito_control]`
   - `A B E H` → **dígito** obligatorio
   - `C D F G J U V` → se aceptan ambos

Ejemplo: `B12345674` → impares 1,3,5,7 → 2+6+1+5=14 · pares 2+4+6=12 · total 26 →
control `(10−6)%10 = 4` → válido.

## Cuándo aplicar validación estricta

Solo si `country == "ES"`. Para otros países: formato mínimo (no vacío, 3–20
caracteres alfanuméricos tras normalizar). El error de la API es 422 con code
`INVALID_TAX_ID` y mensaje que indica el motivo (letra de control errónea, longitud,
patrón desconocido).

## Casos de test canónicos

Usa exactamente esta tabla (es la de la spec 01 §3.4) al escribir o verificar tests:

| Entrada | Esperado | Cubre |
|---|---|---|
| `12345678Z` | válido | DNI base |
| `12345678A` | inválido | letra errónea |
| `12345678z` / `12345678-Z` | válido | normalización |
| `1234567Z` | inválido | longitud |
| `X1234567L` / `Y1234567X` / `Z7654321H` | válido | NIE, los 3 prefijos |
| `X1234567T` | inválido | NIE letra errónea |
| `B12345674` / `A58818501` | válido | CIF control dígito |
| `B12345670` | inválido | CIF dígito erróneo |
| `Q2826000H` | válido | CIF control letra |
| `Q28260008` | inválido | Q exige letra, no dígito |
| `B 1234567 4` | válido | normalización de espacios |
| `M1234567X` | inválido | letra de organización no válida |
| `` / `HOLA` | inválido | vacío / sin patrón |

Al generar datos de prueba "válidos", calcula el carácter de control con el algoritmo:
nunca inventes un identificador sin verificarlo.
