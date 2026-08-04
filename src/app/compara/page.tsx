import type { Metadata } from "next";
import { getCachedCatalog, getCachedFinancials } from "@/lib/protocols-cached";
import { hasSufficientData } from "@/lib/scoring";
import { SiteHeader } from "@/components/SiteHeader";
import { ComparePicker } from "@/components/ComparePicker";
import { MAX_COMPARE } from "@/lib/compare";
import { PassthroughCompare } from "@/components/PassthroughCompare";
import { CompareGrid } from "@/components/CompareGrid";
import { Disclaimer } from "@/components/Disclaimer";

// Fără `revalidate` aici: pagina depinde de searchParams, deci trebuie
// randată la cerere. Datele DefiLlama rămân cache-uite o oră prin
// unstable_cache în getCachedProtocolUniverse, deci nu pierdem nimic.
export const maxDuration = 60;

export const metadata: Metadata = {
  title: "Comparație — Scor de Fundamente",
};

interface PageProps {
  searchParams: Promise<{ p?: string | string[] }>;
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { p } = await searchParams;
  const requested = (Array.isArray(p) ? p : p ? [p] : []).slice(0, MAX_COMPARE);

  const [financials, catalog] = await Promise.all([
    getCachedFinancials(),
    getCachedCatalog(),
  ]);

  // Păstrăm ordinea din URL, ignorăm slug-urile necunoscute.
  const selected = requested
    .map((slug) => catalog.find((c) => c.slug === slug))
    .filter((entry) => entry !== undefined);

  const comparable = selected
    .map((entry) => financials.find((f) => f.slug === entry.slug))
    .filter((f) => f !== undefined)
    .filter(hasSufficientData);

  const withoutData = selected.filter(
    (entry) => !comparable.some((c) => c.slug === entry.slug)
  );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[760px] flex-1 px-[18px] py-8">
        <h1 className="mb-2.5 font-serif text-[29px] font-medium tracking-[-0.01em]">
          Compară proiecte
        </h1>
        <p className="mb-5 max-w-[52ch] text-[13.5px] text-ink-soft">
          Alege până la {MAX_COMPARE} proiecte și vezi-le una lângă alta, pe aceleași
          măsurători. Cea mai utilă comparație e cât din venit ajunge la deținători — diferă
          enorm de la un protocol la altul.
        </p>

        <ComparePicker
          selected={selected.map((entry) => ({ slug: entry.slug, name: entry.name }))}
        />

        {withoutData.length > 0 && (
          <p className="mt-4 border border-dashed border-rule px-3.5 py-3 text-[12.5px] text-ink-soft">
            {withoutData.map((entry) => entry.name).join(", ")}{" "}
            {withoutData.length === 1 ? "nu publică" : "nu publică"} date on-chain
            verificabile, deci {withoutData.length === 1 ? "nu apare" : "nu apar"} în
            comparație. Nu e un scor mic — sunt date care lipsesc.
          </p>
        )}

        {comparable.length >= 2 ? (
          <article className="mt-6 border border-rule bg-sheet">
            <PassthroughCompare protocols={comparable} />
            <CompareGrid protocols={comparable} universe={financials} />
          </article>
        ) : (
          <p className="mt-6 border border-dashed border-rule px-4 py-8 text-center text-[13.5px] text-ink-soft">
            {comparable.length === 0
              ? "Adaugă două proiecte ca să începi comparația."
              : "Mai adaugă un proiect ca să ai ce compara."}
          </p>
        )}

        <Disclaimer />
      </main>
    </>
  );
}
