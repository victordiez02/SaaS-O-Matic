---
name: tiered-pricing
description: Calcula el coste mensual de una simulación SaaS-O-Matic con tarificación acumulativa por tramos (10€/8€/5€ por usuario) más el IVA del país del cliente. Usa esta skill SIEMPRE que haya que calcular, implementar, testear o verificar el coste de una simulación — al escribir el motor de precios del backend (services/pricing.py), el preview en tiempo real del frontend (utils/pricing.ts), sus tests, o si el usuario pregunta cuánto costaría una simulación con N usuarios. Aplica en cuanto aparezcan "tramos", "tiered pricing", "coste base", "IVA", "factura mensual" o cualquier cálculo de importes del proyecto.
---

# Tarificación por tramos + IVA

Deriva de `ai-workspace/01-specs/01-reglas-de-negocio.md` §1–2 (fuente de verdad: si
esta skill y la spec divergen, gana la spec). El mismo algoritmo se aplica en backend
(cálculo persistido, autoritativo) y frontend (preview en vivo): usa exactamente esta
fórmula en ambos, sin variaciones.

## Fórmula (acumulativa, NO por escalón)

Cada tramo se cobra a su precio; nunca se aplica el precio del tramo final a todos
los usuarios. Con `u` = usuarios activos (entero ≥ 0):

```
base(u) = 10 × min(u, 10)
        + 8  × min(max(u − 10, 0), 40)
        + 5  × max(u − 50, 0)

impuesto = redondear2(base × tasa_pais)
total    = base + impuesto
```

| Tramo | Usuarios | €/usuario |
|---|---|---|
| 1 | 1 – 10 | 10 |
| 2 | 11 – 50 | 8 |
| 3 | > 50 | 5 |

## Tabla de IVA por país (código ISO alpha-2)

| País | Tasa |
|---|---|
| ES | 0.21 |
| PT | 0.23 |
| FR | 0.20 |
| DE | 0.19 |
| IT | 0.22 |
| resto | 0.00 |

## Ejemplos verificados (úsalos como tests, tal cual)

| u | Desglose | Base |
|---|---|---|
| 5 | 5×10 | **50.00 €** |
| 15 | 10×10 + 5×8 | **140.00 €** (ejemplo del enunciado) |
| 50 | 100 + 40×8 | **420.00 €** |
| 120 | 100 + 320 + 70×5 | **770.00 €** |

Con IVA español: 15 usuarios → base 140.00 + impuesto 29.40 = **total 169.40 €**.
Si tu implementación no reproduce estos 4 valores exactos, está mal: corrígela antes
de continuar.

## Reglas de implementación

- **Backend (Python): `decimal.Decimal` obligatorio**, nunca float. Redondeo
  `ROUND_HALF_UP` a 2 decimales solo sobre impuesto y total, no en pasos intermedios.
- **Frontend (TypeScript)**: el preview trabaja en céntimos enteros o con los mismos
  redondeos; el valor persistido es siempre el del backend (fuente autoritativa).
- Todos los importes en **EUR**; la conversión de divisa es solo de presentación.
- `u = 0` → base 0.00 (válido). `u` negativo o no entero → error de validación (422).
- `storage_gb` y `api_calls` se persisten **sin coste** en el alcance actual; el motor
  queda extensible por concepto facturable, pero no les inventes precio.
- La tasa aplicada se persiste con la simulación (`tax_rate`): los cambios futuros de
  la tabla no reescriben el histórico.
