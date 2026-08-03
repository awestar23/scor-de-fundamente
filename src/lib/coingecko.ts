const PUBLIC_BASE_URL = "https://api.coingecko.com/api/v3";
const PRO_BASE_URL = "https://pro-api.coingecko.com/api/v3";

// CoinGecko acceptă mai multe id-uri per cerere. 200 ține URL-ul sub limite
// rezonabile și reduce 433 de proiecte la 3 cereri.
const BATCH_SIZE = 200;

export interface CoinGeckoMarket {
  geckoId: string;
  /** Capitalizare de piață (circulant × preț). */
  mcap: number | null;
  /** Valoare complet diluată — capitalizarea dacă tot supply-ul ar circula. */
  fdv: number | null;
  circulatingSupply: number | null;
  totalSupply: number | null;
}

interface RawMarket {
  id: string;
  market_cap?: number | null;
  fully_diluted_valuation?: number | null;
  circulating_supply?: number | null;
  total_supply?: number | null;
}

function authHeaders(): Record<string, string> {
  const demoKey = process.env.COINGECKO_API_KEY;
  const proKey = process.env.COINGECKO_PRO_API_KEY;

  if (proKey) return { "x-cg-pro-api-key": proKey };
  if (demoKey) return { "x-cg-demo-api-key": demoKey };
  return {};
}

function baseUrl(): string {
  return process.env.COINGECKO_PRO_API_KEY ? PRO_BASE_URL : PUBLIC_BASE_URL;
}

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchBatchOnce(ids: string[]): Promise<RawMarket[]> {
  const url =
    `${baseUrl()}/coins/markets?vs_currency=usd&per_page=250&page=1&ids=` +
    encodeURIComponent(ids.join(","));

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "ScorDeFundamente/1.0",
      ...authHeaders(),
    },
  });

  if (!res.ok) {
    const retryAfter = Number(res.headers.get("retry-after"));
    const error = new Error(`CoinGecko a răspuns ${res.status} ${res.statusText}`);
    // 429 (prea multe cereri) și 5xx sunt trecătoare — merită reîncercate.
    // 4xx-urile rămase înseamnă o cerere greșită, pe care reîncercarea n-o repară.
    Object.assign(error, {
      retryable: res.status === 429 || res.status >= 500,
      retryAfterMs: Number.isFinite(retryAfter) ? retryAfter * 1000 : null,
    });
    throw error;
  }

  return (await res.json()) as RawMarket[];
}

/**
 * Reîncearcă loturile căzute din limitare de rată.
 *
 * Fără asta, un singur 429 lăsa proiectele din lotul respectiv fără
 * capitalizare, iar rezultatul incomplet era memorat o oră întreagă — motiv
 * pentru care Ethereum apărea corect pe pagină și fără capitalizare în API,
 * simultan. CoinGecko limitează des cererile venite de pe IP-urile Vercel,
 * fiindcă sunt partajate între mulți clienți.
 */
async function fetchBatch(ids: string[]): Promise<RawMarket[]> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchBatchOnce(ids);
    } catch (error) {
      lastError = error;
      const meta = error as { retryable?: boolean; retryAfterMs?: number | null };
      if (!meta.retryable || attempt === MAX_ATTEMPTS) break;

      await sleep(meta.retryAfterMs ?? BASE_BACKOFF_MS * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

/**
 * Capitalizare și FDV pentru o listă de id-uri CoinGecko.
 *
 * CoinGecko e sursă de **îmbogățire**, nu sursă primară: dacă pică sau ne
 * limitează, protocoalele afectate rămân fără capitalizare și dimensiunea
 * Evaluare iese „N/A" (regula 3.3), dar restul produsului funcționează.
 * De asta eșecul e prins aici, nu propagat.
 */
export async function fetchMarkets(
  geckoIds: string[]
): Promise<Map<string, CoinGeckoMarket>> {
  const unique = Array.from(new Set(geckoIds.filter(Boolean)));
  const result = new Map<string, CoinGeckoMarket>();

  for (let i = 0; i < unique.length; i += BATCH_SIZE) {
    const batch = unique.slice(i, i + BATCH_SIZE);

    // Mică pauză între loturi: e mai ieftin decât să declanșăm limitarea și
    // apoi să reîncercăm. Nu se aplică înaintea primului lot.
    if (i > 0) await sleep(250);

    try {
      const raw = await fetchBatch(batch);
      for (const entry of raw) {
        result.set(entry.id, {
          geckoId: entry.id,
          mcap: entry.market_cap ?? null,
          fdv: entry.fully_diluted_valuation ?? null,
          circulatingSupply: entry.circulating_supply ?? null,
          totalSupply: entry.total_supply ?? null,
        });
      }
    } catch (error) {
      // Nu oprim tot din cauza unui lot: restul proiectelor rămân utilizabile.
      console.warn(
        `[coingecko] Lot eșuat (${batch.length} id-uri): ${
          error instanceof Error ? error.message : error
        }`
      );
    }
  }

  return result;
}
