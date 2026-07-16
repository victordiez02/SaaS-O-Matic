import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Card } from "./ui/card";

/** Caja centrada de filete discontinuo para los estados en los que no hay datos que enseñar */
export default function StatePanel({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description?: string;
  className?: string;
  /** Acciones (CTA, botón de reintento) o detalle extra bajo la descripción. */
  children?: ReactNode;
}) {
  return (
    <Card
      className={cn(
        "items-center gap-2 border border-dashed border-border px-6 py-14 text-center ring-0",
        className,
      )}
    >
      <h2 className="m-0 text-[1.0625rem] font-bold tracking-[-0.02em]">
        {title}
      </h2>
      {description && (
        <p className="m-0 max-w-[42ch] text-sm leading-normal text-muted-foreground">
          {description}
        </p>
      )}
      {children}
    </Card>
  );
}
