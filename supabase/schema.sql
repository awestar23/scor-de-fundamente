-- Scor de Fundamente — schema inițială (Faza 1)
-- Rulează manual în Supabase SQL Editor. Nu există migrări automate încă.
--
-- Regula 3.2 din AGENTS.md: logăm DATE BRUTE zilnic, niciodată doar scorul.
-- Formula de scoring se poate schimba oricând și se re-aplică pe acest istoric.

create table if not exists protocol_snapshots (
  id bigint generated always as identity primary key,
  snapshot_date date not null,
  protocol_slug text not null,
  protocol_name text not null,
  symbol text,
  category text,
  primary_chain text,
  -- ex. "parent#uniswap" — logat ca versiunile să poată fi re-agregate
  -- pe proiect-părinte oricând, fără să pierdem detaliul per versiune.
  parent_protocol text,

  -- valori brute din DefiLlama, în USD
  tvl numeric,
  mcap numeric,
  fees_24h numeric,
  revenue_24h numeric,
  revenue_7d numeric,
  revenue_30d numeric,
  revenue_annualized numeric,
  holders_revenue_24h numeric,

  fetched_at timestamptz not null default now(),

  constraint protocol_snapshots_unique_per_day unique (protocol_slug, snapshot_date)
);

create index if not exists protocol_snapshots_slug_idx
  on protocol_snapshots (protocol_slug, snapshot_date desc);

create index if not exists protocol_snapshots_date_idx
  on protocol_snapshots (snapshot_date);

-- Drepturi pentru rolul cu care scrie job-ul de snapshot.
--
-- Necesare pentru că proiectul are „Automatically expose new tables"
-- dezactivat (recomandarea Supabase): fără setarea aia, un tabel nou nu
-- primește automat drepturi pentru rolurile API — nici măcar service_role,
-- deși acesta ocolește RLS. Fără aceste granturi: „permission denied".
grant usage on schema public to service_role;
grant select, insert, update on table protocol_snapshots to service_role;

-- RLS rămâne activ. service_role îl ocolește oricum; contează pentru rolurile
-- publice, dacă vom expune vreodată citirea direct către browser.
alter table protocol_snapshots enable row level security;

-- Politica de citire publică e pregătită, dar inertă deocamdată: fără un
-- `grant ... to anon`, rolurile publice n-au acces la tabel. O activăm
-- deliberat când construim pagina de istoric (faza 3, punctul 9).
drop policy if exists "protocol_snapshots_public_read" on protocol_snapshots;
create policy "protocol_snapshots_public_read"
  on protocol_snapshots
  for select
  to anon, authenticated
  using (true);
