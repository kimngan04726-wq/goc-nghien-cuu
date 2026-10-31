# Stage 1 deployment gate — do not execute SQL yet

## Current facts
- Existing site uses Supabase tables `research_pages`, `research_drafts`, and backup tables.
- The proposed subsection tables are additive and have RLS enabled without access policies.
- No connection to the production Supabase SQL editor is available in this workflow.
- GitHub Actions success only validates Pages deployment, not Supabase writes or permissions.

## Required before rollout
1. Obtain a restorable production backup and verify restoration in a separate project.
2. Inspect live table columns, constraints, triggers, RLS policies and grants, including `group_profiles` and `research_page_assignments`.
3. Resolve whether slot ownership is page assignment, author identity, or admin override; define slot 0 permissions for the consolidated article.
4. Implement SELECT/INSERT/UPDATE policies for documents and INSERT/SELECT for version history. Verify that members cannot edit another member's slot and guests cannot read restricted drafts.
5. Confirm the save RPC uses invoker permissions and that no direct table update can bypass version checking; consider revoking direct UPDATE and using a narrowly scoped SECURITY DEFINER RPC with explicit server-side authorization instead.
6. Test concurrent saves: two sessions start at version N; exactly one succeeds and the other receives a conflict without data loss.
7. Preserve existing `research_pages.content` and `research_drafts` untouched; map legacy content to an explicit unclassified view without destructive migration.
8. Test missing network, unauthorized access, backup insert failure, retry, refresh, and simultaneous editing on two browsers.
9. Only after tests, enable feature behind a flag; monitor failures and document rollback.

## Current state
The SQL files in this branch are **proposals**, not migrations already applied. No schema or application change has been deployed.
