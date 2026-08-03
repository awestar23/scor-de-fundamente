import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchMarkets } from "@/lib/coingecko";

afterEach(() => {
  vi.unstubAllGlobals();
});

function respond(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: { get: (k: string) => headers[k.toLowerCase()] ?? null },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("CoinGecko — reziliență la limitarea de rată", () => {
  it("reîncearcă după 429 și întoarce datele la a doua încercare", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", () => {
      calls += 1;
      if (calls === 1) return Promise.resolve(respond(null, 429, { "retry-after": "0" }));
      return Promise.resolve(
        respond([{ id: "ethereum", market_cap: 224_000_000_000, fully_diluted_valuation: 224_000_000_000 }])
      );
    });

    const markets = await fetchMarkets(["ethereum"]);

    expect(calls).toBe(2);
    expect(markets.get("ethereum")?.mcap).toBe(224_000_000_000);
  });

  it("nu reîncearcă la o eroare care nu se repară prin reîncercare (400)", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", () => {
      calls += 1;
      return Promise.resolve(respond(null, 400));
    });

    const markets = await fetchMarkets(["ethereum"]);

    expect(calls).toBe(1);
    expect(markets.size).toBe(0);
  });

  it("un eșec definitiv lasă capitalizarea absentă, nu zero (regula 3.3)", async () => {
    vi.stubGlobal("fetch", () => Promise.resolve(respond(null, 500)));

    const markets = await fetchMarkets(["ethereum"]);

    // Absent din hartă înseamnă „nu știm", ceea ce devine null în amonte.
    expect(markets.has("ethereum")).toBe(false);
  });

  it("eșecul CoinGecko nu se propagă — e sursă secundară, nu primară", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new Error("retea cazuta")));

    await expect(fetchMarkets(["ethereum"])).resolves.toBeInstanceOf(Map);
  });

  it("valorile lipsă din răspuns rămân null, nu devin zero", async () => {
    vi.stubGlobal("fetch", () =>
      Promise.resolve(respond([{ id: "fara-date" }]))
    );

    const markets = await fetchMarkets(["fara-date"]);

    expect(markets.get("fara-date")?.mcap).toBeNull();
    expect(markets.get("fara-date")?.fdv).toBeNull();
  });
});
