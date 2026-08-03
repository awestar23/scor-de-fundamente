import { formatPercent, formatUsdCompact } from "@/lib/format";

export function FlowSection({
  revenue24h,
  holdersRevenue24h,
}: {
  revenue24h: number;
  holdersRevenue24h: number;
}) {
  const passthrough = revenue24h > 0 ? holdersRevenue24h / revenue24h : 0;
  const passthroughPct = Math.round(passthrough * 100);
  const kept = revenue24h - holdersRevenue24h;

  return (
    <section className="border-b border-rule bg-gradient-to-b from-[#f4f8f7] to-sheet p-6">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
        Unde ajung banii
      </div>
      <p className="mb-6 max-w-[40ch] font-serif text-[19px] leading-[1.4]">
        Comisioanele plătite de utilizatori nu ajung automat la deținătorii de token. Aici vezi
        cât se pierde pe drum.
      </p>

      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13.5px]">Venit reținut de protocol</span>
        <span className="whitespace-nowrap font-mono text-sm font-medium">
          {formatUsdCompact(revenue24h)}
        </span>
      </div>
      <div className="h-[26px] bg-ink">
        <div className="h-full bg-ink" style={{ width: "100%" }} />
      </div>

      <div className="flex items-center gap-2.5 py-3 font-mono text-[11.5px] text-ink-soft">
        <span className="text-[15px] leading-none text-flow">↓</span>
        <span>
          <strong className="font-semibold text-flow">{formatPercent(passthrough)}</strong>{" "}
          ajunge mai departe · {formatUsdCompact(kept)} rămân în protocol
        </span>
      </div>

      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13.5px]">Ajunge la deținătorii de token</span>
        <span className="whitespace-nowrap font-mono text-sm font-medium">
          {formatUsdCompact(holdersRevenue24h)}
        </span>
      </div>
      <div className="h-[26px] bg-flow-pale">
        <div className="h-full bg-flow transition-[width]" style={{ width: `${passthroughPct}%` }} />
      </div>

      <p className="mt-[18px] max-w-[58ch] border-t border-rule pt-4 text-[13px] text-ink-soft">
        Din venitul reținut de protocol, {formatPercent(passthrough)} ajunge efectiv la
        deținătorii de token. Nu toate protocoalele funcționează așa — compară cu altele din
        aceeași categorie.
      </p>
    </section>
  );
}
