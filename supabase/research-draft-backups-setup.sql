-- Chạy trong Supabase SQL Editor: lịch sử lưu riêng cho từng bản nháp.
create table if not exists public.research_draft_backups (
 id bigint generated always as identity primary key,
 page_id integer not null references public.research_pages(id) on delete cascade,
 slot integer not null check (slot in (1,2)),
 content text not null,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists research_draft_backups_idx on public.research_draft_backups(page_id,slot,created_at);
alter table public.research_draft_backups enable row level security;
drop policy if exists draft_backup_read on public.research_draft_backups;
create policy draft_backup_read on public.research_draft_backups for select to authenticated using (
 exists(select 1 from public.research_page_assignments a where a.page_id=research_draft_backups.page_id and a.user_id=auth.uid())
 or exists(select 1 from public.group_profiles p where p.user_id=auth.uid() and p.role='admin')
);
drop policy if exists draft_backup_insert on public.research_draft_backups;
create policy draft_backup_insert on public.research_draft_backups for insert to authenticated with check (
 created_by=auth.uid() and (
 exists(select 1 from public.research_page_assignments a where a.page_id=research_draft_backups.page_id and a.user_id=auth.uid())
 or exists(select 1 from public.group_profiles p where p.user_id=auth.uid() and p.role='admin')
 ));
drop policy if exists draft_backup_delete on public.research_draft_backups;
create policy draft_backup_delete on public.research_draft_backups for delete to authenticated using (
 exists(select 1 from public.group_profiles p where p.user_id=auth.uid() and p.role='admin')
 or created_by=auth.uid()
);
