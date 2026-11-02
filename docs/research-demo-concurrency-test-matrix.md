# Autosave concurrency test cases (experimental)

Manual browser tests against `experiments/research-demo.html`; do not use production data.

| Case | Steps | Expected |
|---|---|---|
| Edit while save pending | Delay demo RPC, type A, start save, then type B before response | First response preserves dirty state; second save writes B |
| Navigate while save pending | Type A, start save, click Trang B | Navigation waits; no silent loss of A |
| Conflict | Change stored version between read and save | Save fails, text stays in editor, no repeated automatic requests |
| Retry after conflict | Resolve version conflict by reloading, then edit | New edit can autosave; previous unsaved text must be copied before reload |
| Rapid typing | Type continuously across 2-second windows | Autosave debounces and final version matches editor |
| No permission | `canEdit` false | No writes; editor read-only |
| Reopen slot | Save slot 1, switch to slot 2 and back | Each slot retains independent content |
| Merge stale preview | Select and preview, then change selected ideas | Preview cleared and save button disabled |
| Source conflict | Preview, modify slot 1 or 2, confirm | Merge rejected |

**Known limitations:** No browser execution evidence; demo uses in-memory mock RPC, not actual Supabase. Permission, network failure, database row locks and RLS must be verified separately. The editor's conflict recovery currently requires manually preserving unsaved text before reloading. No automated browser runner is connected.
