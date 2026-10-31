# Đợt SQL 01 — Thêm version cho research_pages (CHỜ DUYỆT)

Mục đích duy nhất: bổ sung cột `version bigint NOT NULL DEFAULT 0` cho bảng hiện có `public.research_pages`. Không thay đổi nội dung, phân quyền, hoặc số dòng.

## SQL chạy thử (dán toàn khối vào Supabase SQL Editor)

```sql
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';

SELECT 'TRUOC' AS moc, COUNT(*) AS so_dong FROM public.research_pages;

ALTER TABLE public.research_pages
  ADD COLUMN version bigint NOT NULL DEFAULT 0;

SELECT 'SAU' AS moc, COUNT(*) AS so_dong,
       COUNT(*) FILTER (WHERE version = 0) AS phien_ban_bang_0,
       COUNT(*) FILTER (WHERE version IS NULL) AS phien_ban_null
FROM public.research_pages;

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'research_pages'
  AND column_name = 'version';

ROLLBACK;
```

Điều kiện ĐẠT: hai lần đếm dòng bằng nhau; `phien_ban_bang_0 = so_dong`, `phien_ban_null = 0`; cột là `bigint NOT NULL DEFAULT 0`. Nếu cột đã tồn tại, lệnh sẽ lỗi và phải dừng để rà soát, không tự động chạy tiếp.

## SQL COMMIT — CHƯA ĐƯỢC PHÉP CHẠY

Chỉ thay `ROLLBACK` cuối khối thành `COMMIT` sau khi đã gửi kết quả thử và được duyệt riêng.

## Hoàn tác cấu trúc — CHỈ CHUẨN BỊ, KHÔNG CHẠY

```sql
BEGIN;
ALTER TABLE public.research_pages DROP COLUMN version;
COMMIT;
```

**Cảnh báo:** `DROP COLUMN` làm mất dữ liệu version; đây là lệnh nguy hiểm, phải xin phê duyệt riêng. Không áp dụng hoàn tác sau khi website bắt đầu ghi version nếu chưa có phương án giữ dữ liệu.

## Tác động

- `research_pages`: `SELECT COUNT`, `ALTER TABLE ADD COLUMN`, kiểm tra metadata. Không đổi số dòng hay nội dung.
- Các bảng khác: không chạm.
- RLS: không đổi.
- Website: phiên bản đang chạy vẫn hoạt động vì chỉ thêm cột có mặc định; mã đọc/ghi version sẽ triển khai trên nhánh `feature/mvp-live-integration-review` trong đợt sau. **Cột version tự nó chưa chống ghi đè; cần RPC kiểm tra phiên bản nguyên tử trước khi bật autosave.**

## Thứ tự

1. Chạy SQL thử với `ROLLBACK`, gửi kết quả.
2. Duyệt đợt 01.
3. Chạy bản `COMMIT` sau khi được duyệt.
4. Bổ sung RPC kiểm tra version và website ở nhánh riêng; kiểm tra quyền và xung đột trước khi merge.
