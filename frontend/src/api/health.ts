// Liveness del backend. Vive en /api/health, fuera del prefijo /api/v1 de negocio.

import { API_BASE, get } from './client'

export interface HealthResponse {
  status: string
  service: string
}

export function fetchHealth(): Promise<HealthResponse> {
  return get<HealthResponse>(`${API_BASE}/health`)
}
