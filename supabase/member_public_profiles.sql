-- Hồ sơ công khai: khách đọc được, chỉ quản trị viên chỉnh sửa.
create table if not exists public.member_public_profiles (
 member_number integer primary key check (member_number between 1 and 4),
 name text not null default '',
 class_name text not null default '',
 role text not null default '',
 birth date,
 intro text not null default '',
 updated_at timestamptz not null default now()
);
alter table public.member_public_profiles enable row level security;
drop policy if exists member_public_profiles_read on public.member_public_profiles;
create policy member_public_profiles_read on public.member_public_profiles
for select to anon, authenticated using (true);
-- Dùng group_profiles để xác minh vai trò quản trị theo auth.uid().
drop policy if exists member_public_profiles_admin_insert on public.member_public_profiles;
create policy member_public_profiles_admin_insert on public.member_public_profiles
for insert to authenticated with check (
 exists (select 1 from public.group_profiles gp where gp.id=auth.uid() and gp.role='admin')
);
drop policy if exists member_public_profiles_admin_update on public.member_public_profiles;
create policy member_public_profiles_admin_update on public.member_public_profiles
for update to authenticated using (
 exists (select 1 from public.group_profiles gp where gp.id=auth.uid() and gp.role='admin')
) with check (
 exists (select 1 from public.group_profiles gp where gp.id=auth.uid() and gp.role='admin')
);
drop policy if exists member_public_profiles_admin_delete on public.member_public_profiles;
create policy member_public_profiles_admin_delete on public.member_public_profiles
for delete to authenticated using (
 exists (select 1 from public.group_profiles gp where gp.id=auth.uid() and gp.role='admin')
);
