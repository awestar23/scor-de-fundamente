import { formatPercent, formatPercentVisible, formatUsdCompact } from "@/lib/format";

/**
 * Diferențiatorul produsului (regula 3.4): banii se pierd pe drum de două ori,
 * nu o dată. Utilizatorii plătesc comisioane → protocolul reține o parte →
 * din aia, o parte ajunge la deținătorii de token.
 *
 * Fiecare treaptă se afișează dacă o avem, iar cele necunoscute se marchează
 * explicit. Varianta veche cerea date complete și, când lipseau, ascundea tot
 * — exact invers decât trebuie: la Ethena, unde utilizatorii plătesc 13,92 M$
 * iar protocolul reține 28,54 mii$, tocmai scurgerea aia e lucrul cel mai util
 * de știut, iar ea dispărea fiindcă defalcarea către deținători lipsea.
 *
 * Fereastra e 30 de zile peste tot, scrisă în fiecare etichetă (regula 4.3).
 */
export function FlowSection({
  fees30d,
  revenue30d,
  holdersRevenue30d,
}: {
  fees30d: number | null;
  revenue30d: number;
  holdersRevenue30d: number | null;
}) {
  const retention = fees30d !== null && fees30d > 0 ? revenue30d / fees30d : null;
  const passthrough =
    holdersRevenue30d !== null && revenue30d > 0 ? holdersRevenue30d / revenue30d : null;

  return (
    <section className="border-b border-rule bg-gradient-to-b from-[#f4f8f7] to-sheet p-6">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
        Unde ajung banii · ultimele 30 de zile
      </div>
      <p className="mb-6 max-w-[40ch] font-serif text-[19px] leading-[1.4]">
        Comisioanele plătite de utilizatori nu ajung automat la deținătorii de token. Aici vezi
        cât se pierde pe drum.
      </p>

      {fees30d !== null && (
        <>
          <Step label="Plătit de utilizatori, 30 de zile" value={fees30d} />
          <div className="h-[26px] bg-ink" />

          <Leak>
            {retention !== null ? (
              <>
                <strong className="font-semibold text-flow">
                  {formatPercentVisible(retention)}
                </strong>{" "}
                reținut de protocol · {formatUsdCompact(fees30d - revenue30d)} merg către
                furnizorii de lichiditate, mineri sau validatori
              </>
            ) : (
              <>partea reținută de protocol nu poate fi calculată</>
            )}
          </Leak>
        </>
      )}

      <Step label="Venit reținut de protocol, 30 de zile" value={revenue30d} />
      <div
        className={fees30d !== null ? "h-[26px] bg-flow-pale" : "h-[26px] bg-ink"}
      >
        {fees30d !== null && retention !== null && (
          <div
            className="h-full bg-flow"
            style={{ width: `${Math.min(retention, 1) * 100}%` }}
          />
        )}
      </div>

      <Leak>
        {passthrough !== null ? (
          <>
            <strong className="font-semibold text-flow">
              {formatPercentVisible(passthrough)}
            </strong>{" "}
            ajunge mai departe ·{" "}
            {formatUsdCompact(revenue30d - (holdersRevenue30d as number))} rămân în protocol
          </>
        ) : (
          <>nu se știe cât ajunge la deținători — DefiLlama nu publică defalcarea</>
        )}
      </Leak>

      {passthrough !== null ? (
        <>
          <Step
            label="Ajunge la deținătorii de token, 30 de zile"
            value={holdersRevenue30d as number}
          />
          <div className="h-[26px] bg-flow-pale">
            <div
              className="h-full bg-flow"
              style={{ width: `${Math.min(passthrough, 1) * 100}%` }}
            />
          </div>
        </>
      ) : (
        <>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-[13.5px] text-ink-soft">
              Ajunge la deținătorii de token, 30 de zile
            </span>
            <span className="whitespace-nowrap font-mono text-sm text-absent">—</span>
          </div>
          <div className="h-[26px] border border-dashed border-rule bg-transparent" />
        </>
      )}

      <p className="mt-[18px] max-w-[58ch] border-t border-rule pt-4 text-[13px] text-ink-soft">
        {passthrough !== null
          ? `Din venitul reținut de protocol în ultimele 30 de zile, ${formatPercent(passthrough)} ajunge efectiv la deținătorii de token. Nu toate protocoalele funcționează așa — compară cu altele din aceeași categorie.`
          : "Ultima treaptă lipsește: DefiLlama nu publică pentru acest proiect cât din venit ajunge la deținătorii de token. Nu înseamnă zero — înseamnă că nu se poate verifica."}
      </p>
    </section>
  );
}

function Step({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <span className="text-[13.5px]">{label}</span>
      <span className="whitespace-nowrap font-mono text-sm font-medium">
        {formatUsdCompact(value)}
      </span>
    </div>
  );
}

function Leak({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 py-3 font-mono text-[11.5px] text-ink-soft">
      <span className="text-[15px] leading-none text-flow">↓</span>
      <span>{children}</span>
    </div>
  );
}
