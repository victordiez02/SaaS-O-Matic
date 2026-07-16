// Tipos de cambio de er-api (spec 04).
const ER_API_URL = "https://open.er-api.com/v6/latest/EUR";

const TIMEOUT_MS = 5000;

/** Tipos de cambio con EUR como base: `{ USD: 1.09, GBP: 0.85, ... }`. */
export type ExchangeRates = Record<string, number>;

interface ErApiResponse {
  result?: string;
  rates?: ExchangeRates;
}

export async function fetchExchangeRates(): Promise<ExchangeRates> {
  let res: Response;
  try {
    res = await fetch(ER_API_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new Error(`er-api no respondió en ${TIMEOUT_MS / 1000} s`);
    }
    throw err;
  }
  if (!res.ok) throw new Error(`er-api respondió ${res.status}`);
  const body: ErApiResponse = await res.json();
  if (body.result !== "success" || !body.rates) {
    throw new Error("Respuesta inesperada de er-api");
  }
  return body.rates;
}
