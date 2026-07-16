/**
 * Preview del coste mensual: tramos acumulativos + IVA del país del cliente.
 *
 * DUPLICA a propósito la fórmula de `backend/app/services/pricing.py` para que el
 * slider recalcule sin ir a la red (ver ADR-006). El backend sigue siendo la fuente
 * de verdad: esto solo alimenta la previsualización, nunca lo que se guarda.
 *
 * Fuente: 01-reglas-de-negocio.md §1–2 y la skill `tiered-pricing`. Si cambian los
 * tramos o la tabla de IVA, hay que tocar los dos lados.
 */

/** Tramos acumulativos: [capacidad del tramo, € por usuario]. `null` = sin límite. */
const PRICING_TIERS: readonly [number | null, number][] = [
  [10, 10],
  [40, 8],
  [null, 5],
];

/** IVA por país ISO alpha-2. Fuera de la tabla → 0 % (spec 01 §2). */
const TAX_RATES: Readonly<Record<string, number>> = {
  ES: 0.21,
  PT: 0.23,
  FR: 0.2,
  DE: 0.19,
  IT: 0.22,
};

const DEFAULT_TAX_RATE = 0;

export interface CostEstimate {
  /** Todos los importes en EUR. La conversión de divisa es de presentación. */
  baseCost: number;
  taxRate: number;
  taxAmount: number;
  totalCost: number;
}

/**
 * Trabaja en céntimos enteros y redondea al final (media hacia arriba, como el
 * `ROUND_HALF_UP` del backend): en coma flotante, 140 × 0.21 da 29.400000000000002,
 * y el preview no puede enseñar un céntimo que el backend no va a cobrar.
 */
function roundCents(euros: number): number {
  return Math.round((euros + Number.EPSILON) * 100) / 100;
}

/** Tasa de IVA del país (ISO alpha-2, insensible a mayúsculas). */
export function getTaxRate(country: string): number {
  return TAX_RATES[country.trim().toUpperCase()] ?? DEFAULT_TAX_RATE;
}

/** Coste base por tramos acumulativos. `activeUsers` entero ≥ 0. */
export function calculateBaseCost(activeUsers: number): number {
  if (!Number.isInteger(activeUsers) || activeUsers < 0) {
    throw new RangeError("activeUsers debe ser un entero >= 0");
  }
  let base = 0;
  let remaining = activeUsers;
  for (const [capacity, pricePerUser] of PRICING_TIERS) {
    const usersInTier = capacity === null ? remaining : Math.min(remaining, capacity);
    base += pricePerUser * usersInTier;
    remaining -= usersInTier;
    if (remaining === 0) break;
  }
  return roundCents(base);
}

/** Desglose completo del preview: base por tramos + IVA del país del cliente. */
export function estimateCost(activeUsers: number, country: string): CostEstimate {
  const baseCost = calculateBaseCost(activeUsers);
  const taxRate = getTaxRate(country);
  const taxAmount = roundCents(baseCost * taxRate);
  const totalCost = roundCents(baseCost + taxAmount);
  return { baseCost, taxRate, taxAmount, totalCost };
}
