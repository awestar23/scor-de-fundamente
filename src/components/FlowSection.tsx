import { formatPercent, formatUsdCompact } from "@/lib/format";

/**
 * Diferențiatorul produsului (regula 3.4). Fereastra de timp e scrisă în
 * fiecare etichetă: fără ea, „777 mii$" nu înseamnă nimic — utilizatorul nu
 * poate ști dacă e pe zi, pe lună sau total.
 *
 * Folosim 30 de zile, nu 24h: o singură zi poate fi un vârf întâmplător, iar
 * asta e cifra pe care se sprijină toată teza produsului. Aceeași fereastră
 * ca pe prima pagină, ca cifrele să se poată compara între ecrane.
 */
export function FlowSection({
  revenue30d,
  holdersRevenue30d,
}: {
  revenue30d: number;
  holdersRevenue30d: number;
}) {
  const passthrough = revenue30d > 0 ? holdersRevenue30d / revenue30d : 0;
  const kept = revenue30d - holdersRevenue30d;

  return (
    <section className="border-b border-rule bg-gradient-to-b from-[#f4f8f7] to-sheet p-6">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
        Unde ajung banii · ultimele 30 de zile
      </div>
      <p className="mb-6 max-w-[40ch] font-serif text-[19px] leading-[1.4]">
        Comisioanele plătite de utilizatori nu ajung automat la deținătorii de token. Aici vezi
        cât se pierde pe drum.
      </p>

      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13.5px]">Venit reținut de protocol, 30 de zile</span>
        <span className="whitespace-nowrap font-mono text-sm font-medium">
          {formatUsdCompact(revenue30d)}
        </span>
      </div>
      <div className="h-[26px] bg-ink" />

      <div className="flex items-center gap-2.5 py-3 font-mono text-[11.5px] text-ink-soft">
        <span className="text-[15px] leading-none text-flow">↓</span>
        <span>
          <strong className="font-semibold text-flow">{formatPercent(passthrough)}</strong>{" "}
          ajunge mai departe · {formatUsdCompact(kept)} rămân în protocol
        </span>
      </div>

      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13.5px]">Ajunge la deținătorii de token, 30 de zile</span>
        <span className="whitespace-nowrap font-mono text-sm font-medium">
          {formatUsdCompact(holdersRevenue30d)}
        </span>
      </div>
      <div className="h-[26px] bg-flow-pale">
        <div
          className="h-full bg-flow"
          style={{ width: `${Math.min(passthrough, 1) * 100}%` }}
        />
      </div>

      <p className="mt-[18px] max-w-[58ch] border-t border-rule pt-4 text-[13px] text-ink-soft">
        Din venitul reținut de protocol în ultimele 30 de zile,{" "}
        {formatPercent(passthrough)} ajunge efectiv la deținătorii de token. Nu toate
        protocoalele funcționează așa — compară cu altele din aceeași categorie.
      </p>
    </section>
  );
}
