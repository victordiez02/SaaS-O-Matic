// Tipos del contrato de la API (spec 02-contrato-api.md), verificados contra las
// respuestas reales del backend antes de escribirlos.

export type Plan = "basic" | "pro" | "enterprise";

export interface CustomerCreate {
  company_name: string;
  tax_id: string;
  email: string;
  /** Código de país ISO 3166-1 alpha-2. El backend lo devuelve en mayúsculas. */
  country: string;
  plan: Plan;
}

export interface Customer extends CustomerCreate {
  id: number;
  /** ISO 8601 en UTC con sufijo Z y microsegundos: "2026-07-16T14:50:07.698254Z". */
  created_at: string;
}

export interface SimulationCreate {
  customer_id: number;
  active_users: number;
  storage_gb: number;
  api_calls: number;
}

export interface Simulation extends SimulationCreate {
  id: number;
  base_cost: string; // string decimal
  tax_rate: string;
  tax_amount: string;
  total_cost: string;
  currency: string;
  created_at: string;
}

/** Sobre de las respuestas de lista (spec 02): `{items, total}`. */
export interface ListResponse<T> {
  items: T[];
  total: number;
}

export type CustomerList = ListResponse<Customer>;
export type SimulationList = ListResponse<Simulation>;
