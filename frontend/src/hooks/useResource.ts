import { useCallback, useEffect, useState } from "react";

export type ResourceStatus = "loading" | "error" | "success";

export interface Resource<T> {
  data: T | null;
  status: ResourceStatus;
  error: unknown;
  retry: () => void;
}

/** Carga un recurso de la API con los tres estados de red */
export function useResource<A, T>(
  load: (arg: A) => Promise<T>,
  arg: A,
): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [status, setStatus] = useState<ResourceStatus>("loading");
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setError(null);

    load(arg)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err);
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [load, arg, attempt]);

  return { data, status, error, retry };
}
