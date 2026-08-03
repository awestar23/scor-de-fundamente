import { describe, expect, it } from "vitest";
import {
  formatMultiplier,
  formatPercent,
  formatScore,
  formatUsdCompact,
} from "@/lib/format";

describe("separator românesc (regula 8)", () => {
  it("folosește virgula ca separator zecimal, nu punctul", () => {
    expect(formatUsdCompact(63_540_000)).toBe("63,54 M$");
    expect(formatMultiplier(17.24)).toBe("17,2×");
    expect(formatScore(82.35)).toBe("82,4");
  });

  it("punctul e separator de MII, virgula de zecimale — convenția românească", () => {
    // Exact invers față de engleză: 1,234.56 (en) devine 1.234,56 (ro).
    expect(formatScore(1234.56)).toBe("1.234,6");
    expect(formatScore(1_000_000.789)).toBe("1.000.000,8");
  });

  it("zecimalele sunt întotdeauna după virgulă, niciodată după punct", () => {
    for (const v of [1.5, 1234.56, 1_000_000.789, 0.1]) {
      // Ultima parte, după ultimul separator zecimal, trebuie precedată de virgulă.
      expect(formatScore(v)).toMatch(/,\d$/);
      expect(formatMultiplier(v)).toMatch(/,\d×$/);
    }
  });
});

describe("prescurtări de mărime", () => {
  it("alege unitatea potrivită", () => {
    expect(formatUsdCompact(850)).toBe("850 $");
    expect(formatUsdCompact(12_500)).toBe("12,5 mii$");
    expect(formatUsdCompact(4_990_000)).toBe("4,99 M$");
    expect(formatUsdCompact(2_640_000_000)).toBe("2,64 Md$");
  });

  it("păstrează semnul la valori negative", () => {
    expect(formatUsdCompact(-1_500_000)).toBe("-1,5 M$");
  });

  it("zero rămâne zero, nu devine gol", () => {
    expect(formatUsdCompact(0)).toBe("0 $");
  });
});

describe("procente", () => {
  it("transformă raportul în procent", () => {
    expect(formatPercent(0.93)).toBe("93%");
    expect(formatPercent(0.0871, 1)).toBe("8,7%");
  });

  it("zero e afișat explicit, nu omis — e o măsurătoare, nu o lipsă", () => {
    expect(formatPercent(0)).toBe("0%");
  });
});
