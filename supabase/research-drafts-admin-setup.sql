-- 01: Run once in Supabase SQL Editor. Existing research_pages is untouched.
create table if not exists public.research_drafts (
  page_id integer not null references public.research_pages(id) on delete cascade,
  slot smallint not null check (slot in (1,2)),
  content text not null default '',
  author_id uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key (page_id,slot)
);
alter table public.research_drafts enable row level security;
-- Admin-only write access for initial testing; member assignment comes later.
drop policy if exists research_drafts_admin_read on public.research_drafts;
create policy research_drafts_admin_read on public.research_drafts
 for select to authenticated using (
 exists(select 1 from public.group_profiles p where p.user_id=(select auth.uid()) and p.role='admin')
 );
drop policy if exists research_drafts_admin_insert on public.research_drafts;
create policy research_drafts_admin_insert on public.research_drafts
 for insert to authenticated with check (
 author_id=(select auth.uid()) and
 exists(select 1 from public.group_profiles p where p.user_id=(select auth.uid()) and p.role='admin')
 );
drop policy if exists research_drafts_admin_update on public.research_drafts;
create policy research_drafts_admin_update on public.research_drafts
 for update to authenticated using (
 exists(select 1 from public.group_profiles p where p.user_id=(select auth.uid()) and p.role='admin')
 ) with check (
 exists(select 1 from public.group_profiles p where p.user_id=(select auth.uid()) and p.role='admin')
 );
-- Members get separate slot-level policies after accounts and assignments exist.
