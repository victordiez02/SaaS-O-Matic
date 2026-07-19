// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatMoney } from "../utils/format";

const { fetchExchangeRates } = vi.hoisted(() => ({ fetchExchangeRates: vi.fn() }));
vi.mock("../api/exchangeRates", () => ({ fetchExchangeRates }));

// Intl.NumberFormat separa el importe del símbolo con U+00A0 (espacio fino), no
// con el espacio normal que se teclea en un literal: se compara contra el
// propio formateador en vez de contra un string escrito a mano.
const EUR_140 = formatMoney(140, "EUR");

/** `useExchangeRates` cachea las tasas a nivel de módulo (una petición por
 *  sesión, ver ADR-004): sin `resetModules` esa caché sobreviviría entre tests
 *  de este fichero y el segundo arrancaría ya con éxito. Cada test importa su
 *  propia copia fresca del contexto y del selector. */
async function freshRender() {
  vi.resetModules();
  const { CurrencyProvider, useCurrency } = await import("../context/CurrencyContext");
  const { default: CurrencySelector } = await import("./CurrencySelector");

  function AmountProbe() {
    const { formatAmount } = useCurrency();
    return <span data-testid="amount">{formatAmount(140)}</span>;
  }

  return render(
    <CurrencyProvider>
      <CurrencySelector />
      <AmountProbe />
    </CurrencyProvider>,
  );
}

beforeEach(() => {
  fetchExchangeRates.mockReset();
});

afterEach(() => {
  cleanup();
});

describe("CurrencySelector — fallback y reintento cuando er-api falla (ADR-004)", () => {
  it("EUR intacto, aviso visible, reintento sin recarga y estado de carga en ese mismo aviso", async () => {
    fetchExchangeRates.mockRejectedValueOnce(new Error("er-api respondió 503"));
    await freshRender();

    // 1) Falla la primera carga: la app sigue en pie, mostrando EUR (req. 1) y el
    //    aviso es texto visible, no solo un tooltip (req. 2).
    await waitFor(() => {
      expect(screen.getByText("Sin tipos de cambio, mostrando EUR")).toBeDefined();
    });
    expect(screen.getByTestId("amount").textContent).toBe(EUR_140);
    const select = screen.getByRole("combobox", { name: "Divisa" });
    expect(select.hasAttribute("disabled")).toBe(true);

    // 2) El botón de reintento vuelve a llamar al fetch (sin recargar la
    //    página: seguimos en el mismo render de React) — req. 3.
    let resolveRetry: (rates: Record<string, number>) => void = () => {};
    fetchExchangeRates.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRetry = resolve;
        }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    // 3) Mientras el reintento está en vuelo, el propio aviso pasa a un estado
    //    de carga breve —no desaparece ni bloquea la pantalla— (req. 4).
    await waitFor(() => {
      expect(screen.getByText("Reintentando…")).toBeDefined();
    });
    expect(screen.queryByText("Sin tipos de cambio, mostrando EUR")).toBeNull();
    expect(screen.queryByRole("button", { name: "Reintentar" })).toBeNull();
    expect(screen.getByTestId("amount").textContent).toBe(EUR_140); // sigue en EUR

    // 4) Si el reintento tiene éxito, el aviso se retira y el selector se activa.
    resolveRetry({ USD: 1.1 });
    await waitFor(() => {
      expect(screen.queryByText("Reintentando…")).toBeNull();
    });
    expect(screen.queryByText("Sin tipos de cambio, mostrando EUR")).toBeNull();
    expect(select.hasAttribute("disabled")).toBe(false);
  });

  it("un reintento que vuelve a fallar devuelve el aviso de error, no lo deja en carga", async () => {
    fetchExchangeRates.mockRejectedValueOnce(new Error("timeout"));
    await freshRender();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reintentar" })).toBeDefined();
    });

    fetchExchangeRates.mockRejectedValueOnce(new Error("timeout otra vez"));
    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => {
      expect(screen.getByText("Sin tipos de cambio, mostrando EUR")).toBeDefined();
    });
    expect(screen.queryByText("Reintentando…")).toBeNull();
  });
});
