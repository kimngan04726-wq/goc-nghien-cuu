-- Lịch sử sao lưu chỉ cho Bài làm thống nhất; chạy trong Supabase SQL Editor.
create table if not exists public.research_page_backups (
 id bigint generated always as identity primary key,
 page_id integer not null references public.research_pages(id) on delete cascade,
 content text not null,
 note text not null default '',
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);
create index if not exists research_page_backups_page_created_idx on public.research_page_backups(page_id,created_at desc);
alter table public.research_page_backups enable row level security;
drop policy if exists backups_read on public.research_page_backups;
create policy backups_read on public.research_page_backups for select to authenticated using (
 exists(select 1 from public.group_profiles p where p.user_id=auth.uid() and p.role='admin')
);
drop policy if exists backups_insert on public.research_page_backups;
create policy backups_insert on public.research_page_backups for insert to authenticated with check (
 created_by=auth.uid() and exists(select 1 from public.group_profiles p where p.user_id=auth.uid() and p.role='admin')
);
drop policy if exists backups_delete on public.research_page_backups;
create policy backups_delete on public.research_page_backups for delete to authenticated using (
 exists(select 1 from public.group_profiles p where p.user_id=auth.uid() and p.role='admin')
);
-- Không có quyền UPDATE: bản sao đã tạo không thể bị sửa trực tiếp.
