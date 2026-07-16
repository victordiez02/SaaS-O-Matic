// Endpoint de simulaciones (spec 02-contrato-api.md).

import { API_V1, post } from "./client";
import type { Simulation, SimulationCreate } from "./types";

/**
 * Crea y persiste una simulación. El cliente HTTP nunca envía importes.
 */
export function createSimulation(data: SimulationCreate): Promise<Simulation> {
  return post<Simulation>(`${API_V1}/simulations`, data);
}
