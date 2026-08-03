export function AbsentDataPanel({ name, symbol }: { name: string; symbol: string | null }) {
  return (
    <article className="border border-dashed border-rule">
      <section className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="mb-0.5 font-serif text-[29px] font-medium tracking-[-0.01em] text-ink-soft">
              {name}
            </h2>
            {symbol && (
              <div className="font-mono text-[11px] text-ink-soft">{symbol}</div>
            )}
          </div>
          <div className="border border-rule px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-soft">
            Nemăsurabil
          </div>
        </div>

        <div className="mt-[18px] flex items-start gap-3.5">
          <div className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full border border-dashed border-absent font-mono text-[15px] text-absent">
            —
          </div>
          <p className="max-w-[50ch] text-[13.5px] text-ink-soft">
            <strong className="font-medium text-ink">Date insuficiente.</strong> Acest proiect
            nu publică date de venit on-chain pe care să le putem verifica. Nu calculăm un scor,
            pentru că nu am avea pe ce să-l bazăm.
            <br />
            <br />
            Asta nu înseamnă că proiectul e slab sau bun — înseamnă că metoda noastră nu i se
            poate aplica momentan.
          </p>
        </div>
      </section>
    </article>
  );
}
