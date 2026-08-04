import { unstable_cache } from "next/cache";
import { getProtocolCatalog, getProtocolFinancials } from "./protocols";

/**
 * Versiunea codului, parte din cheia de cache.
 *
 * Fără ea, cache-ul de o oră supraviețuiește deploy-ului: un bug de calcul
 * reparat rămâne vizibil în producție până expiră intrarea veche, iar
 * suprafețe diferite (pagină vs. rută API) pot servi simultan versiuni
 * diferite ale acelorași cifre — exact ce am observat cu Ethereum, care
 * apărea corect pe pagină și fără capitalizare în API.
 */
const CODE_VERSION =
  process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.VERCEL_DEPLOYMENT_ID ?? "dev";

/**
 * Două intrări de cache separate, nu una.
 *
 * `unstable_cache` refuză tăcut orice depășește 2 MB — fără eroare, fără log.
 * Când universul complet (scoring + catalog) a ajuns la 2,08 MB, memorarea a
 * încetat pur și simplu să funcționeze: fiecare cerere recalcula totul de la
 * zero, randarea depășea timpul maxim al funcției, iar paginile de proiect nu
 * se mai deschideau deloc.
 *
 * Separate, fiecare are propriul buget de 2 MB: scoring 0,76 MB și catalog
 * 0,64 MB, adică marjă de creștere de peste 150% pentru fiecare. În plus,
 * catalogul se calculează din o singură cerere, nu din șase — deci căutarea
 * nu mai plătește costul datelor de care nu are nevoie.
 */
export const getCachedFinancials = unstable_cache(
  getProtocolFinancials,
  ["protocol-financials", CODE_VERSION],
  { revalidate: 3600 }
);

export const getCachedCatalog = unstable_cache(
  getProtocolCatalog,
  ["protocol-catalog", CODE_VERSION],
  { revalidate: 3600 }
);
