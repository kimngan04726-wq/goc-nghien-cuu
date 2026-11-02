# Trang A ↔ Trang B experimental integration checklist

The bridge reads slot 1 and slot 2 of one page/subsection, builds a local preview, and requires an explicit confirmation before writing slot 0.

**Not production-ready.** The site does not load these files, and Supabase tables/RPC/RLS are not deployed.

1. Validate the active page/subsection on both views and ensure switching cannot reuse a stale preview.
2. Check permission server-side: client `canMerge` is only UI gating, never authorization.
3. Confirm RLS and the save RPC enforce Admin-only writes to slot 0.
4. Preview output must preserve formatting or clearly disclose that only plain text is merged.
5. Test an existing consolidated article: confirmation required, no silent replacement.
6. Test a concurrent update to slot 0: version conflict, no overwrite.
7. Test changed drafts between preview and save: currently **not detected**; add source-version validation before production.
8. Test long HTML, empty drafts, accessibility, keyboard ordering, and narrow screens.
9. Audit existing data and restore backup before applying any SQL.

No tests are claimed as passed by this checklist.
