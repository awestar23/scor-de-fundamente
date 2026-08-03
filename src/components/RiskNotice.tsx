import type { RiskFlags } from "@/lib/scoring";

/**
 * Regula 4.4: la 2+ semnale, proiectul primește o etichetă explicită în loc
 * să fie ascuns sau penalizat tăcut. Textul enumeră ce s-a observat — sunt
 * fapte verificabile, nu o recomandare (regula 3.1).
 */
export function RiskNotice({ flags }: { flags: RiskFlags }) {
  if (!flags.shouldWarn) return null;

  const observed: string[] = [];
  if (flags.isNew) observed.push("e urmărit public de sub 30 de zile");
  if (flags.isVerySmall) observed.push("are o capitalizare mică față de restul pieței");
  if (flags.hasHighDilution)
    observed.push("are o parte mare din supply încă neintrată în circulație");
  if (flags.lacksFeeTracking) observed.push("nu are venit măsurabil public");

  return (
    <section className="border-b border-rule bg-[#faf6f0] px-6 py-4">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-flag">
        Proiect nou — istoric insuficient
      </div>
      <p className="max-w-[58ch] text-[13px] text-ink-soft">
        Scorurile de mai jos se bazează pe un istoric scurt, deci sunt mai puțin stabile decât
        la proiectele mature. Am observat că proiectul {observed.join(", ")}.
      </p>
    </section>
  );
}
