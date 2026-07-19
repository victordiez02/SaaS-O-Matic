// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Customer, Simulation } from "../api/types";
import { CurrencyProvider } from "../context/CurrencyContext";
import SimulationForm from "./SimulationForm";

// La API se sustituye por completo: aquí no se prueba la red, sino qué pinta el
// formulario cuando el backend contesta una cifra distinta a la proyectada.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { createSimulation } = vi.hoisted(() => ({ createSimulation: vi.fn() }));
vi.mock("../api/simulations", () => ({ createSimulation }));

// Sin esto, el proveedor de divisa saldría a er-api de verdad desde el test.
vi.mock("../api/exchangeRates", () => ({
  fetchExchangeRates: () => Promise.resolve({ USD: 1.1 }),
}));

const CUSTOMER: Customer = {
  id: 1,
  company_name: "Acme Ibérica S.L.",
  tax_id: "B12345674",
  email: "cfo@acme-iberica.es",
  country: "ES", // 21 %: 15 usuarios → 140,00 + 29,40 = 169,40
  plan: "pro",
  created_at: "2026-07-16T10:30:00.123456Z",
};

/** Respuesta del backend con el total que se le pida (el resto, coherente). */
function backendSimulation(totalCost: string): Simulation {
  return {
    id: 7,
    customer_id: 1,
    active_users: 15,
    storage_gb: 0,
    api_calls: 0,
    base_cost: "140.00",
    tax_rate: "0.21",
    tax_amount: "29.40",
    total_cost: totalCost,
    currency: "EUR",
    created_at: "2026-07-16T10:35:00.123456Z",
  };
}

const renderForm = () =>
  render(
    <CurrencyProvider>
      <SimulationForm customer={CUSTOMER} />
    </CurrencyProvider>,
  );

const AVISO = "Importe ajustado al cálculo del backend.";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SimulationForm — el backend manda sobre la proyección (ADR-006)", () => {
  it("parte de la proyección del cliente: 15 usuarios en ES → 169,40 €", () => {
    renderForm();
    expect(screen.getByText("Proyección mensual")).toBeDefined();
    expect(screen.getByText("169,40 €")).toBeDefined();
  });

  it("avisa cuando el total del backend NO coincide con el proyectado", async () => {
    // El backend devuelve 175,00 € donde el cliente proyectaba 169,40 €.
    createSimulation.mockResolvedValue(backendSimulation("175.00"));
    renderForm();

    expect(screen.queryByText(AVISO)).toBeNull(); // aún no se ha guardado
    fireEvent.click(
      screen.getByRole("button", { name: /guardar simulación/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Simulación guardada")).toBeDefined();
    });
    // Manda el backend: se ve su cifra, no la proyectada.
    expect(screen.getByText("175,00 €")).toBeDefined();
    expect(screen.queryByText("169,40 €")).toBeNull();
    expect(screen.getByText(AVISO)).toBeDefined();
  });

  it("no avisa cuando coinciden: no hay nada que explicar", async () => {
    createSimulation.mockResolvedValue(backendSimulation("169.40"));
    renderForm();

    fireEvent.click(
      screen.getByRole("button", { name: /guardar simulación/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Simulación guardada")).toBeDefined();
    });
    expect(screen.getByText("169,40 €")).toBeDefined();
    expect(screen.queryByText(AVISO)).toBeNull();
  });

  it("al retocar el slider, lo guardado vuelve a ser una proyección", async () => {
    createSimulation.mockResolvedValue(backendSimulation("175.00"));
    renderForm();

    fireEvent.click(
      screen.getByRole("button", { name: /guardar simulación/i }),
    );
    await waitFor(() => {
      expect(screen.getByText("Simulación guardada")).toBeDefined();
    });

    // Por rol: "Usuarios activos" etiqueta a dos controles sincronizados —el
    // campo numérico y el slider— y aquí se teclea en el primero.
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Usuarios activos" }),
      {
        target: { value: "20" },
      },
    );

    // Una cifra etiquetada como guardada que ya no corresponde a los controles
    // sería mentira: vuelve la proyección, y con ella el aviso desaparece.
    expect(screen.getByText("Proyección mensual")).toBeDefined();
    expect(screen.getByText("217,80 €")).toBeDefined();
    expect(screen.queryByText(AVISO)).toBeNull();
  });
});
