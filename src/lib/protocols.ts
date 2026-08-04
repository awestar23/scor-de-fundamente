import {
  fetchConfig,
  fetchFeesOverview,
  fetchProtocols,
  type DefiLlamaFeesOverviewItem,
  type DefiLlamaProtocolListItem,
} from "./defillama";
import { fetchMarkets } from "./coingecko";

export interface ProtocolFinancials {
  slug: string;
  name: string;
  symbol: string | null;
  category: string | null;
  primaryChain: string | null;
  tvl: number | null;
  /** Capitalizare de piață — CoinGecko dacă există, altfel DefiLlama. */
  mcap: number | null;
  /** Valoare complet diluată (CoinGecko) — capitalizarea la supply integral. */
  fdv: number | null;
  /** Timestamp unix (secunde): de când e urmărit de DefiLlama. */
  listedAt: number | null;
  // Atenție la dimensiune: acest obiect se memorează întreg prin
  // `unstable_cache`, care refuză tăcut orice depășește 2 MB. Când a depășit,
  // cache-ul a încetat să funcționeze fără niciun mesaj, fiecare cerere a
  // reînceput să recalculeze tot universul, iar paginile de proiect au încetat
  // să se mai încarce. Ține doar ce se afișează; restul stă în RawProtocolRow.
  // Testul din tests/cache-size.test.ts păzește limita.

  /** Total fee-uri plătite de utilizatori (regula 3.4: fees ≠ revenue). */
  fees30d: number | null;
  /** Venit reținut de protocol. */
  revenue7d: number | null;
  revenue30d: number | null;
  /** Venitul ultimului an, raportat de DefiLlama — pentru P/S. */
  revenueAnnualized: number | null;
  /** Venit care ajunge efectiv la deținătorii de token (passthrough real). */
  holdersRevenue30d: number | null;
  /**
   * Partea din comisioane care merge către cei care aduc lichiditate sau
   * capital (stakeri, LP-uri, mineri) — nu către protocol și nu către
   * deținătorii de token. La Ethena e aproape tot: 13,89 M$ din 13,92 M$.
   */
  supplySideRevenue30d: number | null;
  /**
   * Doar propoziția pe care o afișăm din metodologia DefiLlama, nu obiectul
   * întreg: păstrat integral pentru toate cele 2000+ de proiecte ocupa 0,66 MB
   * — o treime din bugetul de cache — pentru un text arătat pe o singură
   * pagină, câte unul o dată.
   */
  supplySideExplanation: string | null;
  /**
   * Versiunile însumate în această intrare (ex. Uniswap V2, V3, V4).
   * Gol pentru proiectele fără versiuni separate.
   */
  components: string[];
}

/** Intrare subțire pentru catalogul complet — căutare + verificare existență. */
export interface ProtocolCatalogEntry {
  slug: string;
  name: string;
  symbol: string | null;
  category: string | null;
  tvl: number | null;
}

export interface ProtocolUniverse {
  /**
   * Universul de scoring (regula 4.1: percentilă față de universul complet
   * de protocoale CU DATE) — doar proiectele cu fee-tracking DefiLlama.
   */
  financials: ProtocolFinancials[];
  /**
   * Toate proiectele cunoscute, inclusiv cele fără fee-tracking — pentru
   * căutare și pentru a distinge "proiect necunoscut" (404) de "proiect
   * cunoscut, dar fără date" (regula 3.3, eticheta "Date insuficiente").
   */
  catalog: ProtocolCatalogEntry[];
}

function toMap(items: DefiLlamaFeesOverviewItem[]) {
  return new Map(items.map((item) => [item.slug, item]));
}

/** Un rând brut, per protocol individual — exact cum îl raportează DefiLlama. */
export interface RawProtocolRow {
  slug: string;
  name: string;
  symbol: string | null;
  category: string | null;
  primaryChain: string | null;
  /** ex. "parent#uniswap" — păstrat ca să se poată re-agrega oricând. */
  parentProtocol: string | null;
  geckoId: string | null;
  listedAt: number | null;
  tvl: number | null;
  mcap: number | null;
  fees24h: number | null;
  fees30d: number | null;
  revenue24h: number | null;
  revenue7d: number | null;
  revenue30d: number | null;
  revenueAnnualized: number | null;
  holdersRevenue24h: number | null;
  holdersRevenue30d: number | null;
}

/**
 * Completează token-ul nativ al unui lanț când `/protocols` nu-l raportează.
 * Necesar fiindcă DefiLlama e inconsecvent aici: Bitcoin și Solana vin cu
 * `gecko_id`, dar Ethereum vine cu `symbol: "-"` și `gecko_id: null`, deci
 * ETH ar apărea ca proiect fără token și fără capitalizare.
 *
 * Trei garanții împotriva dezinformării, fiindcă a lipi capitalizarea unui
 * token de alt proiect e cea mai gravă greșeală pe care o poate face produsul:
 *
 * 1. Doar `category === "Chain"` — protocolul trebuie să FIE lanțul. Fără asta,
 *    un DEX numit „Cube" ar primi capitalizarea lanțului „Cube", iar „Katana"
 *    (Options Vault) ar primi tokenul lanțului omonim.
 * 2. Potrivire pe nume **exactă**, fără normalizare. „Ethereum",
 *    „EthereumClassic" și „EthereumPoW" sunt chei distincte în DefiLlama, deci
 *    ETC nu poate primi niciodată datele lui ETH.
 * 3. Doar completăm ce lipsește — nu suprascriem niciodată o valoare existentă.
 */
function withChainTokenFallback(
  entry: DefiLlamaProtocolListItem,
  chainTokens: Map<string, { geckoId: string | null; symbol: string | null }>
): DefiLlamaProtocolListItem {
  if (entry.category !== "Chain") return entry;
  if (entry.geckoId) return entry;

  const token = chainTokens.get(entry.name);
  if (!token?.geckoId) return entry;

  return {
    ...entry,
    geckoId: token.geckoId,
    symbol: entry.symbol ?? token.symbol,
  };
}

async function fetchAllRaw() {
  const [protocols, config, fees, revenue, holdersRevenue, supplySide] =
    await Promise.all([
      fetchProtocols(),
      fetchConfig(),
      fetchFeesOverview(undefined),
      fetchFeesOverview("dailyRevenue"),
      fetchFeesOverview("dailyHoldersRevenue"),
      fetchFeesOverview("dailySupplySideRevenue"),
    ]);

  const protocolsBySlug = new Map(protocols.map((p) => [p.slug, p]));
  const parentsById = new Map(config.parents.map((p) => [p.id, p]));
  const feesBySlug = toMap(fees);
  const revenueBySlug = toMap(revenue);
  const holdersRevenueBySlug = toMap(holdersRevenue);
  const supplySideBySlug = toMap(supplySide);

  const feeTrackedSlugs = new Set<string>([
    ...feesBySlug.keys(),
    ...revenueBySlug.keys(),
    ...holdersRevenueBySlug.keys(),
  ]);

  const perProtocol = Array.from(feeTrackedSlugs).map((slug) => {
    const rawListEntry = protocolsBySlug.get(slug);
    const feesEntry = feesBySlug.get(slug);
    const revenueEntry = revenueBySlug.get(slug);
    const holdersEntry = holdersRevenueBySlug.get(slug);
    const supplyEntry = supplySideBySlug.get(slug);

    const listEntry = rawListEntry
      ? withChainTokenFallback(rawListEntry, config.chainTokens)
      : rawListEntry;

    return {
      slug,
      name:
        feesEntry?.name ??
        revenueEntry?.name ??
        holdersEntry?.name ??
        listEntry?.name ??
        slug,
      listEntry,
      tvl: listEntry?.tvl ?? null,
      mcap: listEntry?.mcap ?? null,
      fees24h: feesEntry?.total24h ?? null,
      fees30d: feesEntry?.total30d ?? null,
      revenue24h: revenueEntry?.total24h ?? null,
      revenue7d: revenueEntry?.total7d ?? null,
      revenue30d: revenueEntry?.total30d ?? null,
      revenueAnnualized: revenueEntry?.annualized1y ?? null,
      holdersRevenue24h: holdersEntry?.total24h ?? null,
      holdersRevenue30d: holdersEntry?.total30d ?? null,
      supplySideRevenue30d: supplyEntry?.total30d ?? null,
      // Metodologia e aceeași indiferent de dataType; o luăm de unde există.
      methodology:
        feesEntry?.methodology ??
        revenueEntry?.methodology ??
        holdersEntry?.methodology ??
        null,
    };
  });

  return { perProtocol, protocols, parentsById };
}

/**
 * Rândurile brute, NEAGREGATE — ce se salvează zilnic în baza de date.
 *
 * Regula 3.2 (AGENTS.md): logăm date brute, ca orice formulă să poată fi
 * recalculată ulterior. Agregarea pe proiect-părinte e o decizie de
 * prezentare, deci se aplică la citire, nu la scriere: dacă am salva deja
 * însumat, detaliul per versiune (V2 vs. V3 vs. V4) s-ar pierde definitiv.
 */
export async function getRawProtocolRows(): Promise<RawProtocolRow[]> {
  const { perProtocol } = await fetchAllRaw();

  return perProtocol.map((p) => ({
    slug: p.slug,
    name: p.name,
    symbol: p.listEntry?.symbol ?? null,
    category: p.listEntry?.category ?? null,
    primaryChain: p.listEntry?.chains?.[0] ?? null,
    parentProtocol: p.listEntry?.parentProtocol ?? null,
    geckoId: p.listEntry?.geckoId ?? null,
    listedAt: p.listEntry?.listedAt ?? null,
    tvl: p.tvl,
    mcap: p.mcap,
    fees24h: p.fees24h,
    fees30d: p.fees30d,
    revenue24h: p.revenue24h,
    revenue7d: p.revenue7d,
    revenue30d: p.revenue30d,
    revenueAnnualized: p.revenueAnnualized,
    holdersRevenue24h: p.holdersRevenue24h,
    holdersRevenue30d: p.holdersRevenue30d,
  }));
}

/**
 * Însumează ignorând valorile lipsă, dar întoarce null dacă TOATE lipsesc —
 * altfel un proiect fără date ar apărea cu 0, ceea ce e o minciună
 * (regula 3.3: lipsa de date nu e totuna cu zero).
 */
function sumOrNull(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length > 0 ? present.reduce((a, b) => a + b, 0) : null;
}

/** Capitalizarea NU se însumează: versiunile împart același token. */
function maxOrNull(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length > 0 ? Math.max(...present) : null;
}

function minOrNull(values: Array<number | null>): number | null {
  const present = values.filter((v): v is number => v !== null);
  return present.length > 0 ? Math.min(...present) : null;
}

/** "parent#uniswap" → "uniswap" */
function parentIdToSlug(parentId: string): string {
  return parentId.replace(/^parent#/, "");
}

/**
 * Combină /protocols (TVL, mcap) cu cele trei variante de /overview/fees
 * (fees, revenue, holders revenue), apoi **agregă versiunile sub proiectul
 * părinte**: Uniswap V2/V3/V4 devin un singur „Uniswap".
 *
 * Agregarea nu e doar cosmetică — e necesară ca P/S să fie corect. Token-ul
 * UNI capturează valoare din toate versiunile la un loc, deci capitalizarea
 * trebuie raportată la venitul însumat, nu la al unei singure versiuni.
 *
 * Funcție "pură" (fără caching) — folosită atât de codul Next.js (prin
 * wrapper-ul cache-uit din protocols-cached.ts), cât și de scriptul de
 * snapshot, care rulează standalone, în afara runtime-ului Next.js.
 */
export async function getProtocolUniverse(): Promise<ProtocolUniverse> {
  const { perProtocol, protocols, parentsById } = await fetchAllRaw();

  // Grupăm după părinte; protocoalele fără părinte rămân singure în grupul lor.
  const groups = new Map<string, typeof perProtocol>();
  for (const entry of perProtocol) {
    const key = entry.listEntry?.parentProtocol ?? entry.slug;
    const existing = groups.get(key);
    if (existing) existing.push(entry);
    else groups.set(key, [entry]);
  }

  // Pas 1: agregăm ce vine din DefiLlama și reținem id-ul CoinGecko al grupului.
  const partial = Array.from(groups.entries()).map(([key, members]) => {
    const parent = parentsById.get(key);

    // Membrul cu cel mai mare venit e cel mai reprezentativ pentru
    // categorie și chain (ex. Uniswap V3 dictează pentru grupul Uniswap).
    // Pe 30 de zile, ca peste tot: o singură zi poate răsturna clasamentul
    // dintr-un vârf întâmplător și ar schimba categoria afișată.
    const lead =
      [...members].sort((a, b) => (b.revenue30d ?? 0) - (a.revenue30d ?? 0))[0] ??
      members[0];

    // Id-ul de pe părinte are prioritate: e al token-ului proiectului,
    // nu al unei versiuni individuale.
    const geckoId =
      parent?.geckoId ??
      members.map((m) => m.listEntry?.geckoId).find((id) => id) ??
      null;

    return {
      geckoId,
      base: {
        slug: parent ? parentIdToSlug(parent.id) : lead.slug,
        name: parent?.name ?? lead.name,
        symbol: parent?.symbol ?? lead.listEntry?.symbol ?? null,
        category: lead.listEntry?.category ?? null,
        primaryChain: lead.listEntry?.chains?.[0] ?? null,
        tvl: sumOrNull(members.map((m) => m.tvl)),
        llamaMcap: maxOrNull(members.map((m) => m.mcap)),
        // Cea mai veche dată de listare din grup = de când e urmărit proiectul.
        listedAt: minOrNull(members.map((m) => m.listEntry?.listedAt ?? null)),
        fees30d: sumOrNull(members.map((m) => m.fees30d)),
        revenue7d: sumOrNull(members.map((m) => m.revenue7d)),
        revenue30d: sumOrNull(members.map((m) => m.revenue30d)),
        revenueAnnualized: sumOrNull(members.map((m) => m.revenueAnnualized)),
        holdersRevenue30d: sumOrNull(members.map((m) => m.holdersRevenue30d)),
        supplySideRevenue30d: sumOrNull(members.map((m) => m.supplySideRevenue30d)),
        supplySideExplanation: lead.methodology?.SupplySideRevenue ?? null,
        components: members.length > 1 ? members.map((m) => m.name).sort() : [],
      },
    };
  });

  // Pas 2: îmbogățim cu CoinGecko (capitalizare + FDV) într-un singur val de cereri.
  const geckoIds = partial
    .map((p) => p.geckoId)
    .filter((id): id is string => id !== null);
  const markets = await fetchMarkets(geckoIds);

  const financials: ProtocolFinancials[] = partial.map(({ geckoId, base }) => {
    const market = geckoId ? markets.get(geckoId) : undefined;
    const { llamaMcap, ...rest } = base;

    return {
      ...rest,
      // CoinGecko e mai proaspăt și acoperă mai mult; DefiLlama rămâne rezervă.
      mcap: market?.mcap ?? llamaMcap,
      fdv: market?.fdv ?? null,
    };
  });

  return {
    financials,
    catalog: buildCatalog(protocols, parentsById, financials),
  };
}

/** Doar partea de scoring, fără catalog — ce se memorează pentru pagini. */
export async function getProtocolFinancials(): Promise<ProtocolFinancials[]> {
  const { financials } = await getProtocolUniverse();
  return financials;
}

/**
 * Catalogul de căutare, calculat pe cont propriu din `/protocols` + `/config`.
 *
 * Nu are nevoie nici de datele de fee-uri, nici de CoinGecko: pentru căutare
 * ajung numele, simbolul și TVL-ul. Îl ținem separat de universul de scoring
 * din două motive — e mult mai ieftin de calculat (o singură cerere în loc de
 * șase), și își primește propriul buget de 2 MB în cache. Împreună, cele două
 * ajunseseră la 1,40 MB dintr-un maxim de 2 MB; separate, fiecare are marjă
 * de creștere de peste 150%.
 */
export async function getProtocolCatalog(): Promise<ProtocolCatalogEntry[]> {
  const [protocols, config] = await Promise.all([fetchProtocols(), fetchConfig()]);
  const parentsById = new Map(config.parents.map((p) => [p.id, p]));

  return buildCatalog(protocols, parentsById, []);
}

/**
 * Agregat la fel ca universul de scoring: cine caută „uniswap" trebuie să
 * găsească un singur Uniswap, nu patru versiuni.
 */
function buildCatalog(
  protocols: DefiLlamaProtocolListItem[],
  parentsById: Map<
    string,
    { id: string; name: string; symbol: string | null; geckoId: string | null }
  >,
  financials: ProtocolFinancials[]
): ProtocolCatalogEntry[] {
  const byslug = new Map<string, ProtocolCatalogEntry>();

  // Întâi proiectele cu date financiare — au deja numele și simbolul corecte.
  for (const f of financials) {
    byslug.set(f.slug, {
      slug: f.slug,
      name: f.name,
      symbol: f.symbol,
      category: f.category,
      tvl: f.tvl,
    });
  }

  // Apoi restul protocoalelor (fără fee-tracking), tot agregate pe părinte.
  for (const p of protocols) {
    const parent = p.parentProtocol ? parentsById.get(p.parentProtocol) : undefined;
    const slug = parent ? parentIdToSlug(parent.id) : p.slug;
    const existing = byslug.get(slug);

    if (!existing) {
      byslug.set(slug, {
        slug,
        name: parent?.name ?? p.name,
        symbol: parent?.symbol ?? p.symbol,
        category: p.category,
        tvl: p.tvl,
      });
      continue;
    }

    // Grup deja prezent: adunăm TVL-ul versiunilor fără fee-tracking.
    if (parent && p.tvl !== null) {
      existing.tvl = (existing.tvl ?? 0) + p.tvl;
    }
  }

  return Array.from(byslug.values());
}
