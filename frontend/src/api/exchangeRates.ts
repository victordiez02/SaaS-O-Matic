// Tipos de cambio de er-api (spec 04).
const ER_API_URL = "https://open.er-api.com/v6/latest/EUR";

/** Tipos de cambio con EUR como base: `{ USD: 1.09, GBP: 0.85, ... }`. */
export type ExchangeRates = Record<string, number>;

interface ErApiResponse {
  result?: string;
  rates?: ExchangeRates;
}

export async function fetchExchangeRates(): Promise<ExchangeRates> {
  const res = await fetch(ER_API_URL);
  if (!res.ok) throw new Error(`er-api respondió ${res.status}`);
  const body: ErApiResponse = await res.json();
  if (body.result !== "success" || !body.rates) {
    throw new Error("Respuesta inesperada de er-api");
  }
  return body.rates;
}
