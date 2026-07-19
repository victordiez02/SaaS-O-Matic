import { useCallback, useEffect, useRef, useState } from "react";

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

export type RatesStatus = "loading" | "retrying" | "error" | "success";

export interface UseExchangeRates {
  rates: ExchangeRates | null; // base EUR, o `null` mientras cargan o si falló la petición
  status: RatesStatus;
  error: string | null;
  convert: (amountEUR: number, currency: string) => number; // EUR a la divisa pedida
  retry: () => void;
}

export function useExchangeRates(): UseExchangeRates {
  const [rates, setRates] = useState<ExchangeRates | null>(cachedRates);
  const [loading, setLoading] = useState(cachedRates === null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const hasFailedBeforeRef = useRef(false);

  useEffect(() => {
    if (cachedRates) {
      setRates(cachedRates);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadRates()
      .then((loaded) => {
        if (cancelled) return;
        setRates(loaded);
        setError(null);
        hasFailedBeforeRef.current = false;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los tipos de cambio",
        );
        hasFailedBeforeRef.current = true;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Vuelve a pedir los tipos tras un fallo: invalida la caché y relanza el efecto
  const retry = useCallback(() => {
    cachedRates = null;
    inFlight = null;
    setAttempt((n) => n + 1);
  }, []);

  const convert = useCallback(
    (amountEUR: number, currency: string): number => {
      if (currency === "EUR") return amountEUR;
      const rate = rates?.[currency];
      return rate === undefined ? amountEUR : amountEUR * rate;
    },
    [rates],
  );

  const status: RatesStatus = loading
    ? hasFailedBeforeRef.current
      ? "retrying"
      : "loading"
    : error
      ? "error"
      : "success";

  return { rates, status, error, convert, retry };
}
