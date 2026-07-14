// Único lugar del frontend donde se hacen llamadas HTTP (regla de arquitectura).

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export interface HealthResponse {
  status: string
  service: string
  database: string
}

export interface PingResponse {
  message: string
  total_pings: number
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BASE_URL}/health`)
  if (!res.ok) throw new Error(`El backend respondió ${res.status}`)
  return res.json()
}

export async function fetchPing(): Promise<PingResponse> {
  const res = await fetch(`${BASE_URL}/ping`)
  if (!res.ok) throw new Error(`El backend respondió ${res.status}`)
  return res.json()
}
