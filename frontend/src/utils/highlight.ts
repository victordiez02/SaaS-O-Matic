export interface MatchParts {
  before: string;
  match: string;
  after: string;
}

/**
 * Parte un texto por la primera coincidencia del término, para resaltar por qué
 * una ficha ha entrado en los resultados. Sin coincidencia → `null`.
 */
export function splitMatch(text: string, term: string): MatchParts | null {
  const needle = term.trim();
  if (!needle) return null;

  const index = text.toLowerCase().indexOf(needle.toLowerCase());
  if (index === -1) return null;

  return {
    before: text.slice(0, index),
    match: text.slice(index, index + needle.length),
    after: text.slice(index + needle.length),
  };
}
