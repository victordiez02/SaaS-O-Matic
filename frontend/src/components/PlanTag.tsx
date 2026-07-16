import { cn } from "@/lib/utils";
import type { Plan } from "../api/types";

/** Plan contratado, en mono y versales */
export default function PlanTag({
  plan,
  className,
}: {
  plan: Plan;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[0.6875rem] font-medium tracking-[0.08em] text-muted-foreground uppercase",
        className,
      )}
    >
      {plan}
    </span>
  );
}
