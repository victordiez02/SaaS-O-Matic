import { Moon, Sun } from "lucide-react";

import { useTheme } from "../hooks/useTheme";
import { Button } from "./ui/button";

/** Botón de cabecera para alternar entre el registro claro y el de noche. */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo claro" : "Modo oscuro"}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
