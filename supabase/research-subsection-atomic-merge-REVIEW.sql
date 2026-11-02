-- REVIEW-ONLY PROPOSAL. DO NOT EXECUTE IN PRODUCTION WITHOUT RLS AUDIT/BACKUP.
-- Atomically merge two source drafts into slot 0 with three version preconditions.
-- All three rows must exist. Caller must be an authenticated admin.
-- SECURITY INVOKER: table RLS must allow SELECT/UPDATE/INSERT for caller.
create or replace function public.merge_research_subsection_drafts(
 p_page_id integer,p_sub_id text,
 p_draft1_version bigint,p_draft2_version bigint,p_merged_version bigint,
 p_merged_content text
) returns bigint
language plpgsql security invoker set search_path = ''
as $$
declare
 v_d1 bigint;v_d2 bigint;v_m bigint;v_new bigint;
begin
 if (select auth.uid()) is null then
  raise exception 'Authentication required' using errcode='28000';
 end if;
 if not exists (
  select 1 from public.group_profiles gp
  where gp.user_id=(select auth.uid()) and gp.role='admin'
 ) then raise exception 'Admin required' using errcode='42501';end if;
 if p_draft1_version is null or p_draft2_version is null or p_merged_version is null
    or least(p_draft1_version,p_draft2_version,p_merged_version)<0 or p_merged_content is null then
  raise exception 'Invalid merge arguments' using errcode='22023';
 end if;
 -- Lock all rows in stable slot order. Requires existing rows for slots 0,1,2.
 perform 1 from public.research_subsection_documents d
 where d.page_id=p_page_id and d.sub_id=p_sub_id and d.slot in (0,1,2)
 order by d.slot for update;
 select d.version into v_d1 from public.research_subsection_documents d
  where d.page_id=p_page_id and d.sub_id=p_sub_id and d.slot=1;
 select d.version into v_d2 from public.research_subsection_documents d
  where d.page_id=p_page_id and d.sub_id=p_sub_id and d.slot=2;
 select d.version into v_m from public.research_subsection_documents d
  where d.page_id=p_page_id and d.sub_id=p_sub_id and d.slot=0;
 if v_d1 is null or v_d2 is null or v_m is null then
  raise exception 'Initialize all three document slots before merge' using errcode='22023';
 end if;
 if v_d1<>p_draft1_version or v_d2<>p_draft2_version or v_m<>p_merged_version then
  raise exception 'Merge version conflict' using errcode='40001';
 end if;
 v_new:=v_m+1;
 update public.research_subsection_documents d
 set content=p_merged_content,version=v_new,author_id=(select auth.uid()),updated_at=now()
 where d.page_id=p_page_id and d.sub_id=p_sub_id and d.slot=0;
 insert into public.research_subsection_versions(page_id,sub_id,slot,version,content,created_by)
 values(p_page_id,p_sub_id,0,v_new,p_merged_content,(select auth.uid()));
 return v_new;
end $$;
revoke all on function public.merge_research_subsection_drafts(integer,text,bigint,bigint,bigint,text) from public;
revoke all on function public.merge_research_subsection_drafts(integer,text,bigint,bigint,bigint,text) from anon;
revoke all on function public.merge_research_subsection_drafts(integer,text,bigint,bigint,bigint,text) from authenticated;
-- Before granting EXECUTE, audit whether direct table writes bypass version controls.
