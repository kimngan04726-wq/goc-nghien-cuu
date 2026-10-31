# Merge safety: remaining production gate

## Implemented in experimental bridge
- On load, capture versions of both source drafts and the consolidated article.
- On confirmation, reread all three versions and reject if any changed.
- Require explicit confirmation before replacing an existing consolidated article.
- Submit consolidated save with optimistic version check.

## Critical unresolved race
The source draft versions can change **between the three reads and the slot-0 RPC write**. Therefore client-side checks alone do NOT guarantee an atomic snapshot. The production merge RPC must verify all three expected versions in one database transaction, lock the three document rows in deterministic order, enforce server-side Admin permission, then append slot-0 history. The existing generic save RPC does not provide these guarantees.

## Additional concerns
- The current prototype extracts plain text from HTML, so formatting is not preserved.
- Preview is only held in memory, not yet rendered as a dedicated confirmation screen.
- No Supabase production credentials, database schema verification, or live test evidence.
- No deployment to main and no live data migration.

## Required tests
1. Draft 1 changes before confirmation: reject.
2. Draft 2 changes before confirmation: reject.
3. Consolidated article changes before confirmation: reject.
4. Draft changes during confirmation transaction: production RPC must reject or serialize.
5. Unauthorized member tries to save slot 0: database rejects.
6. Existing article replacement: explicit confirmation, with restorable history.
