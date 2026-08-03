import type { ProtocolFinancials } from "./protocols";
import { formatMultiplier, formatScore, formatUsdCompact } from "./format";

// Regula 8 (AGENTS.md): fiecare funcție de scoring întoarce { pts, max, note }.
// `note` e explicația în română afișată utilizatorului — inclusiv numerele
// din ea folosesc separatorul românesc (virgulă), prin format.ts.
// `pts` e null când nu există destule date — nu se inventează o valoare
// implicită (regula 3.3).
export interface ScoreResult {
  pts: number | null;
  max: number;
  note: string;
}

const MAX_PTS = 100;
const MIN_UNIVERSE_SIZE = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Regula 4.1: percentilă = (câte protocoale au valoare mai mică) / total.
 * Sub 8 valori valide în univers, percentila nu e fiabilă → null.
 */
export function percentile(value: number, universe: number[]): number | null {
  const valid = universe.filter((v) => Number.isFinite(v));
  if (valid.length < MIN_UNIVERSE_SIZE) return null;

  const countBelow = valid.filter((v) => v < value).length;
  return Math.round((countBelow / valid.length) * 1000) / 10;
}

/**
 * Regula 3.3: un protocol fără fee/revenue verificabil nu primește scor,
 * ci eticheta "Date insuficiente".
 */
export function hasSufficientData(protocol: ProtocolFinancials): boolean {
  return (
    protocol.revenue30d !== null ||
    protocol.revenue24h !== null ||
    protocol.fees30d !== null ||
    protocol.fees24h !== null
  );
}

// Toate dimensiunile folosesc fereastra de 30 de zile, aceeași cu cea afișată
// în interfață: o singură zi poate fi un vârf întâmplător, iar percentilele
// calculate pe alt interval decât cel afișat ar fi imposibil de verificat de
// către utilizator.
export function scoreQuality(
  protocol: ProtocolFinancials,
  universe: ProtocolFinancials[]
): ScoreResult {
  if (protocol.revenue30d === null) {
    return {
      pts: null,
      max: MAX_PTS,
      note: "Nu avem venit verificabil pentru acest protocol, deci nu putem evalua calitatea.",
    };
  }

  const revenueUniverse = universe
    .map((p) => p.revenue30d)
    .filter((v): v is number => v !== null);
  const scalePts = percentile(protocol.revenue30d, revenueUniverse);

  let trendPts: number | null = null;
  let trendRatio: number | null = null;
  if (
    protocol.revenue7d !== null &&
    protocol.revenue30d !== null &&
    protocol.revenue30d > 0
  ) {
    const avg7d = protocol.revenue7d / 7;
    const avg30d = protocol.revenue30d / 30;
    trendRatio = avg7d / avg30d;
    // Regula 4.3: tendință liniară pe raport, centrată la 1.0 (fără schimbare).
    trendPts = clamp(50 + (trendRatio - 1) * 100, 0, 100);
  }

  if (scalePts === null) {
    return {
      pts: null,
      max: MAX_PTS,
      note: "Universul de comparație e prea mic pentru o percentilă fiabilă (sub 8 protocoale cu date).",
    };
  }

  const pts =
    trendPts !== null ? Math.round(((scalePts + trendPts) / 2) * 10) / 10 : scalePts;

  const trendNote =
    trendRatio !== null
      ? ` Tendința ultimelor 7 zile e ${trendRatio >= 1 ? "+" : "-"}${formatScore(Math.abs((trendRatio - 1) * 100))}% față de media pe 30 de zile.`
      : "";

  return {
    pts,
    max: MAX_PTS,
    note: `Venitul e peste ${formatScore(scalePts)}% dintre protocoalele urmărite.${trendNote}`,
  };
}

export function scoreEconomics(
  protocol: ProtocolFinancials,
  universe: ProtocolFinancials[]
): ScoreResult {
  if (protocol.revenue30d === null || protocol.revenue30d <= 0) {
    return {
      pts: null,
      max: MAX_PTS,
      note: "Nu avem venit reținut de protocol verificabil, deci nu putem calcula procentul care ajunge la deținători.",
    };
  }
  if (protocol.holdersRevenue30d === null) {
    return {
      pts: null,
      max: MAX_PTS,
      note: "DefiLlama nu raportează încă defalcarea venitului către deținători pentru acest protocol.",
    };
  }

  const passthrough = protocol.holdersRevenue30d / protocol.revenue30d;
  const passthroughUniverse = universe
    .filter((p) => p.revenue30d !== null && p.revenue30d > 0 && p.holdersRevenue30d !== null)
    .map((p) => (p.holdersRevenue30d as number) / (p.revenue30d as number));

  const pts = percentile(passthrough, passthroughUniverse);
  const passthroughPct = formatScore(passthrough * 100);

  if (pts === null) {
    return {
      pts: null,
      max: MAX_PTS,
      note: `${passthroughPct}% din venit ajunge la deținători, dar universul de comparație e prea mic pentru o percentilă fiabilă.`,
    };
  }

  return {
    pts,
    max: MAX_PTS,
    note: `${passthroughPct}% din venitul reținut de protocol ajunge efectiv la deținătorii de token — peste ${formatScore(pts)}% dintre protocoalele urmărite.`,
  };
}

export function scoreValuation(
  protocol: ProtocolFinancials,
  universe: ProtocolFinancials[]
): ScoreResult {
  if (protocol.mcap === null || protocol.mcap <= 0) {
    return {
      pts: null,
      max: MAX_PTS,
      note: "Nu avem capitalizare de piață verificabilă pentru acest protocol, deci nu putem calcula evaluarea.",
    };
  }
  if (protocol.revenueAnnualized === null || protocol.revenueAnnualized <= 0) {
    return {
      pts: null,
      max: MAX_PTS,
      note: "Nu avem venit anualizat verificabil, deci nu putem calcula raportul preț/venit.",
    };
  }

  const ps = protocol.mcap / protocol.revenueAnnualized;
  // Regula 4.3: valuation e logaritmică pe P/S — P/S mic (ieftin) = scor mare.
  const cheapness = -Math.log(ps);

  const cheapnessUniverse = universe
    .filter(
      (p) =>
        p.mcap !== null && p.mcap > 0 && p.revenueAnnualized !== null && p.revenueAnnualized > 0
    )
    .map((p) => -Math.log((p.mcap as number) / (p.revenueAnnualized as number)));

  const pts = percentile(cheapness, cheapnessUniverse);
  const psLabel = formatMultiplier(ps);

  if (pts === null) {
    return {
      pts: null,
      max: MAX_PTS,
      note: `Capitalizarea e de ${psLabel} venitul anualizat, dar universul de comparație e prea mic pentru o percentilă fiabilă.`,
    };
  }

  return {
    pts,
    max: MAX_PTS,
    // Punem cifra venitului anualizat în text ca utilizatorul să poată
    // reface calculul: fără ea, P/S-ul pare că nu se potrivește cu venitul
    // pe 30 de zile afișat mai sus, iar un P/S de neverificat e cea mai
    // ușor de contestat cifră din tot produsul.
    note: `Capitalizare ${formatUsdCompact(protocol.mcap)} împărțită la venitul ultimelor 12 luni (${formatUsdCompact(protocol.revenueAnnualized)}) dă ${psLabel} — mai ieftin decât ${formatScore(pts)}% dintre protocoalele urmărite.`,
  };
}

const DAY_SECONDS = 86_400;
const NEW_PROJECT_DAYS = 30;
/** Peste acest raport FDV/capitalizare, majoritatea supply-ului încă nu circulă. */
const HIGH_DILUTION_RATIO = 3;

export interface RiskFlags {
  /** Urmărit public de sub 30 de zile (regula 4.4, primul semnal). */
  isNew: boolean;
  /** Capitalizare în pătrimea de jos a universului — lichiditate probabil redusă. */
  isVerySmall: boolean;
  /** FDV mult peste capitalizare: mult supply urmează să intre în circulație. */
  hasHighDilution: boolean;
  /** Fără fee-tracking: nu se poate verifica niciun venit. */
  lacksFeeTracking: boolean;
  /** Regula 4.4: 2+ semnale → eticheta „Proiect nou". */
  shouldWarn: boolean;
}

function daysSince(unixSeconds: number): number {
  return (Date.now() / 1000 - unixSeconds) / DAY_SECONDS;
}

function dilutionRatio(protocol: ProtocolFinancials): number | null {
  if (protocol.fdv === null || protocol.mcap === null || protocol.mcap <= 0) return null;
  return protocol.fdv / protocol.mcap;
}

/**
 * Regula 4.4 — semnale de piață, nu analiză de cod. Fiecare semnal e o
 * observație verificabilă, nu o judecată de valoare (regula 3.1).
 */
export function riskFlags(
  protocol: ProtocolFinancials,
  universe: ProtocolFinancials[]
): RiskFlags {
  const mcapUniverse = universe
    .map((p) => p.mcap)
    .filter((v): v is number => v !== null && v > 0);
  const mcapPercentile =
    protocol.mcap !== null && protocol.mcap > 0
      ? percentile(protocol.mcap, mcapUniverse)
      : null;

  const ratio = dilutionRatio(protocol);

  const isNew = protocol.listedAt !== null && daysSince(protocol.listedAt) < NEW_PROJECT_DAYS;
  const isVerySmall = mcapPercentile !== null && mcapPercentile < 25;
  const hasHighDilution = ratio !== null && ratio > HIGH_DILUTION_RATIO;
  const lacksFeeTracking = protocol.revenue24h === null && protocol.fees24h === null;

  const signals = [isNew, isVerySmall, hasHighDilution, lacksFeeTracking].filter(
    Boolean
  ).length;

  return {
    isNew,
    isVerySmall,
    hasHighDilution,
    lacksFeeTracking,
    shouldWarn: signals >= 2,
  };
}

/**
 * Scor de risc, construit din trei percentile disponibile gratuit: vechime,
 * scară și diluție. Punctajul mare = proiect mai vechi, mai mare și cu supply
 * majoritar deja în circulație — nu „recomandat", ci doar mai puțin expus la
 * semnalele din regula 4.4.
 *
 * Concentrarea în primele wallet-uri lipsește în continuare: cere Etherscan /
 * Solscan per chain (faza 3). Nu o aproximăm.
 */
export function scoreRisk(
  protocol: ProtocolFinancials,
  universe: ProtocolFinancials[]
): ScoreResult {
  const parts: number[] = [];
  const notes: string[] = [];

  if (protocol.listedAt !== null) {
    const ageUniverse = universe
      .map((p) => p.listedAt)
      .filter((v): v is number => v !== null)
      // Vechime = cu cât e listat mai demult, cu atât timestamp-ul e mai mic.
      .map((v) => -v);
    const agePts = percentile(-protocol.listedAt, ageUniverse);
    const days = Math.round(daysSince(protocol.listedAt));

    if (agePts !== null) parts.push(agePts);
    // Gramatică: „19 zile", dar „20 de zile" — numeralele sub 20 nu primesc „de".
    const daysLabel = days < 20 ? `${days} zile` : `${days} de zile`;
    notes.push(
      days < NEW_PROJECT_DAYS
        ? `Urmărit public de doar ${daysLabel}.`
        : `Urmărit public de ${daysLabel}.`
    );
  }

  if (protocol.mcap !== null && protocol.mcap > 0) {
    const mcapUniverse = universe
      .map((p) => p.mcap)
      .filter((v): v is number => v !== null && v > 0);
    const scalePts = percentile(protocol.mcap, mcapUniverse);
    if (scalePts !== null) {
      parts.push(scalePts);
      notes.push(`Capitalizarea e peste ${formatScore(scalePts)}% dintre proiectele măsurate.`);
    }
  }

  const ratio = dilutionRatio(protocol);
  if (ratio !== null) {
    const dilutionUniverse = universe
      .map((p) => dilutionRatio(p))
      .filter((v): v is number => v !== null && v > 0)
      .map((v) => -Math.log(v));
    const dilutionPts = percentile(-Math.log(ratio), dilutionUniverse);
    if (dilutionPts !== null) parts.push(dilutionPts);

    const circulating = Math.round((1 / ratio) * 100);
    notes.push(
      `În circulație e ${circulating}% din supply-ul total (FDV de ${formatMultiplier(ratio)} capitalizarea).`
    );
  }

  if (parts.length === 0) {
    return {
      pts: null,
      max: MAX_PTS,
      note: "Nu avem date de vechime, capitalizare sau supply pentru acest proiect.",
    };
  }

  const pts = Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 10) / 10;

  return {
    pts,
    max: MAX_PTS,
    note: `${notes.join(" ")} Concentrarea deținătorilor nu e inclusă — necesită surse suplimentare.`,
  };
}
