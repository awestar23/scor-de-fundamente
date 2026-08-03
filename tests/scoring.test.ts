import { describe, expect, it } from "vitest";
import {
  hasSufficientData,
  percentile,
  riskFlags,
  scoreEconomics,
  scoreQuality,
  scoreRisk,
  scoreValuation,
} from "@/lib/scoring";
import { makeProtocol, makeUniverse } from "./fixtures";

describe("percentile (regula 4.1)", () => {
  it("întoarce null sub 8 valori — o percentilă pe 7 puncte nu e fiabilă", () => {
    expect(percentile(5, [1, 2, 3, 4, 5, 6, 7])).toBeNull();
  });

  it("acceptă exact 8 valori", () => {
    expect(percentile(5, [1, 2, 3, 4, 5, 6, 7, 8])).not.toBeNull();
  });

  it("numără câte valori sunt strict mai mici", () => {
    const universe = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    expect(percentile(50, universe)).toBe(40);
    expect(percentile(10, universe)).toBe(0);
    expect(percentile(1000, universe)).toBe(100);
  });

  it("ignoră valorile care nu sunt numere finite", () => {
    const universe = [1, 2, 3, 4, 5, 6, 7, 8, NaN, Infinity];
    expect(percentile(4, universe)).toBe(37.5);
  });
});

describe("lipsa de date nu devine niciodată zero (regula 3.3)", () => {
  const universe = makeUniverse();

  it("Calitate: fără venit → null, nu 0", () => {
    const result = scoreQuality(makeProtocol({ revenue30d: null }), universe);
    expect(result.pts).toBeNull();
    expect(result.note).toContain("Nu avem venit verificabil");
  });

  it("Economie: fără defalcare către deținători → null, nu 0", () => {
    const result = scoreEconomics(
      makeProtocol({ revenue30d: 1000, holdersRevenue30d: null }),
      universe
    );
    expect(result.pts).toBeNull();
  });

  it("Evaluare: fără capitalizare → null, nu 0", () => {
    const result = scoreValuation(
      makeProtocol({ mcap: null, revenueAnnualized: 5000 }),
      universe
    );
    expect(result.pts).toBeNull();
    expect(result.note).toContain("capitalizare");
  });

  it("Risc: fără vechime, capitalizare sau supply → null", () => {
    const result = scoreRisk(makeProtocol(), universe);
    expect(result.pts).toBeNull();
  });

  it("un univers prea mic nu produce scor inventat", () => {
    const tiny = makeUniverse(3);
    const result = scoreQuality(makeProtocol({ revenue30d: 5000 }), tiny);
    expect(result.pts).toBeNull();
  });
});

describe("zero structural ≠ zero din declin", () => {
  const universe = makeUniverse();

  it("Bitcoin: fee-uri mari, venit zero → N/A, NU un scor mic", () => {
    // Cazul real: utilizatorii plătesc comisioane, dar merg la mineri.
    // Un scor de 0,4/100 aici ar fi derivat corect și profund înșelător.
    const bitcoin = makeProtocol({
      slug: "bitcoin",
      name: "Bitcoin",
      revenue30d: 0,
      fees30d: 5_740_000,
    });

    const quality = scoreQuality(bitcoin, universe);
    expect(quality.pts).toBeNull();
    expect(quality.note).toContain("nu reține nimic");

    const economics = scoreEconomics(bitcoin, universe);
    expect(economics.pts).toBeNull();
    expect(economics.note).toContain("nu i se aplică");
  });

  it("protocol stins: fără fee-uri și fără venit → tot null, dar din alt motiv", () => {
    const dead = makeProtocol({ revenue30d: 0, fees30d: 0 });
    const quality = scoreQuality(dead, universe);
    expect(quality.pts).toBe(0);
  });
});

describe("Economie — passthrough (regula 3.4)", () => {
  const universe = makeUniverse();

  it("calculează procentul din venit care ajunge la deținători", () => {
    const result = scoreEconomics(
      makeProtocol({ revenue30d: 1000, holdersRevenue30d: 930 }),
      universe
    );
    expect(result.note).toContain("93,0%");
  });

  it("passthrough zero e o valoare măsurată, nu date lipsă", () => {
    // Aave: venitul merge în trezorerie, nu la deținătorii AAVE.
    const result = scoreEconomics(
      makeProtocol({ revenue30d: 1000, holdersRevenue30d: 0 }),
      universe
    );
    expect(result.pts).not.toBeNull();
    expect(result.note).toContain("0,0%");
  });
});

describe("Evaluare — P/S verificabil", () => {
  const universe = makeUniverse();

  it("nota conține ambii termeni ai împărțirii, ca cifra să poată fi refăcută", () => {
    const result = scoreValuation(
      makeProtocol({ mcap: 12_000_000_000, revenueAnnualized: 771_000_000 }),
      universe
    );
    expect(result.note).toContain("12 Md$");
    expect(result.note).toContain("771 M$");
    expect(result.note).toContain("15,6×");
  });

  it("P/S mai mic înseamnă percentilă mai mare — ieftin e mai sus", () => {
    const ieftin = scoreValuation(
      makeProtocol({ mcap: 1_000_000, revenueAnnualized: 1_000_000 }),
      universe
    );
    const scump = scoreValuation(
      makeProtocol({ mcap: 1_000_000_000, revenueAnnualized: 1_000_000 }),
      universe
    );
    expect(ieftin.pts).toBeGreaterThan(scump.pts as number);
  });
});

describe("semnale de risc (regula 4.4)", () => {
  const universe = makeUniverse();

  it("proiect nou + capitalizare mică → 2 semnale → avertisment", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const flags = riskFlags(
      makeProtocol({
        listedAt: nowSeconds - 10 * 86_400,
        mcap: 1_000,
      }),
      universe
    );
    expect(flags.isNew).toBe(true);
    expect(flags.isVerySmall).toBe(true);
    expect(flags.shouldWarn).toBe(true);
  });

  it("un singur semnal nu declanșează avertismentul", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const flags = riskFlags(
      makeProtocol({
        listedAt: nowSeconds - 10 * 86_400,
        mcap: 20_000_000,
        revenue30d: 1000,
        fees30d: 1000,
        fdv: 21_000_000,
      }),
      universe
    );
    expect(flags.isNew).toBe(true);
    expect(flags.shouldWarn).toBe(false);
  });

  it("diluție mare = FDV mult peste capitalizare", () => {
    const flags = riskFlags(
      makeProtocol({ mcap: 1_000_000_000, fdv: 5_000_000_000 }),
      universe
    );
    expect(flags.hasHighDilution).toBe(true);
  });
});

describe("hasSufficientData (regula 3.3)", () => {
  it("fără nicio măsurătoare de fee sau venit → date insuficiente", () => {
    expect(hasSufficientData(makeProtocol())).toBe(false);
  });

  it("doar fee-uri, fără venit, e totuși suficient ca să afișăm ceva", () => {
    expect(hasSufficientData(makeProtocol({ fees30d: 100 }))).toBe(true);
  });
});
