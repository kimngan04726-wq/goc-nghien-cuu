-- CHI PROJECT SUPABASE THU. Khong chay tren production.
-- Va quyen tren bang da duoc tao boi mvp-trang-a-once.sql.
-- Khong xoa, khong sua du lieu; khong tao lai bang/RPC/policy.
-- Chay bang SQL Editor project THU, sau do kiem tra voi Admin Auth session.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';

-- Table-level UPDATE cu phai thu hoi; column-level UPDATE co the duoc cap rieng.
REVOKE UPDATE ON TABLE public.mvp_subsections FROM PUBLIC, anon, authenticated;
-- Phong truong hop truoc do co cap UPDATE rieng tung cot.
REVOKE UPDATE (
 task_key, subsection_key, title, owner_id, status, content, version, edited_by, edited_at
) ON TABLE public.mvp_subsections FROM PUBLIC, anon, authenticated;

-- Chi authenticated duoc phep UPDATE truc tiep owner_id.
-- Policy mvp_admin_update da co se gioi han role admin.
GRANT UPDATE (owner_id) ON TABLE public.mvp_subsections TO authenticated;
COMMIT;

-- Kiem tra quyen cot (chi doc, chay rieng neu can):
-- SELECT column_name,
--   has_column_privilege('authenticated', 'public.mvp_subsections', column_name, 'UPDATE') AS authenticated_can_update
-- FROM information_schema.columns
-- WHERE table_schema='public' AND table_name='mvp_subsections'
-- ORDER BY ordinal_position;
-- Mong doi: owner_id=true; tat ca cot khac=false.
--
-- Luu y: SQL Editor chay bang vai tro quan tri, khong phai session Admin Auth.
-- De test .update({content:...}) bi tu choi, phai dang nhap qua supabase-js
-- voi publishable/anon key tren project THU (xem mvp/test-ui.html).
-- RPC SECURITY DEFINER van co the UPDATE content/status/version sau khi
-- tu kiem tra quyen, version va trang thai.
