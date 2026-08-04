import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ProtocolFinancials } from "@/lib/protocols";
import { getCachedCatalog, getCachedFinancials } from "@/lib/protocols-cached";
import {
  hasSufficientData,
  riskFlags,
  scoreEconomics,
  scoreQuality,
  scoreRisk,
  scoreValuation,
} from "@/lib/scoring";
import { RiskNotice } from "@/components/RiskNotice";
import { formatMultiplier, formatPercent, formatUsdCompact } from "@/lib/format";
import { SiteHeader } from "@/components/SiteHeader";
import { ScoreReadouts } from "@/components/ScoreReadouts";
import { FlowSection } from "@/components/FlowSection";
import { MeasuresList } from "@/components/MeasuresList";
import { HistorySection } from "@/components/HistorySection";
import { AbsentDataPanel } from "@/components/AbsentDataPanel";
import { Disclaimer } from "@/components/Disclaimer";

export const revalidate = 3600;

// Prima randare, pe cache rece, trebuie să apuce să se termine — altfel nu
// populează niciodată cache-ul și fiecare vizitator plătește din nou drumul
// complet. Sub limita implicită de 10 secunde, paginile de proiect nu se mai
// încărcau deloc: cererea era abandonată, iar click-ul părea că nu face nimic.
export const maxDuration = 60;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await getCachedCatalog();
  const entry = catalog.find((p) => p.slug === slug);

  return {
    title: entry ? `${entry.name} — Scor de Fundamente` : "Proiect negăsit",
  };
}

export default async function ProtocolPage({ params }: PageProps) {
  const { slug } = await params;
  const [financials, catalog] = await Promise.all([
    getCachedFinancials(),
    getCachedCatalog(),
  ]);
  const entry = catalog.find((p) => p.slug === slug);

  if (!entry) notFound();

  const protocol = financials.find((p) => p.slug === slug);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[760px] flex-1 px-[18px] py-8">
        {!protocol || !hasSufficientData(protocol) ? (
          <AbsentDataPanel name={entry.name} symbol={entry.symbol} />
        ) : (
          <ScoredProtocol protocol={protocol} universe={financials} />
        )}

        <Disclaimer />
      </main>
    </>
  );
}

function ScoredProtocol({
  protocol,
  universe,
}: {
  protocol: ProtocolFinancials;
  universe: ProtocolFinancials[];
}) {
  const identity = [protocol.symbol, protocol.category, protocol.primaryChain]
    .filter(Boolean)
    .join(" · ");

  const quality = scoreQuality(protocol, universe);
  const economics = scoreEconomics(protocol, universe);
  const valuation = scoreValuation(protocol, universe);
  const risk = scoreRisk(protocol, universe);
  const flags = riskFlags(protocol, universe);

  // Passthrough pe 30 de zile, aceeași fereastră ca fluxul „Unde ajung banii"
  // și ca lista de pe prima pagină — o singură zi poate fi un vârf întâmplător.
  const passthrough =
    protocol.revenue30d !== null &&
    protocol.revenue30d > 0 &&
    protocol.holdersRevenue30d !== null
      ? protocol.holdersRevenue30d / protocol.revenue30d
      : null;

  const priceToSales =
    protocol.mcap !== null &&
    protocol.mcap > 0 &&
    protocol.revenueAnnualized !== null &&
    protocol.revenueAnnualized > 0
      ? protocol.mcap / protocol.revenueAnnualized
      : null;

  return (
    <article className="border border-rule bg-sheet">
      <section className="border-b border-rule p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mb-0.5 font-serif text-[29px] font-medium tracking-[-0.01em]">
              {protocol.name}
            </h1>
            <div className="font-mono text-[11px] text-ink-soft">{identity}</div>
            {protocol.components.length > 0 && (
              <div className="mt-1.5 max-w-[46ch] text-[12px] text-ink-soft">
                Cifrele însumează {protocol.components.join(", ")}.
              </div>
            )}
            {protocol.symbol === null && (
              <div className="mt-1.5 max-w-[46ch] text-[12px] text-ink-soft">
                <strong className="font-medium text-ink">Nu are token public.</strong>{" "}
                Produce venit real, dar nu există un token pe care să-l poți deține, deci
                întrebările despre evaluare și transfer către deținători nu i se aplică.
              </div>
            )}
          </div>
          <Link
            href={`/compara?p=${protocol.slug}`}
            className="flex-none border border-rule px-2.5 py-1.5 text-[12.5px] text-ink-soft hover:border-ink-soft hover:text-ink"
          >
            Compară cu altul
          </Link>
        </div>

        <ScoreReadouts
          quality={quality}
          economics={economics}
          valuation={valuation}
          risk={risk}
        />

        <p className="mt-4 max-w-[56ch] text-[13px] text-ink-soft">
          Cele patru dimensiuni se citesc împreună. Un proiect poate avea venituri solide și, în
          același timp, o evaluare ridicată raportată la ce produce — sunt lucruri diferite.
        </p>
      </section>

      <RiskNotice flags={flags} />

      {protocol.revenue30d !== null && (
        <FlowSection
          fees30d={protocol.fees30d}
          revenue30d={protocol.revenue30d}
          holdersRevenue30d={protocol.holdersRevenue30d}
          supplySideRevenue30d={protocol.supplySideRevenue30d}
          supplySideExplanation={protocol.supplySideExplanation}
        />
      )}

      <MeasuresList
        measures={[
          {
            label: "Venit reținut de protocol, 30 de zile",
            valueLabel:
              protocol.revenue30d !== null ? formatUsdCompact(protocol.revenue30d) : "—",
            pts: quality.pts,
            note: quality.note,
          },
          {
            label: "Transfer către deținători, 30 de zile",
            valueLabel: passthrough !== null ? formatPercent(passthrough) : "—",
            pts: economics.pts,
            note: economics.note,
          },
          {
            label: "Preț raportat la venit (P/S anualizat)",
            valueLabel: priceToSales !== null ? formatMultiplier(priceToSales) : "—",
            pts: valuation.pts,
            note: valuation.note,
          },
          {
            label: "Vechime, scară și diluție",
            valueLabel:
              protocol.mcap !== null ? formatUsdCompact(protocol.mcap) : "—",
            pts: risk.pts,
            note: risk.note,
          },
        ]}
      />

      <HistorySection />
    </article>
  );
}
