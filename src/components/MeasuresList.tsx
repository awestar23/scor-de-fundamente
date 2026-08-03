interface Measure {
  label: string;
  valueLabel: string;
  pts: number | null;
  note: string;
}

export function MeasuresList({ measures }: { measures: Measure[] }) {
  return (
    <section className="border-b border-rule p-6">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-soft">
        Măsurători · poziția față de restul pieței
      </div>
      {measures.map((m) => (
        <MeasureRow key={m.label} {...m} />
      ))}
    </section>
  );
}

function MeasureRow({ label, valueLabel, pts, note }: Measure) {
  return (
    <div className="border-b border-dotted border-rule py-4 last:border-b-0 last:pb-0.5">
      <div className="mb-2.5 flex items-baseline justify-between gap-3.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="whitespace-nowrap font-mono text-sm">{valueLabel}</span>
      </div>
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-[9px] h-px bg-rule" />
        {[0, 25, 50, 75, 100].map((tick) => (
          <span
            key={tick}
            className="absolute top-[5px] h-2.5 w-px bg-rule"
            style={{ left: `${tick}%` }}
          />
        ))}
        {pts !== null && (
          <span
            className="absolute top-1 -ml-[5.5px] h-2.5 w-2.5 rounded-full border-2 border-sheet bg-flow shadow-[0_0_0_1px_var(--color-flow)]"
            style={{ left: `${pts}%` }}
          />
        )}
      </div>
      <p className="mt-2.5 text-[12.5px] text-ink-soft">{note}</p>
    </div>
  );
}
