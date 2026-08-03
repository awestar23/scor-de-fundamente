import Link from "next/link";
import { SearchBox } from "@/components/SearchBox";
import { Disclaimer } from "@/components/Disclaimer";
import { getCachedProtocolUniverse } from "@/lib/protocols-cached";
import { formatPercent, formatUsdCompact } from "@/lib/format";

export const revalidate = 3600;

export default async function Home() {
  const { financials } = await getCachedProtocolUniverse();

  // Punct de plecare pentru cine nu știe ce să caute. Ordonat după venitul
  // reținut de protocol — nu după capitalizare, ca să nu reintroducem exact
  // metrica pe care produsul o pune sub semnul întrebării.
  const topByRevenue = financials
    .filter((p) => p.revenue30d !== null && p.revenue30d > 0)
    .sort((a, b) => (b.revenue30d as number) - (a.revenue30d as number))
    .slice(0, 10);

  return (
    <main className="mx-auto w-full max-w-[760px] flex-1 px-[18px] pb-16">
      <header className="pt-10 pb-6 sm:pt-14">
        <div className="mb-3.5 font-mono text-[10.5px] uppercase tracking-[0.22em] text-flow">
          Scor de Fundamente
        </div>
        <h1 className="mb-2.5 max-w-[16ch] font-serif text-[clamp(30px,7vw,44px)] leading-[1.08] tracking-[-0.015em]">
          Înțelege <em className="text-flow italic">ce deții</em>.
        </h1>
        <p className="mb-[22px] max-w-[44ch] text-[14.5px] text-ink-soft">
          Analizăm veniturile reale, tokenomics și evaluarea unui proiect crypto pe o
          metodologie transparentă, din date on-chain publice. Îți arătăm cifrele — decizia
          rămâne a ta.
        </p>
        <SearchBox autoFocus />
      </header>

      {topByRevenue.length > 0 && (
        <section className="border border-rule bg-sheet">
          <div className="border-b border-rule px-5 py-4">
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
              Cine produce cei mai mulți bani
            </div>
            <p className="max-w-[52ch] text-[13px] text-ink-soft">
              Protocoalele cu cel mai mare venit reținut în ultimele 30 de zile. Nu e un
              clasament al celor mai bune investiții — e doar punctul de plecare, ordonat
              după cât produc, nu după cât valorează. Unele produc mult, dar nu au un token
              pe care să-l poți deține.
            </p>
          </div>

          <ul>
            {topByRevenue.map((p, i) => {
              const passthrough =
                p.revenue30d !== null && p.revenue30d > 0 && p.holdersRevenue30d !== null
                  ? p.holdersRevenue30d / p.revenue30d
                  : null;

              return (
                <li key={p.slug} className="border-b border-rule last:border-b-0">
                  <Link
                    href={`/proiect/${p.slug}`}
                    className="flex items-baseline gap-3 px-5 py-3 hover:bg-flow-pale/25"
                  >
                    <span className="w-5 flex-none font-mono text-[11px] text-absent">
                      {i + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 items-baseline gap-2">
                      <span className="truncate text-[14px] font-medium">{p.name}</span>
                      {p.symbol === null && (
                        <span className="flex-none whitespace-nowrap border border-rule px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wide text-absent">
                          fără token
                        </span>
                      )}
                    </span>
                    <span className="flex-none font-mono text-[12.5px] text-ink-soft">
                      {formatUsdCompact(p.revenue30d as number)}
                    </span>
                    <span className="w-11 flex-none text-right font-mono text-[12.5px] text-ink-soft">
                      {passthrough !== null ? formatPercent(passthrough) : "—"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="border-t border-rule px-5 py-3 font-mono text-[10.5px] uppercase tracking-wide text-absent">
            venit 30 zile · cât ajunge la deținători
          </div>
        </section>
      )}

      <Disclaimer />
    </main>
  );
}
