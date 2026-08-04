const DEFILLAMA_BASE_URL = "https://api.llama.fi";

export type FeesDataType =
  | "dailyRevenue"
  | "dailyHoldersRevenue"
  /** Partea care merge către furnizorii de lichiditate, stakeri, mineri. */
  | "dailySupplySideRevenue";

/**
 * Explicația DefiLlama pentru ce înseamnă fiecare categorie la protocolul
 * respectiv. Diferă de la un protocol la altul și e singura sursă care spune
 * concret unde se duc banii — de aceea o afișăm ca atare, citată.
 */
export interface DefiLlamaMethodology {
  Fees?: string;
  UserFees?: string;
  Revenue?: string;
  ProtocolRevenue?: string;
  HoldersRevenue?: string;
  SupplySideRevenue?: string;
}

export interface DefiLlamaProtocolListItem {
  name: string;
  slug: string;
  symbol: string | null;
  category: string | null;
  chains: string[];
  tvl: number | null;
  mcap: number | null;
  /** ex. "parent#uniswap" pentru Uniswap V3 — null pentru protocoale de sine stătătoare. */
  parentProtocol: string | null;
  /** Id-ul CoinGecko, pentru capitalizare și FDV. */
  geckoId: string | null;
  /** Timestamp unix (secunde) — de când e urmărit de DefiLlama. */
  listedAt: number | null;
}

/** Token-ul nativ al unui lanț (Ethereum → ETH), din `/config`. */
export interface DefiLlamaChainToken {
  geckoId: string | null;
  symbol: string | null;
}

/** Proiectul-umbrelă sub care stau mai multe versiuni (Uniswap ← V2, V3, V4). */
export interface DefiLlamaParentProtocol {
  /** ex. "parent#uniswap" */
  id: string;
  name: string;
  symbol: string | null;
  geckoId: string | null;
}

export interface DefiLlamaFeesOverviewItem {
  name: string;
  slug: string;
  /**
   * Valoarea pe 24h corespunzătoare parametrului `dataType` cerut:
   * fără dataType → total fees plătite de utilizatori
   * dailyRevenue → venit reținut de protocol
   * dailyHoldersRevenue → venit care ajunge efectiv la deținătorii de token
   */
  total24h: number | null;
  total7d: number | null;
  total30d: number | null;
  /** Venitul pe 24h anualizat pe baza ultimului an — folosit pentru P/S. */
  annualized1y: number | null;
  /** Vine în răspunsul în bloc, deci nu costă o cerere în plus. */
  methodology: DefiLlamaMethodology | null;
  /**
   * "chain" pentru lanțuri, "protocol" pentru restul. Singurul mod de a
   * recunoaște lanțurile care apar DOAR aici — 173 dintre ele, printre care
   * Cosmos, ICP, Cardano, Polkadot — fiindcă lipsesc din `/protocols`.
   */
  protocolType: string | null;
}

async function fetchJson<T>(url: string): Promise<T> {
  // Chiar și îngustate, răspunsurile depășesc limita de 2 MB a cache-ului de
  // fetch din Next.js. Cache-uim rezultatul prelucrat, nu răspunsul brut —
  // vezi unstable_cache în protocols-cached.ts.
  const res = await fetch(url, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(
      `DefiLlama a răspuns cu eroare la ${url}: ${res.status} ${res.statusText}`
    );
  }

  return (await res.json()) as T;
}

/** GET /protocols — TVL, mcap, categorie, chain-uri pentru toate protocoalele. */
export async function fetchProtocols(): Promise<DefiLlamaProtocolListItem[]> {
  const raw = await fetchJson<
    Array<{
      name: string;
      slug: string;
      symbol?: string | null;
      category?: string | null;
      chains?: string[];
      tvl?: number | null;
      mcap?: number | null;
      parentProtocol?: string | null;
      gecko_id?: string | null;
      listedAt?: number | null;
    }>
  >(`${DEFILLAMA_BASE_URL}/protocols`);

  return raw.map((p) => ({
    name: p.name,
    slug: p.slug,
    // DefiLlama pune "-" la protocoalele fără token public (Tether, Circle,
    // Polymarket). Normalizăm la null ca absența să fie verificabilă în cod,
    // nu un șir magic răspândit prin interfață.
    symbol: p.symbol && p.symbol !== "-" ? p.symbol : null,
    category: p.category ?? null,
    chains: p.chains ?? [],
    tvl: p.tvl ?? null,
    mcap: p.mcap ?? null,
    parentProtocol: p.parentProtocol ?? null,
    geckoId: p.gecko_id ?? null,
    listedAt: p.listedAt ?? null,
  }));
}

/**
 * GET /config — între altele, lista completă a proiectelor-umbrelă (800),
 * într-o singură cerere. Necesară pentru a arăta „Uniswap", nu „Uniswap V2",
 * „Uniswap V3" și „Uniswap V4" ca trei proiecte separate.
 */
export async function fetchConfig(): Promise<{
  parents: DefiLlamaParentProtocol[];
  /** Cheia e numele exact al lanțului, așa cum îl scrie DefiLlama. */
  chainTokens: Map<string, DefiLlamaChainToken>;
}> {
  const raw = await fetchJson<{
    parentProtocols?: Array<{
      id: string;
      name: string;
      symbol?: string | null;
      gecko_id?: string | null;
    }>;
    chainCoingeckoIds?: Record<
      string,
      { geckoId?: string | null; symbol?: string | null }
    >;
  }>(`${DEFILLAMA_BASE_URL}/config`);

  const parents = (raw.parentProtocols ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    // DefiLlama pune "-" pentru proiectele fără token propriu.
    symbol: p.symbol && p.symbol !== "-" ? p.symbol : null,
    geckoId: p.gecko_id ?? null,
  }));

  const chainTokens = new Map<string, DefiLlamaChainToken>();
  for (const [chainName, entry] of Object.entries(raw.chainCoingeckoIds ?? {})) {
    if (!entry?.geckoId) continue;
    chainTokens.set(chainName, {
      geckoId: entry.geckoId,
      symbol: entry.symbol && entry.symbol !== "-" ? entry.symbol : null,
    });
  }

  return { parents, chainTokens };
}

/**
 * Excludem graficele istorice complete, pe care nu le folosim niciodată.
 *
 * Nu e o optimizare cosmetică: fără ele, un singur răspuns trece de 23 MB, iar
 * cele patru apeluri însumau peste 85 MB descărcați și parsați la fiecare
 * randare necache-uită. Pe Vercel asta depășea timpul maxim al funcției, deci
 * paginile de proiect nu se mai încărcau deloc — click-ul părea că nu face
 * nimic. Cu excluderea, același răspuns are 3,6 MB și vine de opt ori mai
 * repede, cu valorile identice (verificat câmp cu câmp, inclusiv methodology).
 */
const EXCLUDE_CHARTS =
  "excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true";

/**
 * GET /overview/fees — fee-uri / venit / venit-pentru-deținători pentru
 * toate protocoalele dintr-o singură cerere, în funcție de `dataType`.
 *
 * ⚠️ Numele parametrului pentru holders revenue a fost verificat manual
 * (2026-08-01) contra API-ului live: `dataType=dailyHoldersRevenue` e corect.
 */
export async function fetchFeesOverview(
  dataType?: FeesDataType
): Promise<DefiLlamaFeesOverviewItem[]> {
  const query = dataType
    ? `?dataType=${dataType}&${EXCLUDE_CHARTS}`
    : `?${EXCLUDE_CHARTS}`;
  const raw = await fetchJson<{
    protocols: Array<{
      name: string;
      slug: string;
      total24h?: number | null;
      total7d?: number | null;
      total30d?: number | null;
      annualized1y?: number | null;
      methodology?: DefiLlamaMethodology | null;
      protocolType?: string | null;
    }>;
  }>(`${DEFILLAMA_BASE_URL}/overview/fees${query}`);

  return raw.protocols.map((p) => ({
    name: p.name,
    slug: p.slug,
    total24h: p.total24h ?? null,
    total7d: p.total7d ?? null,
    total30d: p.total30d ?? null,
    annualized1y: p.annualized1y ?? null,
    methodology: p.methodology ?? null,
    protocolType: p.protocolType ?? null,
  }));
}
