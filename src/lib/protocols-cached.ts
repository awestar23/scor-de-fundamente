import { unstable_cache } from "next/cache";
import { getProtocolUniverse } from "./protocols";

// unstable_cache cere runtime-ul Next.js (funcționează în route handlers și
// pagini, NU în scripts/snapshot.ts, care rulează standalone prin tsx).
// Cache-uim rezultatul îngustat (financials + catalog subțire), nu
// răspunsurile brute DefiLlama (30MB+, prea mari pentru cache-ul de fetch —
// vezi defillama.ts).
export const getCachedProtocolUniverse = unstable_cache(
  getProtocolUniverse,
  ["protocol-universe"],
  { revalidate: 3600 }
);
