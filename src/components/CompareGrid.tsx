import type { ProtocolFinancials } from "@/lib/protocols";
import {
  scoreEconomics,
  scoreQuality,
  scoreRisk,
  scoreValuation,
  type ScoreResult,
} from "@/lib/scoring";
import { formatMultiplier, formatScore, formatUsdCompact } from "@/lib/format";

function scoreCell(score: ScoreResult) {
  if (score.pts === null) {
    return <span className="font-serif text-[17px] text-ink-soft">N/A</span>;
  }
  return (
    <span className="font-serif text-[22px]">
      {formatScore(score.pts)}
      <span className="text-[11px] text-absent">/{score.max}</span>
    </span>
  );
}

function priceToSales(p: ProtocolFinancials): number | null {
  if (p.mcap === null || p.mcap <= 0) return null;
  if (p.revenueAnnualized === null || p.revenueAnnualized <= 0) return null;
  return p.mcap / p.revenueAnnualized;
}

export function CompareGrid({
  protocols,
  universe,
}: {
  protocols: ProtocolFinancials[];
  universe: ProtocolFinancials[];
}) {
  const scored = protocols.map((p) => ({
    protocol: p,
    quality: scoreQuality(p, universe),
    economics: scoreEconomics(p, universe),
    valuation: scoreValuation(p, universe),
    risk: scoreRisk(p, universe),
  }));

  const dimensions = [
    { label: "Calitate", pick: (s: (typeof scored)[number]) => scoreCell(s.quality) },
    { label: "Economie", pick: (s: (typeof scored)[number]) => scoreCell(s.economics) },
    { label: "Evaluare", pick: (s: (typeof scored)[number]) => scoreCell(s.valuation) },
    { label: "Risc", pick: (s: (typeof scored)[number]) => scoreCell(s.risk) },
  ];

  const rawRows = [
    {
      label: "Venit reținut, 24h",
      pick: (p: ProtocolFinancials) =>
        p.revenue24h !== null ? formatUsdCompact(p.revenue24h) : "—",
    },
    {
      label: "Ajunge la deținători, 24h",
      pick: (p: ProtocolFinancials) =>
        p.holdersRevenue24h !== null ? formatUsdCompact(p.holdersRevenue24h) : "—",
    },
    {
      label: "Fee-uri plătite de utilizatori, 24h",
      pick: (p: ProtocolFinancials) =>
        p.fees24h !== null ? formatUsdCompact(p.fees24h) : "—",
    },
    {
      label: "Capitalizare",
      pick: (p: ProtocolFinancials) => (p.mcap !== null ? formatUsdCompact(p.mcap) : "—"),
    },
    {
      label: "FDV (supply integral)",
      pick: (p: ProtocolFinancials) => (p.fdv !== null ? formatUsdCompact(p.fdv) : "—"),
    },
    {
      label: "P/S anualizat",
      pick: (p: ProtocolFinancials) => {
        const ps = priceToSales(p);
        return ps !== null ? formatMultiplier(ps) : "—";
      },
    },
  ];

  return (
    <>
      <section className="border-b border-rule p-6">
        <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          Dimensiuni · percentilă față de restul pieței
        </div>

        <div className="-mx-6 overflow-x-auto px-6">
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr>
                <th className="w-[140px] border-b border-rule pb-2 text-left font-mono text-[10px] font-normal uppercase tracking-wide text-ink-soft">
                  Dimensiune
                </th>
                {scored.map((s) => (
                  <th
                    key={s.protocol.slug}
                    className="border-b border-rule pb-2 text-left text-[13px] font-medium"
                  >
                    {s.protocol.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dimensions.map((dim) => (
                <tr key={dim.label}>
                  <th className="border-b border-dotted border-rule py-3 text-left text-[13px] font-normal text-ink-soft">
                    {dim.label}
                  </th>
                  {scored.map((s) => (
                    <td
                      key={s.protocol.slug}
                      className="border-b border-dotted border-rule py-3 align-middle"
                    >
                      {dim.pick(s)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 max-w-[56ch] text-[12.5px] text-ink-soft">
          Scorurile sunt percentile față de toate protocoalele cu date măsurabile, nu note
          absolute. {"„N/A”"} înseamnă că lipsesc datele necesare — nu un scor mic.
        </p>
      </section>

      <section className="p-6">
        <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
          Cifrele brute
        </div>

        <div className="-mx-6 overflow-x-auto px-6">
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr>
                <th className="w-[140px] border-b border-rule pb-2 text-left font-mono text-[10px] font-normal uppercase tracking-wide text-ink-soft">
                  Măsură
                </th>
                {protocols.map((p) => (
                  <th
                    key={p.slug}
                    className="border-b border-rule pb-2 text-left text-[13px] font-medium"
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawRows.map((row) => (
                <tr key={row.label}>
                  <th className="border-b border-dotted border-rule py-2.5 text-left text-[13px] font-normal text-ink-soft">
                    {row.label}
                  </th>
                  {protocols.map((p) => (
                    <td
                      key={p.slug}
                      className="border-b border-dotted border-rule py-2.5 font-mono text-[12.5px]"
                    >
                      {row.pick(p)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
