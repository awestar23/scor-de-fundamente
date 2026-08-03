import { afterEach, describe, expect, it, vi } from "vitest";
import { getProtocolUniverse } from "@/lib/protocols";

/**
 * Simulează cele patru endpointuri DefiLlama plus CoinGecko, ca să putem
 * verifica exact contractul de agregare fără rețea. Fiecare test descrie un
 * univers mic, controlat.
 */
function stubApis(opts: {
  protocols: unknown[];
  parentProtocols?: unknown[];
  chainCoingeckoIds?: Record<string, unknown>;
  fees?: unknown[];
  revenue?: unknown[];
  holders?: unknown[];
  markets?: unknown[];
}) {
  const json = (body: unknown) =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

  vi.stubGlobal("fetch", (input: string | URL) => {
    const url = String(input);

    if (url.includes("/protocols")) return json(opts.protocols);
    if (url.includes("/config"))
      return json({
        parentProtocols: opts.parentProtocols ?? [],
        chainCoingeckoIds: opts.chainCoingeckoIds ?? {},
      });
    if (url.includes("dataType=dailyHoldersRevenue"))
      return json({ protocols: opts.holders ?? [] });
    if (url.includes("dataType=dailyRevenue"))
      return json({ protocols: opts.revenue ?? [] });
    if (url.includes("/overview/fees")) return json({ protocols: opts.fees ?? [] });
    if (url.includes("coingecko")) return json(opts.markets ?? []);

    throw new Error(`URL nesimulat în test: ${url}`);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("agregarea pe proiect-părinte (regula 5.2)", () => {
  const uniswapSetup = {
    protocols: [
      {
        name: "Uniswap V2",
        slug: "uniswap-v2",
        symbol: "UNI",
        category: "Dexs",
        chains: ["Ethereum"],
        tvl: 800,
        mcap: null,
        parentProtocol: "parent#uniswap",
      },
      {
        name: "Uniswap V3",
        slug: "uniswap-v3",
        symbol: "UNI",
        category: "Dexs",
        chains: ["Ethereum"],
        tvl: 1400,
        mcap: null,
        parentProtocol: "parent#uniswap",
      },
    ],
    parentProtocols: [
      { id: "parent#uniswap", name: "Uniswap", symbol: "UNI", gecko_id: "uniswap" },
    ],
    revenue: [
      { name: "Uniswap V2", slug: "uniswap-v2", total24h: 10, total30d: 300, annualized1y: 3650 },
      { name: "Uniswap V3", slug: "uniswap-v3", total24h: 40, total30d: 1200, annualized1y: 14600 },
    ],
    holders: [
      { name: "Uniswap V2", slug: "uniswap-v2", total24h: 10, total30d: 300 },
      { name: "Uniswap V3", slug: "uniswap-v3", total24h: 40, total30d: 1200 },
    ],
    markets: [
      { id: "uniswap", market_cap: 2_400_000_000, fully_diluted_valuation: 3_500_000_000 },
    ],
  };

  it("versiunile devin un singur proiect, cu numele părintelui", async () => {
    stubApis(uniswapSetup);
    const { financials } = await getProtocolUniverse();

    expect(financials).toHaveLength(1);
    expect(financials[0].name).toBe("Uniswap");
    expect(financials[0].slug).toBe("uniswap");
    expect(financials[0].components).toEqual(["Uniswap V2", "Uniswap V3"]);
  });

  it("veniturile SE ÎNSUMEAZĂ între versiuni", async () => {
    stubApis(uniswapSetup);
    const { financials } = await getProtocolUniverse();

    expect(financials[0].revenue30d).toBe(1500);
    expect(financials[0].holdersRevenue30d).toBe(1500);
    expect(financials[0].tvl).toBe(2200);
  });

  it("capitalizarea NU se însumează — versiunile împart același token", async () => {
    stubApis(uniswapSetup);
    const { financials } = await getProtocolUniverse();

    // Două versiuni, un singur UNI. Dublarea ar face P/S-ul de două ori greșit.
    expect(financials[0].mcap).toBe(2_400_000_000);
  });

  it("căutarea găsește un singur Uniswap, nu patru versiuni", async () => {
    stubApis(uniswapSetup);
    const { catalog } = await getProtocolUniverse();

    expect(catalog.filter((c) => c.name.startsWith("Uniswap"))).toHaveLength(1);
    expect(catalog.some((c) => c.name === "Uniswap V3")).toBe(false);
  });
});

describe("tokenul nativ al lanțurilor nu contaminează proiecte diferite", () => {
  const setup = {
    protocols: [
      // Ethereum: DefiLlama nu-i dă gecko_id — trebuie completat din /config.
      {
        name: "Ethereum",
        slug: "ethereum",
        symbol: "-",
        category: "Chain",
        chains: ["Ethereum"],
        tvl: 100,
        mcap: null,
        parentProtocol: null,
      },
      // Ethereum Classic: lanț distinct, cu alt token.
      {
        name: "EthereumClassic",
        slug: "ethereumclassic",
        symbol: "-",
        category: "Chain",
        chains: ["EthereumClassic"],
        tvl: 5,
        mcap: null,
        parentProtocol: null,
      },
      // Un DEX al cărui nume coincide cu al unui lanț. NU trebuie să
      // primească tokenul lanțului omonim.
      {
        name: "Cube",
        slug: "cube-dex",
        symbol: "-",
        category: "Dexs",
        chains: ["Cube"],
        tvl: 3,
        mcap: null,
        parentProtocol: null,
      },
    ],
    chainCoingeckoIds: {
      Ethereum: { geckoId: "ethereum", symbol: "ETH" },
      EthereumClassic: { geckoId: "ethereum-classic", symbol: "ETC" },
      Cube: { geckoId: "cube-network", symbol: "CUBE" },
    },
    revenue: [
      { name: "Ethereum", slug: "ethereum", total24h: 1, total30d: 30, annualized1y: 365 },
      { name: "EthereumClassic", slug: "ethereumclassic", total24h: 1, total30d: 30, annualized1y: 365 },
      { name: "Cube", slug: "cube-dex", total24h: 1, total30d: 30, annualized1y: 365 },
    ],
    markets: [
      { id: "ethereum", market_cap: 224_000_000_000, fully_diluted_valuation: 224_000_000_000 },
      { id: "ethereum-classic", market_cap: 2_000_000_000, fully_diluted_valuation: 2_000_000_000 },
      { id: "cube-network", market_cap: 9_000_000, fully_diluted_valuation: 9_000_000 },
    ],
  };

  it("Ethereum primește ETH și capitalizarea lui", async () => {
    stubApis(setup);
    const { financials } = await getProtocolUniverse();
    const eth = financials.find((p) => p.slug === "ethereum");

    expect(eth?.symbol).toBe("ETH");
    expect(eth?.mcap).toBe(224_000_000_000);
  });

  it("Ethereum Classic primește ETC, NU datele lui ETH", async () => {
    stubApis(setup);
    const { financials } = await getProtocolUniverse();
    const etc = financials.find((p) => p.slug === "ethereumclassic");

    expect(etc?.symbol).toBe("ETC");
    expect(etc?.mcap).toBe(2_000_000_000);
    expect(etc?.mcap).not.toBe(224_000_000_000);
  });

  it("un DEX cu nume de lanț NU primește tokenul lanțului", async () => {
    stubApis(setup);
    const { financials } = await getProtocolUniverse();
    const cube = financials.find((p) => p.slug === "cube-dex");

    // Nu e categoria "Chain", deci completarea nu se aplică.
    expect(cube?.symbol).toBeNull();
    expect(cube?.mcap).toBeNull();
  });
});

describe("lipsa unei surse nu inventează valori (regula 3.3)", () => {
  it("dacă CoinGecko nu întoarce nimic, capitalizarea rămâne null, nu 0", async () => {
    stubApis({
      protocols: [
        {
          name: "Solo",
          slug: "solo",
          symbol: "SOLO",
          category: "Dexs",
          chains: ["Ethereum"],
          tvl: 10,
          mcap: null,
          gecko_id: "solo",
          parentProtocol: null,
        },
      ],
      revenue: [{ name: "Solo", slug: "solo", total24h: 1, total30d: 30, annualized1y: 365 }],
      markets: [],
    });

    const { financials } = await getProtocolUniverse();
    expect(financials[0].mcap).toBeNull();
    expect(financials[0].fdv).toBeNull();
  });

  it("un protocol prezent doar în lista de fee-uri nu primește TVL inventat", async () => {
    stubApis({
      protocols: [],
      revenue: [{ name: "Fantoma", slug: "fantoma", total24h: 5, total30d: 150 }],
    });

    const { financials } = await getProtocolUniverse();
    expect(financials[0].slug).toBe("fantoma");
    expect(financials[0].tvl).toBeNull();
    expect(financials[0].mcap).toBeNull();
  });
});
