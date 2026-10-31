-- MVP Trang A: CHỈ TẠO MỚI. Chạy một lần trong Supabase SQL Editor.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';

CREATE TABLE public.mvp_subsections (
 task_key smallint NOT NULL CHECK (task_key BETWEEN 1 AND 7),
 subsection_key text NOT NULL,
 title text NOT NULL,
 owner_id uuid REFERENCES auth.users(id),
 status text NOT NULL DEFAULT 'Chưa viết' CHECK (status IN ('Chưa viết','Đang viết','Chờ duyệt','Đã duyệt')),
 content text NOT NULL DEFAULT '',
 version bigint NOT NULL DEFAULT 0 CHECK (version >= 0),
 edited_by uuid REFERENCES auth.users(id),
 edited_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (task_key, subsection_key)
);
CREATE INDEX mvp_subsections_owner_idx ON public.mvp_subsections(owner_id);
ALTER TABLE public.mvp_subsections ENABLE ROW LEVEL SECURITY;
CREATE POLICY mvp_read ON public.mvp_subsections FOR SELECT TO authenticated USING (
 EXISTS (SELECT 1 FROM public.group_profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.role IN ('admin','member'))
);
-- Chỉ admin được giao người và quản lý cấu hình trực tiếp; nội dung lưu qua RPC.
CREATE POLICY mvp_admin_update ON public.mvp_subsections FOR UPDATE TO authenticated
 USING (public.is_group_admin()) WITH CHECK (public.is_group_admin());
GRANT SELECT, UPDATE ON public.mvp_subsections TO authenticated;

CREATE FUNCTION public.mvp_save_subsection(
 p_task_key smallint, p_subsection_key text, p_expected_version bigint,
 p_content text, p_status text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v public.mvp_subsections%ROWTYPE; v_admin boolean; v_user uuid := auth.uid(); v_next text;
BEGIN
 IF v_user IS NULL OR p_content IS NULL THEN RETURN jsonb_build_object('result','forbidden'); END IF;
 SELECT EXISTS(SELECT 1 FROM public.group_profiles WHERE user_id=v_user AND role='admin') INTO v_admin;
 SELECT * INTO v FROM public.mvp_subsections
 WHERE task_key=p_task_key AND subsection_key=p_subsection_key FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('result','not_found'); END IF;
 IF NOT v_admin AND NOT EXISTS (
  SELECT 1 FROM public.group_profiles WHERE user_id=v_user AND role='member'
 ) THEN RETURN jsonb_build_object('result','forbidden'); END IF;
 IF NOT v_admin AND v.owner_id IS DISTINCT FROM v_user THEN
  RETURN jsonb_build_object('result','forbidden');
 END IF;
 IF v.version <> p_expected_version THEN
  RETURN jsonb_build_object('result','conflict','version',v.version,'content',v.content,'status',v.status);
 END IF;
 v_next := coalesce(p_status,v.status);
 IF v_next NOT IN ('Chưa viết','Đang viết','Chờ duyệt','Đã duyệt') THEN
  RETURN jsonb_build_object('result','invalid_status');
 END IF;
 IF NOT v_admin AND (v.status='Đã duyệt' OR v_next='Đã duyệt') THEN
  RETURN jsonb_build_object('result','forbidden');
 END IF;
 UPDATE public.mvp_subsections SET content=p_content,status=v_next,
  version=version+1,edited_by=v_user,edited_at=now()
 WHERE task_key=p_task_key AND subsection_key=p_subsection_key
 RETURNING * INTO v;
 RETURN jsonb_build_object('result','saved','version',v.version,'status',v.status);
END $$;
REVOKE ALL ON FUNCTION public.mvp_save_subsection(smallint,text,bigint,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mvp_save_subsection(smallint,text,bigint,text,text) TO authenticated;

INSERT INTO public.mvp_subsections(task_key,subsection_key,title) VALUES
(1,'main','Lý do chọn đề tài'),
(2,'main','Mục đích, mục tiêu và câu hỏi nghiên cứu'),
(3,'main','Cơ sở lý thuyết'),
(4,'main','Mô hình nghiên cứu và giả thuyết'),
(5,'main','Các biến nghiên cứu'),
(6,'main','Thang đo và phương án đo lường'),
(7,'main','Các nội dung khác');

SELECT task_key,COUNT(*) AS so_tieu_muc FROM public.mvp_subsections GROUP BY task_key ORDER BY task_key;
SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='mvp_subsections';
SELECT COUNT(*) AS tong_tieu_muc FROM public.mvp_subsections;
COMMIT;

-- HOÀN TÁC (KHÔNG CHẠY nếu chưa duyệt riêng; DROP sẽ mất dữ liệu mới):
-- BEGIN;
-- DROP FUNCTION public.mvp_save_subsection(smallint,text,bigint,text,text);
-- DROP TABLE public.mvp_subsections;
-- COMMIT;
