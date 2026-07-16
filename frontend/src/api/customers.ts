// Endpoints de clientes (spec 02-contrato-api.md).

import { API_V1, get, post } from "./client";
import type {
  Customer,
  CustomerCreate,
  CustomerList,
  SimulationList,
} from "./types";

/** Alta de cliente. Errores: 422 INVALID_TAX_ID/VALIDATION_ERROR, 409 TAX_ID_ALREADY_EXISTS. */
export function createCustomer(data: CustomerCreate): Promise<Customer> {
  return post<Customer>(`${API_V1}/customers`, data);
}

/**
 * Buscador por nombre de empresa o identificador fiscal (parcial, insensible a  mayúsculas y acentos).
 */
export function searchCustomers(search?: string): Promise<CustomerList> {
  const term = search?.trim();
  const query = term ? `?${new URLSearchParams({ search: term })}` : "";
  return get<CustomerList>(`${API_V1}/customers${query}`);
}

/** Detalle de cliente. Error: 404 CUSTOMER_NOT_FOUND. */
export function getCustomer(id: number): Promise<Customer> {
  return get<Customer>(`${API_V1}/customers/${id}`);
}

/**
 * Historial de simulaciones del cliente, de más reciente a más antigua.
 * Error: 404 CUSTOMER_NOT_FOUND (cliente sin simulaciones → `items: []`).
 */
export function listCustomerSimulations(
  customerId: number,
): Promise<SimulationList> {
  return get<SimulationList>(`${API_V1}/customers/${customerId}/simulations`);
}
