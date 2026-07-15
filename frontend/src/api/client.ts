// Único lugar del frontend donde se hacen llamadas HTTP (regla de arquitectura).

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'
// Los endpoints de negocio viven bajo /api/v1 (ver spec 02-contrato-api.md);
// el health de liveness queda en /api/health.
const API_V1 = `${BASE_URL}/v1`

export interface HealthResponse {
  status: string
  service: string
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/health`)
  if (!res.ok) throw new Error(`El backend respondió ${res.status}`)
  return res.json()
}

// --- Clientes -------------------------------------------------------------

export type Plan = 'basic' | 'pro' | 'enterprise'

export interface CustomerCreate {
  company_name: string
  tax_id: string
  email: string
  country: string
  plan: Plan
}

export interface Customer extends CustomerCreate {
  id: number
  created_at: string
}

// Error de la API en el formato unificado {detail, code} de CLAUDE.md.
export class ApiError extends Error {
  code: string
  constructor(detail: string, code: string) {
    super(detail)
    this.code = code
  }
}

async function parseError(res: Response): Promise<never> {
  let detail = `El backend respondió ${res.status}`
  let code = 'UNKNOWN'
  try {
    const body = await res.json()
    if (body?.detail) detail = body.detail
    if (body?.code) code = body.code
  } catch {
    // respuesta sin cuerpo JSON: nos quedamos con el mensaje por defecto
  }
  throw new ApiError(detail, code)
}

export async function createCustomer(data: CustomerCreate): Promise<Customer> {
  const res = await fetch(`${API_V1}/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) return parseError(res)
  return res.json()
}

export async function listCustomers(): Promise<Customer[]> {
  const res = await fetch(`${API_V1}/customers`)
  if (!res.ok) return parseError(res)
  return res.json()
}
