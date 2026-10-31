-- Run in Supabase SQL Editor to enable shared sources on the homepage.
create table if not exists public.research_shared_links (
 id bigint generated always as identity primary key,
 title text not null check (char_length(title) between 1 and 160),
 url text not null check (char_length(url) between 8 and 2048),
 created_by uuid references auth.users(id) default auth.uid(),
 created_at timestamptz not null default now()
);
alter table public.research_shared_links enable row level security;
drop policy if exists shared_links_read on public.research_shared_links;
create policy shared_links_read on public.research_shared_links for select to anon, authenticated using (true);
drop policy if exists shared_links_insert on public.research_shared_links;
create policy shared_links_insert on public.research_shared_links for insert to authenticated with check (
 created_by=auth.uid() and exists(select 1 from public.group_profiles p where p.user_id=auth.uid() and p.role='admin')
);
drop policy if exists shared_links_delete on public.research_shared_links;
create policy shared_links_delete on public.research_shared_links for delete to authenticated using (
 exists(select 1 from public.group_profiles p where p.user_id=auth.uid() and p.role='admin')
);
