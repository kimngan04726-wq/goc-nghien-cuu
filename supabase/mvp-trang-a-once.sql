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
-- Admin chi duoc UPDATE truc tiep cot owner_id; content/status/version chi luu qua RPC.
-- RLS gioi han nguoi dung (Admin); GRANT gioi han cot duoc UPDATE.
CREATE POLICY mvp_admin_update ON public.mvp_subsections FOR UPDATE TO authenticated
 USING (public.is_group_admin()) WITH CHECK (public.is_group_admin());
REVOKE UPDATE ON TABLE public.mvp_subsections FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (task_key, subsection_key, title, owner_id, status, content, version, edited_by, edited_at)
 ON TABLE public.mvp_subsections FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.mvp_subsections TO authenticated;
GRANT UPDATE (owner_id) ON TABLE public.mvp_subsections TO authenticated;

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
 IF p_expected_version IS NULL OR v.version <> p_expected_version THEN
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
REVOKE ALL ON FUNCTION public.mvp_save_subsection(smallint,text,bigint,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.mvp_save_subsection(smallint,text,bigint,text,text) TO authenticated;

INSERT INTO public.mvp_subsections(task_key,subsection_key,title) VALUES
(1,'01','Bối cảnh vấn đề'),(1,'02','Khoảng trống nghiên cứu'),(1,'03','Tính cấp thiết'),(1,'04','Ý nghĩa khoa học'),(1,'05','Ý nghĩa thực tiễn'),
(2,'01','Bối cảnh và định hướng nghiên cứu'),(2,'02','Mục đích nghiên cứu tổng quát'),(2,'03','Các mục tiêu nghiên cứu cụ thể'),(2,'04','Câu hỏi nghiên cứu'),(2,'05','Kết quả nghiên cứu kỳ vọng'),(2,'06','Mối liên hệ giữa mục tiêu và câu hỏi nghiên cứu'),
(3,'01','Các khái niệm và thuật ngữ liên quan'),(3,'02','Các lý thuyết nền tảng'),(3,'03','Tổng quan các nghiên cứu trong nước'),(3,'04','Tổng quan các nghiên cứu nước ngoài'),(3,'05','So sánh và tổng hợp các nghiên cứu trước'),(3,'06','Khoảng trống nghiên cứu'),(3,'07','Khung lý thuyết đề xuất'),
(4,'01','Cơ sở đề xuất mô hình nghiên cứu'),(4,'02','Xác định các yếu tố trong mô hình'),(4,'03','Mối quan hệ giữa các yếu tố'),(4,'04','Xây dựng các giả thuyết nghiên cứu'),(4,'05','Mô hình nghiên cứu đề xuất'),(4,'06','Giải thích các giả thuyết'),(4,'07','Tổng hợp giả thuyết và chiều tác động kỳ vọng'),
(5,'01','Tổng quan các biến trong nghiên cứu'),(5,'02','Biến độc lập'),(5,'03','Biến phụ thuộc'),(5,'04','Biến trung gian (nếu có)'),(5,'05','Biến điều tiết (nếu có)'),(5,'06','Biến kiểm soát (nếu có)'),(5,'07','Định nghĩa và cách đo lường từng biến'),(5,'08','Bảng tổng hợp các biến nghiên cứu'),
(6,'01','Cơ sở xây dựng thang đo'),(6,'02','Nguồn tham khảo các thang đo'),(6,'03','Thang đo cho biến độc lập'),(6,'04','Thang đo cho biến phụ thuộc'),(6,'05','Thang đo cho biến trung gian, điều tiết (nếu có)'),(6,'06','Thiết kế các biến quan sát'),(6,'07','Hiệu chỉnh và mã hóa thang đo'),(6,'08','Bảng tổng hợp thang đo chính thức'),
(7,'01','Thiết kế nghiên cứu'),(7,'02','Quy trình nghiên cứu'),(7,'03','Phương pháp nghiên cứu định tính (nếu có)'),(7,'04','Phương pháp nghiên cứu định lượng (nếu có)'),(7,'05','Đối tượng và phạm vi khảo sát'),(7,'06','Phương pháp chọn mẫu và cỡ mẫu'),(7,'07','Phương pháp thu thập dữ liệu'),(7,'08','Công cụ và quy trình xử lý dữ liệu'),(7,'09','Phương pháp phân tích dữ liệu'),(7,'10','Đạo đức nghiên cứu và bảo mật thông tin');

SELECT task_key,COUNT(*) AS so_tieu_muc FROM public.mvp_subsections GROUP BY task_key ORDER BY task_key;
SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='mvp_subsections';
SELECT COUNT(*) AS tong_tieu_muc FROM public.mvp_subsections;
COMMIT;

-- Chạy RIÊNG sau COMMIT để xem kết quả rõ trong SQL Editor:
-- SELECT task_key, COUNT(*) AS so_tieu_muc FROM public.mvp_subsections GROUP BY task_key ORDER BY task_key;
-- SELECT COUNT(*) AS tong_tieu_muc FROM public.mvp_subsections;
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='mvp_subsections';

-- HOÀN TÁC (KHÔNG CHẠY nếu chưa duyệt riêng; DROP sẽ mất dữ liệu mới):
-- BEGIN;
-- DROP FUNCTION public.mvp_save_subsection(smallint,text,bigint,text,text);
-- DROP TABLE public.mvp_subsections;
-- COMMIT;
