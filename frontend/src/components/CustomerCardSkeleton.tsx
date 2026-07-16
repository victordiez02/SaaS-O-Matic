import { Card } from "./ui/card";
import { Skeleton } from "./ui/skeleton";

/** Hueco de ficha mientras carga el índice: misma caja, sin spinner bloqueante. */
export default function CustomerCardSkeleton() {
  return (
    <Card
      className="h-full gap-2.5 border border-border px-[1.2rem] py-[1.1rem] ring-0"
      aria-hidden="true"
    >
      <Skeleton className="h-2.5 w-[45%] rounded-sm" />
      <Skeleton className="h-3.5 w-4/5 rounded-sm" />
      <Skeleton className="h-2.5 w-[65%] rounded-sm" />
      <Skeleton className="mt-2.5 h-2.5 w-1/4 rounded-sm" />
    </Card>
  );
}
