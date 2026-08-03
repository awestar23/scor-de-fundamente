import type { ProtocolFinancials } from "@/lib/protocols";
import { formatPercent, formatUsdCompact } from "@/lib/format";

/**
 * Diferențiatorul principal al produsului (regula 3.4): cât din venitul
 * reținut de protocol ajunge efectiv la deținătorii de token.
 *
 * Culoare unică pentru toate valorile — lungimea barei poartă informația.
 * Nu folosim culori de avertizare pentru procente mici: un passthrough mic
 * nu e „rău", e o alegere de design a protocolului (regula 3.1, limbaj
 * neutru). Griul e rezervat exclusiv datelor absente.
 */
export function PassthroughCompare({ protocols }: { protocols: ProtocolFinancials[] }) {
  const rows = protocols.map((p) => {
    const hasData =
      p.revenue24h !== null && p.revenue24h > 0 && p.holdersRevenue24h !== null;
    const passthrough = hasData
      ? (p.holdersRevenue24h as number) / (p.revenue24h as number)
      : null;

    return { protocol: p, passthrough };
  });

  return (
    <section className="border-b border-rule p-6">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
        Cât ajunge la deținători
      </div>
      <p className="mb-6 max-w-[44ch] font-serif text-[19px] leading-[1.4]">
        Aceeași întrebare pentru fiecare: din banii reținuți de protocol, cât se întoarce
        către cei care dețin token-ul?
      </p>

      <div className="space-y-3">
        {rows.map(({ protocol, passthrough }) => (
          <div key={protocol.slug} className="flex items-center gap-3">
            <span className="w-[92px] flex-none truncate text-[13.5px]" title={protocol.name}>
              {protocol.name}
            </span>
            <span className="relative h-4 min-w-0 flex-1 overflow-hidden bg-flow-pale">
              {passthrough !== null && (
                <span
                  className="absolute inset-y-0 left-0 bg-flow"
                  style={{ width: `${Math.min(passthrough, 1) * 100}%` }}
                />
              )}
            </span>
            <span className="w-11 flex-none text-right font-mono text-[12.5px]">
              {passthrough !== null ? formatPercent(passthrough) : "—"}
            </span>
          </div>
        ))}
      </div>

      <dl className="mt-6 space-y-2 border-t border-rule pt-4 text-[12.5px] text-ink-soft">
        {rows.map(({ protocol, passthrough }) => (
          <div key={protocol.slug} className="flex flex-wrap gap-x-1.5">
            <dt className="font-medium text-ink">{protocol.name}:</dt>
            <dd>
              {passthrough === null
                ? "nu avem defalcarea venitului către deținători pentru acest protocol."
                : `din ${formatUsdCompact(protocol.revenue24h as number)} venit reținut în 24h, ${formatUsdCompact(protocol.holdersRevenue24h as number)} ajung la deținători.`}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
