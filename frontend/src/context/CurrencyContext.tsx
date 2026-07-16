import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useExchangeRates } from "../hooks/useExchangeRates";
import { formatMoney } from "../utils/format";

/** Divisas ofrecidas (spec 04). Ampliable: cualquiera que devuelva er-api. */
export const CURRENCIES = ["EUR", "USD", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export type RatesStatus = "loading" | "error" | "success";

interface CurrencyContextValue {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  convert: (amountEUR: number, currency: string) => number;
  formatAmount: (amountEUR: string | number) => string;
  status: RatesStatus;
  error: string | null;
  retry: () => void;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

/** Estado de divisa compartido por toda la app */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Currency>("EUR");
  const { loading, error, convert, retry } = useExchangeRates();

  const status: RatesStatus = loading ? "loading" : error ? "error" : "success";

  const currency: Currency = status === "success" ? selected : "EUR";

  const formatAmount = useCallback(
    (amountEUR: string | number) =>
      formatMoney(convert(Number(amountEUR), currency), currency),
    [convert, currency],
  );

  const value = useMemo(
    () => ({
      currency,
      setCurrency: setSelected,
      convert,
      formatAmount,
      status,
      error,
      retry,
    }),
    [currency, convert, formatAmount, status, error, retry],
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency debe usarse dentro de <CurrencyProvider>");
  }
  return context;
}
