import { splitMatch } from "../utils/highlight";

/** Muestra un texto resaltando el fragmento que coincide con la búsqueda. */
export default function Highlighted({
  text,
  term,
}: {
  text: string;
  term: string;
}) {
  const parts = splitMatch(text, term);
  if (!parts) return <>{text}</>;

  return (
    <>
      {parts.before}
      <mark className="rounded-sm bg-destructive/10 px-[0.1em] font-bold text-destructive">
        {parts.match}
      </mark>
      {parts.after}
    </>
  );
}
