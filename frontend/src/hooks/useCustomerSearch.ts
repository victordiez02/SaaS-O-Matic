import { useCallback, useEffect, useState } from "react";

import { searchCustomers } from "../api/customers";
import type { Customer } from "../api/types";

// Espera antes de llamar a la API mientras se teclea (spec 04: ~300 ms).
const DEBOUNCE_MS = 350;

export type SearchStatus = "loading" | "error" | "success";

export interface UseCustomerSearch {
  customers: Customer[];
  total: number;
  status: SearchStatus;
  error: string | null;
  retry: () => void;
}

/**
 * Buscador del índice con debounce y estados explícitos de red.
 * `term` vacío → listado completo (spec 02: sin `search` devuelve todos).
 */
export function useCustomerSearch(term: string): UseCustomerSearch {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<SearchStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);

    // Sin término no hay nada que "acabar de teclear": la carga inicial y el
    // borrado del campo van directos; solo se debouncea la escritura.
    const timer = setTimeout(
      () => {
        searchCustomers(term)
          .then((data) => {
            if (cancelled) return;
            setCustomers(data.items);
            setTotal(data.total);
            setStatus("success");
          })
          .catch((err: unknown) => {
            if (cancelled) return;
            setError(
              err instanceof Error
                ? err.message
                : "No se pudo consultar el índice",
            );
            setStatus("error");
          });
      },
      term ? DEBOUNCE_MS : 0,
    );

    // Cancela el temporizador y descarta la respuesta en vuelo: la última
    // pulsación manda, aunque una petición anterior conteste más tarde.
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, attempt]);

  return { customers, total, status, error, retry };
}
