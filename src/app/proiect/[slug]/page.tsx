import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ProtocolFinancials } from "@/lib/protocols";
import { getCachedProtocolUniverse } from "@/lib/protocols-cached";
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

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { catalog } = await getCachedProtocolUniverse();
  const entry = catalog.find((p) => p.slug === slug);

  return {
    title: entry ? `${entry.name} — Scor de Fundamente` : "Proiect negăsit",
  };
}

export default async function ProtocolPage({ params }: PageProps) {
  const { slug } = await params;
  const { financials, catalog } = await getCachedProtocolUniverse();
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

  const passthrough =
    protocol.revenue24h !== null && protocol.revenue24h > 0 && protocol.holdersRevenue24h !== null
      ? protocol.holdersRevenue24h / protocol.revenue24h
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

      {protocol.revenue24h !== null && protocol.holdersRevenue24h !== null && (
        <FlowSection
          revenue24h={protocol.revenue24h}
          holdersRevenue24h={protocol.holdersRevenue24h}
        />
      )}

      <MeasuresList
        measures={[
          {
            label: "Venit protocol, 24h",
            valueLabel:
              protocol.revenue24h !== null ? formatUsdCompact(protocol.revenue24h) : "—",
            pts: quality.pts,
            note: quality.note,
          },
          {
            label: "Transfer către deținători",
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
