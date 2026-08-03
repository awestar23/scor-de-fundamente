import { unstable_cache } from "next/cache";
import { getProtocolUniverse } from "./protocols";

/**
 * Versiunea codului, parte din cheia de cache.
 *
 * Fără ea, cache-ul de o oră supraviețuiește deploy-ului: un bug de calcul
 * reparat rămâne vizibil în producție până expiră intrarea veche, iar
 * suprafețe diferite (pagină vs. rută API) pot servi simultan versiuni
 * diferite ale acelorași cifre — exact ce am observat cu Ethereum, care
 * apărea corect pe pagină și fără capitalizare în API.
 *
 * Costul e o singură recalculare completă după fiecare deploy (5 cereri).
 * Merită: la un produs a cărui marfă e corectitudinea, o reparație trebuie
 * să fie reparație peste tot, imediat.
 */
const CODE_VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID ?? "dev";

// unstable_cache cere runtime-ul Next.js (funcționează în route handlers și
// pagini, NU în scripts/snapshot.ts, care rulează standalone prin tsx).
// Cache-uim rezultatul îngustat (financials + catalog subțire), nu
// răspunsurile brute DefiLlama (30MB+, prea mari pentru cache-ul de fetch —
// vezi defillama.ts).
export const getCachedProtocolUniverse = unstable_cache(
  getProtocolUniverse,
  ["protocol-universe", CODE_VERSION],
  { revalidate: 3600 }
);
