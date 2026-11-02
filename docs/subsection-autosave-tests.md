# Autosave test checklist (experimental)
This code is not loaded by index.html and does not change Supabase.

- Type, wait 2 seconds, verify one save.
- Type during an in-flight save, verify the newer revision remains pending.
- Simulate network failure, verify text remains in editor and status says not saved.
- Simulate version conflict, verify no silent overwrite.
- Navigate away with unsaved changes: caller must block navigation or request confirmation.
- Switch subsection or slot: caller must flush or confirm discard before changing context.
- Reload: verify last successfully saved version, not unsaved text.
- Verify duplicate writes and backup version history are not created by retries.

Integration gate: current experimental workspace must wire this controller and handle conflicts explicitly. This checklist is not evidence that these tests passed.
