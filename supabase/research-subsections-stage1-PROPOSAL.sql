-- STAGE 1 PROPOSAL ONLY. Review against production schema/RLS before executing.
-- Additive schema: existing research_pages/research_drafts/backups remain untouched.
begin;
create table if not exists public.research_subsections (
  id text primary key,
  page_id integer not null references public.research_pages(id) on delete restrict,
  title text not null,
  position integer not null check(position >= 0),
  created_at timestamptz not null default now(),
  unique(page_id, position),
  unique(page_id, id)
);
create table if not exists public.research_subsection_documents (
  page_id integer not null,
  sub_id text not null,
  slot smallint not null check(slot in (0,1,2)),
  content text not null default '',
  version bigint not null default 0 check(version >= 0),
  author_id uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key(page_id,sub_id,slot),
  foreign key(page_id,sub_id) references public.research_subsections(page_id,id) on delete restrict
);
create table if not exists public.research_subsection_versions (
  id bigint generated always as identity primary key,
  page_id integer not null,
  sub_id text not null,
  slot smallint not null check(slot in (0,1,2)),
  version bigint not null,
  content text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key(page_id,sub_id,slot) references public.research_subsection_documents(page_id,sub_id,slot) on delete restrict,
  unique(page_id,sub_id,slot,version)
);
create index if not exists research_subsection_versions_lookup on public.research_subsection_versions(page_id,sub_id,slot,created_at desc);
alter table public.research_subsections enable row level security;
alter table public.research_subsection_documents enable row level security;
alter table public.research_subsection_versions enable row level security;
-- Deliberately no permissive write policies yet: verify production group_profiles
-- and research_page_assignments RLS before granting member/admin access.
-- No automatic migration from old article HTML; preserve it as legacy unclassified.
commit;
