# Cổng triển khai MVP — chỉ dự án Supabase thử nghiệm

**Không chạy SQL trên Supabase thật. Không merge nhánh này khi chưa có duyệt.**

## 1. Sao lưu dự án thật trước khi làm gì khác

Trên máy đã cài Supabase CLI và PostgreSQL client, sử dụng URL kết nối **database thật** từ Dashboard → Connect (không dán mật khẩu vào GitHub):

```bash
mkdir -p backups
read -rsp "Production database URL: " PROD_DB_URL; echo
pg_dump --dbname="$PROD_DB_URL" --format=custom --no-owner --no-acl --file="backups/production-$(date +%Y%m%d-%H%M%S).dump"
unset PROD_DB_URL
```

Kiểm tra file bằng `pg_restore --list backups/production-YYYYMMDD-HHMMSS.dump`. Lưu bản sao ở nơi bảo mật, ngoài repository. Không commit file backup. Xác minh quy trình phục hồi trước khi triển khai.

## 2. Tạo dự án Supabase THỬ NGHIỆM

1. Vào https://supabase.com/dashboard → **New project** → đặt tên `goc-nghien-cuu-mvp-test` và mật khẩu database riêng.
2. Vào Project Settings → API Keys, lấy **Project URL** và **publishable/anon key**. Không đưa `service_role` hoặc mật khẩu database vào trình duyệt.
3. Dùng schema đã rà soát từ bản backup để tạo cấu trúc cần thiết trong dự án thử nghiệm. Không khôi phục dữ liệu cá nhân hoặc dữ liệu nghiên cứu nhạy cảm nếu chưa được phép; ưu tiên dữ liệu giả.
4. Xác minh các bảng `research_pages`, `group_profiles`, `research_page_assignments`, RLS và các RPC có đúng cấu trúc/ quyền trước khi tạo chính sách cho subsection.
5. Chỉ khi schema thử nghiệm và quyền đã được xác nhận mới chạy migration đã duyệt trên **dự án thử nghiệm**.

## 3. Quy tắc chặn phát hành

- Trang A: 7 mục theo dữ liệu nguồn; phân công người phụ trách; 4 trạng thái; lưu theo mục có kiểm tra phiên bản.
- Quyền ghi phải được kiểm soát tại Supabase bằng RLS/RPC, không chỉ bằng giao diện.
- Website chính chỉ nhận thay đổi từ nhánh `feature/mvp-live-integration-review` sau khi người dùng duyệt.
- Trang B, bình luận, lịch sử giao diện và các tính năng phụ ngoài phạm vi.
