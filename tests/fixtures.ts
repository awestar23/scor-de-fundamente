import type { ProtocolFinancials } from "@/lib/protocols";

/**
 * Protocol de test cu toate câmpurile pe null. Fiecare test suprascrie doar
 * ce îl interesează, ca intenția lui să fie evidentă din ce declară.
 */
export function makeProtocol(
  overrides: Partial<ProtocolFinancials> = {}
): ProtocolFinancials {
  return {
    slug: "test",
    name: "Test",
    symbol: "TEST",
    category: null,
    primaryChain: null,
    tvl: null,
    mcap: null,
    fdv: null,
    listedAt: null,
    fees30d: null,
    revenue7d: null,
    revenue30d: null,
    revenueAnnualized: null,
    holdersRevenue30d: null,
    supplySideRevenue30d: null,
    supplySideExplanation: null,
    components: [],
    ...overrides,
  };
}

/**
 * Univers de comparație suficient de mare încât percentilele să fie valide
 * (regula 4.1 cere minimum 8 valori). Veniturile cresc liniar.
 */
export function makeUniverse(size = 20): ProtocolFinancials[] {
  return Array.from({ length: size }, (_, i) =>
    makeProtocol({
      slug: `p${i}`,
      name: `P${i}`,
      revenue30d: (i + 1) * 1000,
      holdersRevenue30d: (i + 1) * 500,
      mcap: (i + 1) * 1_000_000,
      fdv: (i + 1) * 1_500_000,
      revenueAnnualized: (i + 1) * 12_000,
      listedAt: 1_600_000_000 + i * 86_400,
    })
  );
}
