-- MA TRẬN TÀI LIỆU - ĐỢT 1
-- Chỉ tạo bảng mới với tiền tố matran_; không thay đổi bảng hiện có.

-- 1. Tạo bảng lưu các dòng ma trận. Chạy lại an toàn nhờ IF NOT EXISTS.
create table if not exists public.matran_tailieu (
  id uuid primary key default gen_random_uuid(),
  reference_id text,
  title text not null default '',
  authors text not null default '',
  publication_year integer,
  context text not null default '',
  independent_variables text not null default '',
  dependent_variables text not null default '',
  mediators_moderators text not null default '',
  theory text not null default '',
  scale_items text not null default '',
  scale_sources text not null default '',
  main_results text not null default '',
  source_link text not null default '',
  entered_by text not null default '',
  source_type text not null default 'ordinary'
    check (source_type in ('ordinary','foundation')),
  approved_exception boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Bật Row Level Security cho riêng bảng ma trận.
alter table public.matran_tailieu enable row level security;

-- 3. Cho phép vai trò anon và authenticated dùng bảng ma trận.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.matran_tailieu to anon, authenticated;

-- 4. Policy đọc dữ liệu chung; DROP IF EXISTS giúp chạy lại không lỗi.
drop policy if exists matran_select on public.matran_tailieu;
create policy matran_select on public.matran_tailieu
  for select to anon, authenticated using (true);

-- 5. Policy thêm dòng.
drop policy if exists matran_insert on public.matran_tailieu;
create policy matran_insert on public.matran_tailieu
  for insert to anon, authenticated with check (true);

-- 6. Policy cập nhật dòng.
drop policy if exists matran_update on public.matran_tailieu;
create policy matran_update on public.matran_tailieu
  for update to anon, authenticated using (true) with check (true);

-- 7. Policy xóa dòng.
drop policy if exists matran_delete on public.matran_tailieu;
create policy matran_delete on public.matran_tailieu
  for delete to anon, authenticated using (true);