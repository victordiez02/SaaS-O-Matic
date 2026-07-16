import { Link, Outlet } from "react-router-dom";

import CurrencySelector from "./components/CurrencySelector";
import ThemeToggle from "./components/ThemeToggle";
import { Button } from "./components/ui/button";
import { CurrencyProvider } from "./context/CurrencyContext";

/** Shell de la aplicación: cabecera del registro + la vista de la ruta activa. */
export default function App() {
  return (
    <CurrencyProvider>
      <div className="grid min-h-screen grid-rows-[auto_1fr]">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-[clamp(1rem,5vw,3rem)] py-[1.1rem] transition-colors">
          <Link to="/" className="grid gap-0.5 text-inherit no-underline">
            <span className="text-[0.9375rem] font-bold tracking-[0.02em] uppercase">
              SaaS-O-Matic
            </span>
            <span className="text-[0.6875rem] font-medium tracking-[0.06em] text-muted-foreground uppercase">
              Índice de clientes
            </span>
          </Link>
          <div className="flex items-center gap-2.5">
            <CurrencySelector />
            <ThemeToggle />
            <Button asChild size="lg">
              <Link to="/customers/new">Nuevo cliente</Link>
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[68rem] px-[clamp(1rem,5vw,3rem)] pt-[clamp(1.5rem,4vw,2.5rem)] pb-16">
          <Outlet />
        </main>
      </div>
    </CurrencyProvider>
  );
}
