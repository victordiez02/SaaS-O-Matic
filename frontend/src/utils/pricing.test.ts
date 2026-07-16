import { describe, expect, it } from "vitest";

import { calculateBaseCost, estimateCost, getTaxRate } from "./pricing";

/**
 * Los mismos ejemplos verificados que fijan el motor del backend
 * (`tests/test_tiered_pricing.py`, spec 01 §1 y skill `tiered-pricing`).
 *
 * Que las dos implementaciones compartan la batería de casos es lo que sostiene la
 * duplicación del ADR-006: si el preview se desvía de la fórmula, salta aquí.
 */
describe("calculateBaseCost — tramos acumulativos", () => {
  it.each([
    { users: 0, expected: 0, tramos: "sin usuarios" },
    { users: 5, expected: 50, tramos: "5×10" },
    { users: 15, expected: 140, tramos: "10×10 + 5×8 (ejemplo del enunciado)" },
    { users: 50, expected: 420, tramos: "100 + 40×8" },
    { users: 120, expected: 770, tramos: "100 + 320 + 70×5" },
  ])("$users usuarios → $expected € ($tramos)", ({ users, expected }) => {
    expect(calculateBaseCost(users)).toBe(expected);
  });

  it("cobra cada tramo a su precio, no el del último a todos", () => {
    // Si fuera por escalón, 120 usuarios saldrían a 5 € cada uno = 600 €.
    expect(calculateBaseCost(120)).not.toBe(600);
  });

  it.each([-1, 1.5, NaN])("rechaza %p", (users) => {
    expect(() => calculateBaseCost(users)).toThrow(RangeError);
  });
});

describe("getTaxRate — tabla de IVA", () => {
  it.each([
    ["ES", 0.21],
    ["PT", 0.23],
    ["FR", 0.2],
    ["DE", 0.19],
    ["IT", 0.22],
  ])("%s → %s", (country, expected) => {
    expect(getTaxRate(country)).toBe(expected);
  });

  it("país fuera de la tabla → 0 %, nunca error (spec 01 §2)", () => {
    expect(getTaxRate("US")).toBe(0);
  });

  it("normaliza mayúsculas y espacios", () => {
    expect(getTaxRate(" es ")).toBe(0.21);
  });
});

describe("estimateCost — desglose completo", () => {
  it("15 usuarios en España → 140,00 + 29,40 = 169,40 (ejemplo canónico)", () => {
    expect(estimateCost(15, "ES")).toEqual({
      baseCost: 140,
      taxRate: 0.21,
      taxAmount: 29.4,
      totalCost: 169.4,
    });
  });

  it("no arrastra el error de coma flotante de 140 × 0.21", () => {
    // 140 * 0.21 === 29.400000000000002 en IEEE 754.
    expect(estimateCost(15, "ES").taxAmount).toBe(29.4);
  });

  it("país sin IVA → impuesto 0 y total igual a la base", () => {
    const estimate = estimateCost(120, "US");
    expect(estimate.taxAmount).toBe(0);
    expect(estimate.totalCost).toBe(estimate.baseCost);
  });

  it("base + impuesto = total en los cinco países de la tabla", () => {
    for (const country of ["ES", "PT", "FR", "DE", "IT"]) {
      const { baseCost, taxAmount, totalCost } = estimateCost(37, country);
      expect(baseCost + taxAmount).toBeCloseTo(totalCost, 2);
    }
  });
});
