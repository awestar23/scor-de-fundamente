"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  slug: string;
  name: string;
  symbol: string | null;
  category: string | null;
}

export function SearchBox({
  autoFocus = false,
  placeholder = "Caută un proiect — nume sau simbol",
}: {
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      if (trimmed.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }

      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data: { results?: SearchResult[] }) => {
          setResults(data.results ?? []);
          setOpen(true);
          setActiveIndex(-1);
        })
        .catch(() => {
          // cerere anulată sau eșuată — nu blocăm interfața
        });
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goTo(slug: string) {
    setOpen(false);
    setQuery("");
    router.push(`/proiect/${slug}`);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const target = results[activeIndex] ?? results[0];
      if (target) goTo(target.slug);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2.5 border border-rule bg-sheet px-3.5 py-2.5">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="flex-none text-ink-soft"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-label="Caută un proiect"
          className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-absent"
        />
      </div>

      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 border border-rule bg-sheet shadow-sm">
          {results.map((result, index) => (
            <li key={result.slug}>
              <button
                type="button"
                onClick={() => goTo(result.slug)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full items-center justify-between gap-3 border-b border-rule px-3.5 py-2.5 text-left last:border-b-0 ${
                  index === activeIndex ? "bg-flow-pale/40" : ""
                }`}
              >
                <span className="text-sm font-medium">{result.name}</span>
                <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                  {result.symbol ?? result.category ?? ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
