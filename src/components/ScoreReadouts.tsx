import type { ScoreResult } from "@/lib/scoring";
import { formatScore } from "@/lib/format";

export function ScoreReadouts({
  quality,
  economics,
  valuation,
  risk,
}: {
  quality: ScoreResult;
  economics: ScoreResult;
  valuation: ScoreResult;
  risk: ScoreResult;
}) {
  const tiles = [
    { label: "Calitate", score: quality },
    { label: "Economie", score: economics },
    { label: "Evaluare", score: valuation },
    { label: "Risc", score: risk },
  ];

  return (
    <div className="mt-[22px] grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="bg-sheet px-3 py-3.5">
          <div className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-soft">
            {tile.label}
          </div>
          {tile.score.pts !== null ? (
            <div className="font-serif text-[31px] leading-none">
              {formatScore(tile.score.pts)}
              <span className="text-xs text-absent">/{tile.score.max}</span>
            </div>
          ) : (
            <div className="pt-[9px] font-serif text-[19px] leading-none text-ink-soft">
              N/A
            </div>
          )}
          <div className="mt-2.5 h-0.5 bg-rule">
            <div
              className="h-full bg-flow"
              style={{ width: tile.score.pts !== null ? `${tile.score.pts}%` : "0%" }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
