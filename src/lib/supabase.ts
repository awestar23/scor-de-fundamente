import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null = null;

/**
 * Client cu service role key — bypass RLS, doar pentru cod server-side
 * de încredere (job-ul de snapshot, route handlers interne). Nu se
 * expune niciodată către browser.
 */
export function getSupabaseServiceClient(): SupabaseClient {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Lipsesc SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY din variabilele de mediu. " +
        "Verifică .env.local (local) sau secrets-urile din GitHub Actions (CI)."
    );
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });

  return cachedClient;
}
