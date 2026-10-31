-- STAGE 1 REVIEW ONLY: execute only after confirming production schema and backup.
-- Depends on research-subsections-stage1-PROPOSAL.sql.
-- Optimistic concurrency: one transaction, one version increment, no lost updates.
-- The caller must be authenticated. SECURITY INVOKER uses table RLS.
create or replace function public.save_research_subsection_document(
 p_page_id integer, p_sub_id text, p_slot smallint,
 p_expected_version bigint, p_content text
) returns table(saved_version bigint, saved_at timestamptz)
language plpgsql security invoker set search_path = ''
as $$
declare v_old bigint; v_next bigint; v_now timestamptz := now();
begin
 if (select auth.uid()) is null then raise exception 'Authentication required' using errcode='28000'; end if;
 if p_slot not in (0,1,2) or p_expected_version < 0 or p_content is null then
   raise exception 'Invalid save parameters' using errcode='22023';
 end if;
 -- The unique document row is the concurrency lock.
 insert into public.research_subsection_documents(page_id,sub_id,slot,content,version,author_id,updated_at)
 values(p_page_id,p_sub_id,p_slot,'',0,(select auth.uid()),v_now)
 on conflict(page_id,sub_id,slot) do nothing;
 select d.version into v_old from public.research_subsection_documents d
 where d.page_id=p_page_id and d.sub_id=p_sub_id and d.slot=p_slot for update;
 if not found then raise exception 'Document inaccessible or missing' using errcode='42501'; end if;
 if v_old <> p_expected_version then
   raise exception 'Version conflict: expected %, current %',p_expected_version,v_old using errcode='40001';
 end if;
 v_next:=v_old+1;
 update public.research_subsection_documents d
 set content=p_content, version=v_next, updated_at=v_now, author_id=(select auth.uid())
 where d.page_id=p_page_id and d.sub_id=p_sub_id and d.slot=p_slot;
 insert into public.research_subsection_versions(page_id,sub_id,slot,version,content,created_by,created_at)
 values(p_page_id,p_sub_id,p_slot,v_next,p_content,(select auth.uid()),v_now);
 return query select v_next,v_now;
end $$;
-- DO NOT grant EXECUTE until table RLS and permissions have been verified.
revoke all on function public.save_research_subsection_document(integer,text,smallint,bigint,text) from public;
revoke all on function public.save_research_subsection_document(integer,text,smallint,bigint,text) from anon;
revoke all on function public.save_research_subsection_document(integer,text,smallint,bigint,text) from authenticated;
