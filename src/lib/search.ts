import type { ProtocolCatalogEntry } from "./protocols";

const DIACRITICS_PATTERN = new RegExp("[\\u0300-\\u036f]", "g");

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITICS_PATTERN, "")
    .toLowerCase()
    .trim();
}

/**
 * Căutare pe nume/simbol/slug (regula pasul 5, Faza 2): potrivire exactă >
 * începe cu > conține, cu tie-break pe TVL. Nu e Levenshtein complet, dar
 * acoperă tastarea normală a unui nume de proiect.
 */
export function searchProtocols(
  query: string,
  protocols: ProtocolCatalogEntry[],
  limit = 8
): ProtocolCatalogEntry[] {
  const q = normalize(query);
  if (!q) return [];

  const scored: Array<{ protocol: ProtocolCatalogEntry; score: number }> = [];

  for (const protocol of protocols) {
    const name = normalize(protocol.name);
    const symbol = protocol.symbol ? normalize(protocol.symbol) : "";
    const slug = normalize(protocol.slug);

    let score = -1;
    if (name === q || symbol === q || slug === q) score = 100;
    else if (name.startsWith(q) || slug.startsWith(q)) score = 80;
    else if (symbol.startsWith(q)) score = 70;
    else if (name.includes(q) || slug.includes(q)) score = 50;
    else if (symbol.includes(q)) score = 40;

    if (score >= 0) scored.push({ protocol, score });
  }

  scored.sort(
    (a, b) => b.score - a.score || (b.protocol.tvl ?? 0) - (a.protocol.tvl ?? 0)
  );

  return scored.slice(0, limit).map((m) => m.protocol);
}
