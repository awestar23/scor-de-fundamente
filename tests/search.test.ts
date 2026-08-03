import { describe, expect, it } from "vitest";
import { searchProtocols } from "@/lib/search";
import type { ProtocolCatalogEntry } from "@/lib/protocols";

const catalog: ProtocolCatalogEntry[] = [
  { slug: "uniswap", name: "Uniswap", symbol: "UNI", category: "Dexs", tvl: 2_000_000 },
  { slug: "unit", name: "Unit", symbol: null, category: "Bridge", tvl: 500_000 },
  { slug: "aave", name: "Aave", symbol: "AAVE", category: "Lending", tvl: 5_000_000 },
  { slug: "ethereum", name: "Ethereum", symbol: "ETH", category: "Chain", tvl: 100 },
  { slug: "ethereumclassic", name: "EthereumClassic", symbol: "ETC", category: "Chain", tvl: 50 },
];

describe("căutare după nume, simbol sau slug", () => {
  it("potrivirea exactă pe nume vine prima", () => {
    expect(searchProtocols("uniswap", catalog)[0].slug).toBe("uniswap");
  });

  it("găsește după simbol", () => {
    expect(searchProtocols("AAVE", catalog)[0].slug).toBe("aave");
  });

  it("nu ține cont de majuscule", () => {
    expect(searchProtocols("aAvE", catalog)[0].slug).toBe("aave");
  });

  it("un prefix ambiguu întoarce mai multe rezultate, cel mai potrivit primul", () => {
    const rezultate = searchProtocols("uni", catalog);
    expect(rezultate.length).toBeGreaterThan(1);
    expect(rezultate[0].slug).toBe("uniswap");
  });

  it("cautarea 'eth' nu il confunda pe Ethereum cu Ethereum Classic", () => {
    const rezultate = searchProtocols("eth", catalog);
    expect(rezultate[0].slug).toBe("ethereum");
    // ETC apare în listă, dar ca rezultat separat — nu înlocuiește ETH.
    expect(rezultate.some((r) => r.slug === "ethereumclassic")).toBe(true);
  });

  it("o interogare fără potriviri întoarce lista goală, nu rezultate aproximative", () => {
    expect(searchProtocols("zzzznuexista", catalog)).toEqual([]);
  });

  it("interogarea goală nu întoarce tot catalogul", () => {
    expect(searchProtocols("", catalog)).toEqual([]);
    expect(searchProtocols("   ", catalog)).toEqual([]);
  });

  it("respectă limita cerută", () => {
    expect(searchProtocols("e", catalog, 2).length).toBeLessThanOrEqual(2);
  });

  it("nu se împiedică de proiectele fără simbol", () => {
    expect(() => searchProtocols("unit", catalog)).not.toThrow();
    expect(searchProtocols("unit", catalog)[0].slug).toBe("unit");
  });
});
