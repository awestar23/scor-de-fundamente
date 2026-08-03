// Rulat zilnic de GitHub Actions (vezi .github/workflows/daily-snapshot.yml)
// și manual local via `npm run snapshot`.
//
// Regula 3.2 (AGENTS.md): salvăm DATE BRUTE, niciodată doar scorul —
// formula de scoring se poate schimba oricând și se re-aplică pe istoric.

import "dotenv/config";
import { getRawProtocolRows } from "../src/lib/protocols";
import { getSupabaseServiceClient } from "../src/lib/supabase";

const BATCH_SIZE = 200;

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function main() {
  const snapshotDate = todayUtcDateString();
  console.log(`[snapshot] Preiau date DefiLlama pentru ${snapshotDate}...`);

  const raw = await getRawProtocolRows();
  console.log(
    `[snapshot] ${raw.length} protocoale cu date de fee-tracking primite de la DefiLlama.`
  );

  if (raw.length === 0) {
    throw new Error(
      "DefiLlama a răspuns cu 0 protocoale — oprire fără scriere, ca să nu suprascriem istoricul cu date goale."
    );
  }

  const rows = raw.map((p) => ({
    snapshot_date: snapshotDate,
    protocol_slug: p.slug,
    protocol_name: p.name,
    symbol: p.symbol,
    category: p.category,
    primary_chain: p.primaryChain,
    parent_protocol: p.parentProtocol,
    tvl: p.tvl,
    mcap: p.mcap,
    fees_24h: p.fees24h,
    revenue_24h: p.revenue24h,
    revenue_7d: p.revenue7d,
    revenue_30d: p.revenue30d,
    revenue_annualized: p.revenueAnnualized,
    holders_revenue_24h: p.holdersRevenue24h,
  }));

  const supabase = getSupabaseServiceClient();

  let saved = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("protocol_snapshots")
      .upsert(batch, { onConflict: "protocol_slug,snapshot_date" });

    if (error) {
      throw new Error(
        `[snapshot] Upsert eșuat la batch-ul ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`
      );
    }

    saved += batch.length;
    console.log(`[snapshot] Salvate ${saved}/${rows.length}...`);
  }

  console.log(`[snapshot] Gata. ${saved} protocoale salvate pentru ${snapshotDate}.`);
}

main().catch((error) => {
  console.error("[snapshot] Eșuat:", error);
  process.exitCode = 1;
});
