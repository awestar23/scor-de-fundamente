import { describe, expect, it } from "vitest";
import { makeProtocol } from "./fixtures";
import type { ProtocolCatalogEntry } from "@/lib/protocols";

/**
 * `unstable_cache` refuză TĂCUT orice depășește 2 MB. Când obiectul nostru a
 * trecut de prag, cache-ul a încetat să funcționeze fără niciun mesaj: fiecare
 * cerere a reînceput să descarce și să recalculeze tot universul, randarea a
 * depășit timpul maxim al funcției, iar paginile de proiect au încetat să se
 * mai deschidă — click-ul părea că nu face nimic.
 *
 * A fost cel mai costisitor defect de până acum tocmai fiindcă a fost mut.
 * Testele astea îl fac zgomotos: pică în CI, nu în producție.
 *
 * Măsurat în producție (4 august 2026): 1,40 MB total — 384 octeți per
 * proiect × 2072, plus 99 octeți per intrare de catalog × 6814. Marjă 30%.
 */
const LIMITA_UNSTABLE_CACHE = 2 * 1_048_576;

const PROIECTE_ACUM = 2072;
const CATALOG_ACUM = 6814;

/** Un proiect tipic, cu toate câmpurile pe care le chiar afișăm. */
function proiectTipic(i: number) {
  return makeProtocol({
    slug: `protocol-${i}`,
    name: `Protocol ${i}`,
    symbol: "TICK",
    category: "Dexs",
    primaryChain: "Ethereum",
    tvl: 1.234e9,
    mcap: 1.234e9,
    fdv: 2.345e9,
    listedAt: 1_600_000_000,
    fees30d: 1.2e6,
    revenue7d: 1.2e5,
    revenue30d: 1.2e6,
    revenueAnnualized: 1.2e7,
    holdersRevenue30d: 5.6e5,
    supplySideRevenue30d: 5.6e5,
    supplySideExplanation: "Fees distributed to liquidity providers",
  });
}

function intrareCatalog(i: number): ProtocolCatalogEntry {
  return {
    slug: `protocol-${i}`,
    name: `Protocol ${i}`,
    symbol: "TICK",
    category: "Dexs",
    tvl: 1.234e8,
  };
}

const marimeFinancials = (n: number) =>
  JSON.stringify(Array.from({ length: n }, (_, i) => proiectTipic(i))).length;

const marimeCatalog = (n: number) =>
  JSON.stringify(Array.from({ length: n }, (_, i) => intrareCatalog(i))).length;

describe("obiectul memorat trebuie să încapă în cache", () => {
  it("bugetul per proiect rămâne mic — el decide totul la 2000+ de proiecte", () => {
    const unul = JSON.stringify(proiectTipic(0)).length;

    // Real: 384 octeți. Peste 550 înseamnă că am adăugat un câmp greu
    // (cum a fost `methodology`, care singur ocupa o treime din buget).
    expect(unul).toBeLessThan(550);
  });

  it("bugetul per intrare de catalog rămâne mic — sunt de trei ori mai multe", () => {
    expect(JSON.stringify(intrareCatalog(0)).length).toBeLessThan(160);
  });

  it("scoringul încape singur, la scara actuală", () => {
    expect(marimeFinancials(PROIECTE_ACUM)).toBeLessThan(LIMITA_UNSTABLE_CACHE);
  });

  it("catalogul încape singur, la scara actuală", () => {
    expect(marimeCatalog(CATALOG_ACUM)).toBeLessThan(LIMITA_UNSTABLE_CACHE);
  });

  it("ambele rezistă dublării universului — de asta stau în cache-uri separate", () => {
    // Împreună într-o singură intrare, cele două depășeau deja pragul la o
    // creștere de 40%. Separate, fiecare suportă peste 100%. Dacă testul ăsta
    // pică vreodată, e semnalul că trebuie decis conștient ce scoatem —
    // nu semnalul că producția s-a oprit deja.
    expect(marimeFinancials(PROIECTE_ACUM * 2)).toBeLessThan(LIMITA_UNSTABLE_CACHE);
    expect(marimeCatalog(CATALOG_ACUM * 2)).toBeLessThan(LIMITA_UNSTABLE_CACHE);
  });
});
