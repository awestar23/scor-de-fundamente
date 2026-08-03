// Regula 8 (AGENTS.md): toate valorile monetare în USD, afișate cu
// separator românesc (virgulă zecimală, punct la mii).

const RO_NUMBER = new Intl.NumberFormat("ro-RO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** 63540000 → "63,54 M$" · 4990000000 → "4,99 Md$" · 850 → "850 $" */
export function formatUsdCompact(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}${RO_NUMBER.format(abs / 1_000_000_000)} Md$`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${RO_NUMBER.format(abs / 1_000_000)} M$`;
  }
  if (abs >= 1_000) {
    return `${sign}${RO_NUMBER.format(abs / 1_000)} mii$`;
  }
  return `${sign}${RO_NUMBER.format(abs)} $`;
}

/** 0.934 → "93%" */
export function formatPercent(value: number, decimals = 0): string {
  return `${new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value * 100)}%`;
}

/**
 * Ca `formatPercent`, dar garantează că o valoare diferită de zero nu se
 * afișează niciodată ca „0%". Adaugă zecimale până devine vizibilă.
 *
 * Necesar fiindcă diferența dintre „nimic" și „foarte puțin" e exact ce
 * predă produsul: Ethena reține 0,2% din comisioane, iar rotunjirea la „0%"
 * ar spune altceva decât realitatea.
 */
export function formatPercentVisible(value: number): string {
  if (value === 0) return "0%";

  for (const decimals of [0, 1, 2, 3]) {
    const text = formatPercent(value, decimals);
    if (!/^0(,0*)?%$/.test(text)) return text;
  }

  // Sub 0,001% — spunem că e sub prag, nu că e zero.
  return value > 0 ? "<0,001%" : ">-0,001%";
}

/** 17.234 → "17,2×" */
export function formatMultiplier(value: number): string {
  return `${new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}×`;
}

/** 82.3 → "82,3" */
export function formatScore(value: number): string {
  return new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}
