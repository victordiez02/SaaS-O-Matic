import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "saas-o-matic-theme";

// index.html ya fija data-theme en <html> antes de pintar (evita el flash);
// aquí solo leemos ese valor como estado inicial.
function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export interface UseTheme {
  theme: Theme;
  toggle: () => void;
}

export function useTheme(): UseTheme {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return { theme, toggle };
}
