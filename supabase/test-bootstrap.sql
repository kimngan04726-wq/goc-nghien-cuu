-- CHI DANH CHO PROJECT SUPABASE THU TRONG. KHONG CHAY TREN PRODUCTION.
-- Chay file nay TRUOC supabase/mvp-trang-a-once.sql.
BEGIN;
CREATE TABLE public.group_profiles (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id),
 display_name text,
 role text NOT NULL CHECK(role IN ('admin','member'))
);
ALTER TABLE public.group_profiles ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.is_group_admin() RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
 AS $$ SELECT EXISTS(SELECT 1 FROM public.group_profiles p
 WHERE p.user_id=(SELECT auth.uid()) AND p.role='admin') $$;
REVOKE ALL ON FUNCTION public.is_group_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_group_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_group_admin() TO authenticated;
CREATE POLICY test_profiles_read ON public.group_profiles FOR SELECT TO authenticated
 USING(user_id=(SELECT auth.uid()) OR public.is_group_admin());
GRANT SELECT ON public.group_profiles TO authenticated;
-- Bang gia lap tuy chon: MVP SQL khong tham chieu research_pages.
CREATE TABLE public.research_pages (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 title text NOT NULL DEFAULT '',
 content text NOT NULL DEFAULT '',
 version bigint NOT NULL DEFAULT 0 CHECK(version>=0)
);
ALTER TABLE public.research_pages ENABLE ROW LEVEL SECURITY;
-- Khong GRANT, khong policy: client khong the doc/ghi bang gia lap nay.
INSERT INTO public.research_pages(title,content)
 VALUES('Trang mau','Chi la du lieu gia lap project thu');
COMMIT;

-- TAO DU LIEU MAU CO QUYEN: vao Supabase test > Authentication > Users,
-- tao 2 user thu, copy UUID va thay hai placeholder trong lenh sau.
-- CHI CHAY LENH NAY TREN PROJECT THU:
-- INSERT INTO public.group_profiles(user_id,display_name,role) VALUES
-- ('UUID_ADMIN_THU','Admin thu','admin'),
-- ('UUID_MEMBER_THU','Thanh vien thu','member');
-- UUID phai la UUID that trong auth.users; khong dung placeholder nguyen van.
--
-- THU TU: (1) file nay (2) mvp-trang-a-once.sql (3) tao 2 Auth users
-- (4) INSERT profiles o tren (5) SELECT kiem tra:
-- SELECT task_key,count(*) FROM public.mvp_subsections GROUP BY 1 ORDER BY 1;
-- SELECT count(*) FROM public.mvp_subsections; -- 51
--
-- MVP SQL tham chieu nhung KHONG tao:
--   public.group_profiles (bang), public.is_group_admin() (ham),
--   auth.users (bang Supabase quan ly), auth.uid() (ham Supabase quan ly),
--   authenticated va anon (roles Supabase quan ly), pg_tables (catalog PostgreSQL).
-- Khong tham chieu policy co san nao theo ten.
-- MVP SQL TU tao: public.mvp_subsections, mvp_read, mvp_admin_update,
--   public.mvp_save_subsection(smallint,text,bigint,text,text).
-- KHONG chay lai MVP SQL tren project da co bang mvp_subsections.
