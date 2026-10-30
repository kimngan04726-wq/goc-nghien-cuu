-- Chạy một lần trong Supabase SQL Editor.
-- Cấu hình giao diện chung: mọi người được đọc, chỉ admin được ghi.
create table if not exists public.site_design_settings (
 id integer primary key check (id = 1),
 config jsonb not null default '{}'::jsonb,
 updated_at timestamptz not null default now()
);
alter table public.site_design_settings enable row level security;
drop policy if exists site_design_public_read on public.site_design_settings;
create policy site_design_public_read on public.site_design_settings
for select to anon, authenticated using (true);
drop policy if exists site_design_admin_insert on public.site_design_settings;
create policy site_design_admin_insert on public.site_design_settings
for insert to authenticated with check (public.is_group_admin());
drop policy if exists site_design_admin_update on public.site_design_settings;
create policy site_design_admin_update on public.site_design_settings
for update to authenticated using (public.is_group_admin())
with check (public.is_group_admin());
drop policy if exists site_design_admin_delete on public.site_design_settings;
create policy site_design_admin_delete on public.site_design_settings
for delete to authenticated using (public.is_group_admin());
