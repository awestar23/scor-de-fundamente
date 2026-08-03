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
