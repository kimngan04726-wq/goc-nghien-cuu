-- LẦN GỐC — ĐỢT 2. Chỉ tạo bảng mới; không thay đổi bảng hiện có.
-- 1. Tạo bảng độc lập, có thể chạy lại.
create table if not exists public.matran_langoc (
  id uuid primary key default gen_random_uuid(),
  variable_name text not null default '',
  reading_ref text not null default '',
  source1_ref text not null default '',
  source2_ref text not null default '',
  stop_ref text not null default '',
  old_source_note text not null default '',
  entered_by text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Bật Row Level Security.
alter table public.matran_langoc enable row level security;

-- 3. Cấp quyền cho cả người dùng ẩn danh và đã xác thực.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.matran_langoc to anon, authenticated;

-- 4. Tạo chính sách đọc; kiểm tra tồn tại để chạy lại không lỗi.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='matran_langoc' and policyname='matran_langoc_select') then
    create policy matran_langoc_select on public.matran_langoc for select to anon, authenticated using (true);
  end if;
end $$;

-- 5. Tạo chính sách thêm.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='matran_langoc' and policyname='matran_langoc_insert') then
    create policy matran_langoc_insert on public.matran_langoc for insert to anon, authenticated with check (true);
  end if;
end $$;

-- 6. Tạo chính sách sửa.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='matran_langoc' and policyname='matran_langoc_update') then
    create policy matran_langoc_update on public.matran_langoc for update to anon, authenticated using (true) with check (true);
  end if;
end $$;

-- 7. Tạo chính sách xóa.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='matran_langoc' and policyname='matran_langoc_delete') then
    create policy matran_langoc_delete on public.matran_langoc for delete to anon, authenticated using (true);
  end if;
end $$;