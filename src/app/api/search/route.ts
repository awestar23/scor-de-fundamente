import { NextResponse } from "next/server";
import { getCachedProtocolUniverse } from "@/lib/protocols-cached";
import { searchProtocols } from "@/lib/search";

export const revalidate = 3600;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";

  if (query.trim().length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const { catalog } = await getCachedProtocolUniverse();
    const matches = searchProtocols(query, catalog, 8);

    return NextResponse.json({
      results: matches.map((p) => ({
        slug: p.slug,
        name: p.name,
        symbol: p.symbol,
        category: p.category,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Eroare necunoscută la căutare.",
      },
      { status: 502 }
    );
  }
}
