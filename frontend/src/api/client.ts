// Núcleo del cliente HTTP
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

/** Liveness del backend. */
export const API_BASE = BASE_URL;
/** Endpoints de negocio (spec 02). Sin barra final: `/customers/` responde 307. */
export const API_V1 = `${BASE_URL}/v1`;

/** Error de validación por campo que acompaña a los 422 `VALIDATION_ERROR`. */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Error de la API en el formato unificado `{detail, code}`
 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly errors: FieldError[];

  constructor(
    detail: string,
    code: string,
    status: number,
    errors: FieldError[] = [],
  ) {
    super(detail);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.errors = errors;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  let detail = `El backend respondió ${res.status}`;
  let code = "UNKNOWN";
  let errors: FieldError[] = [];
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") detail = body.detail;
    if (typeof body?.code === "string") code = body.code;
    if (Array.isArray(body?.errors)) errors = body.errors;
  } catch {
    // Respuesta sin cuerpo JSON (p. ej. un 502 del proxy): vale el mensaje por defecto.
  }
  return new ApiError(detail, code, res.status, errors);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) throw await toApiError(res);
  return res.json() as Promise<T>;
}

export function get<T>(path: string): Promise<T> {
  return request<T>(path);
}

export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
