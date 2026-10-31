-- Run in Supabase SQL Editor before enabling shared drafts.
create table if not exists public.research_drafts (
  page_id integer not null references public.research_pages(id) on delete cascade,
  slot smallint not null check (slot in (1,2)),
  content text not null default '',
  author_id uuid not null default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key(page_id,slot)
);
alter table public.research_drafts enable row level security;
-- Authenticated readers can compare both drafts. Do not allow anonymous reads.
create policy "Authenticated users read research drafts" on public.research_drafts for select to authenticated using (true);
-- Authors own their slot; an admin assignment policy must be added separately if needed.
create policy "Authors insert own drafts" on public.research_drafts for insert to authenticated with check (author_id = auth.uid());
create policy "Authors update own drafts" on public.research_drafts for update to authenticated using (author_id = auth.uid()) with check (author_id = auth.uid());
-- Important: policies above are a starting point, not a verified page-assignment model.
-- Verify membership and research page permissions before running on production.
