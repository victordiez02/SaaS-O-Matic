import { useCallback, useEffect, useState } from "react";

import { fetchExchangeRates, type ExchangeRates } from "../api/exchangeRates";

// Caché a nivel de módulo: los tipos se piden UNA sola vez por sesión de
// navegador y se comparten entre todos los componentes que usen el hook
let cachedRates: ExchangeRates | null = null;
let inFlight: Promise<ExchangeRates> | null = null;

function loadRates(): Promise<ExchangeRates> {
  if (cachedRates) return Promise.resolve(cachedRates);
  if (!inFlight) {
    inFlight = fetchExchangeRates()
      .then((rates) => {
        cachedRates = rates;
        return rates;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export interface UseExchangeRates {
  rates: ExchangeRates | null; // base EUR, o `null` mientras cargan o si falló la petición
  loading: boolean;
  error: string | null;
  convert: (amountEUR: number, currency: string) => number; // EUR a la divisa pedida
}

export function useExchangeRates(): UseExchangeRates {
  const [rates, setRates] = useState<ExchangeRates | null>(cachedRates);
  const [loading, setLoading] = useState(cachedRates === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedRates) return;
    let cancelled = false;
    loadRates()
      .then((loaded) => {
        if (!cancelled) setRates(loaded);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudieron cargar los tipos de cambio",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const convert = useCallback(
    (amountEUR: number, currency: string): number => {
      if (currency === "EUR") return amountEUR;
      const rate = rates?.[currency];
      return rate === undefined ? amountEUR : amountEUR * rate;
    },
    [rates],
  );

  return { rates, loading, error, convert };
}
