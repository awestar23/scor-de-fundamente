import { NextResponse } from "next/server";
import { getCachedProtocolUniverse } from "@/lib/protocols-cached";

// Cache-uiește răspunsul (nu doar cererile individuale către DefiLlama):
// o oră e suficient de proaspăt pentru UI și respectă rate limit-ul DefiLlama.
export const revalidate = 3600;

export async function GET() {
  try {
    const { financials } = await getCachedProtocolUniverse();
    return NextResponse.json({ protocols: financials });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Eroare necunoscută la preluarea datelor DefiLlama.",
      },
      { status: 502 }
    );
  }
}
