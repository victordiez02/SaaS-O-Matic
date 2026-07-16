import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

/** Enlace de vuelta al índice, compartido por las páginas hijas del registro. */
export default function BackLink() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-1 text-[0.8125rem] text-muted-foreground no-underline hover:text-destructive"
    >
      <ArrowLeft className="size-3.5" />
      Volver al índice
    </Link>
  );
}
