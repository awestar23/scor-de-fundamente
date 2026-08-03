import Link from "next/link";
import { SearchBox } from "./SearchBox";

export function SiteHeader() {
  return (
    <header className="border-b border-rule bg-sheet">
      <div className="mx-auto flex max-w-[760px] flex-wrap items-center gap-x-4 gap-y-2 px-[18px] py-4">
        <Link
          href="/"
          className="flex-none font-mono text-[10.5px] uppercase tracking-[0.22em] text-flow"
        >
          Scor de Fundamente
        </Link>
        <div className="order-last min-w-[220px] flex-1 basis-full sm:order-none sm:basis-auto">
          <SearchBox placeholder="Caută alt proiect..." />
        </div>
        <Link
          href="/compara"
          className="flex-none text-[13px] text-ink-soft hover:text-ink"
        >
          Compară
        </Link>
      </div>
    </header>
  );
}
