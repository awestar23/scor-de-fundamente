"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_COMPARE } from "@/lib/compare";

interface SearchResult {
  slug: string;
  name: string;
  symbol: string | null;
  category: string | null;
}

export interface SelectedProtocol {
  slug: string;
  name: string;
}

export function ComparePicker({ selected }: { selected: SelectedProtocol[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isFull = selected.length >= MAX_COMPARE;

  useEffect(() => {
    const trimmed = query.trim();
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      if (trimmed.length < 2) {
        setResults([]);
        setOpen(false);
        return;
      }

      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { results?: SearchResult[] }) => {
          setResults(data.results ?? []);
          setOpen(true);
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

  function navigate(slugs: string[]) {
    const params = new URLSearchParams();
    for (const slug of slugs) params.append("p", slug);
    router.push(params.toString() ? `/compara?${params}` : "/compara");
  }

  function add(slug: string) {
    if (isFull || selected.some((s) => s.slug === slug)) return;
    setQuery("");
    setOpen(false);
    navigate([...selected.map((s) => s.slug), slug]);
  }

  function remove(slug: string) {
    navigate(selected.filter((s) => s.slug !== slug).map((s) => s.slug));
  }

  return (
    <div ref={containerRef} className="relative">
      {selected.length > 0 && (
        <ul className="mb-2.5 flex flex-wrap gap-2">
          {selected.map((item) => (
            <li key={item.slug}>
              <button
                type="button"
                onClick={() => remove(item.slug)}
                className="flex items-center gap-2 border border-rule bg-sheet px-2.5 py-1.5 text-[13px] hover:border-ink-soft"
                aria-label={`Scoate ${item.name} din comparație`}
              >
                {item.name}
                <span aria-hidden className="text-ink-soft">
                  ×
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        className={`flex items-center gap-2.5 border border-rule px-3.5 py-2.5 ${
          isFull ? "bg-ground" : "bg-sheet"
        }`}
      >
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
          disabled={isFull}
          placeholder={
            isFull
              ? `Maximum ${MAX_COMPARE} proiecte — scoate unul ca să adaugi altul`
              : "Adaugă un proiect în comparație"
          }
          aria-label="Adaugă un proiect în comparație"
          className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-absent disabled:cursor-not-allowed"
        />
      </div>

      {open && results.length > 0 && !isFull && (
        <ul className="absolute left-0 right-0 top-full z-10 mt-1 border border-rule bg-sheet shadow-sm">
          {results
            .filter((r) => !selected.some((s) => s.slug === r.slug))
            .map((result) => (
              <li key={result.slug}>
                <button
                  type="button"
                  onClick={() => add(result.slug)}
                  className="flex w-full items-center justify-between gap-3 border-b border-rule px-3.5 py-2.5 text-left last:border-b-0 hover:bg-flow-pale/40"
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
