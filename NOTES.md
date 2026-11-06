# NOTES

## What I fixed, and why

**Server**
- **Stale list (create/delete appeared to do nothing).** `DocumentsService` served `documentsCache`, a snapshot taken once at startup that was never refreshed. Removed the cache; `findAll()` reads the store (copies) every time. The set is tiny and in-memory, so the cache bought nothing.
- **Bulk delete with locked documents (the known issue).** The controller deleted ids one by one and threw on the first locked one, so documents before it were already gone and the rest were left (partial, order-dependent result). Moved the logic into `DocumentsService.deleteMany`, which validates the whole selection first and only then deletes. A locked document is never deleted.
- **`DocumentsStore.remove` wrong-item deletion.** `findIndex` returned `-1` for an unknown id and `splice(-1, 1)` removed the *last* document. It now returns `false` and does nothing.
- **`findById` leaked the stored object.** It now returns a copy, consistent with `all()` and `insert()`.
- **Input validation.** `POST /documents` rejects a missing/blank/non-string title (400) and trims it; `POST /documents/bulk-delete` rejects a non-array / non-string `ids` (400) instead of crashing with a 500. Duplicate ids in a request are de-duplicated.

**Client**
- **Locked documents never showed as locked.** The client type used `locked: boolean`, but the API sends `lockedBy: string | null`, so `doc.locked` was always `undefined`. Type and `isLocked` now use `lockedBy`.
- **Server error messages are shown.** `api.ts` surfaces the server's `message` (e.g. "1 selected document(s) are locked. Nothing was deleted.") instead of a generic error.
- **Selection survives a failed delete.** Previously the selection was cleared in `finally` even on failure. Now it is cleared only on success, so the user can deselect locked items and retry.
- **Loading flicker / stale responses.** The "Loading…" placeholder only shows for the first load (reloads swap the list in place), and only the latest `load()` may write state (StrictMode double-fetch can't overwrite newer data). A successful load clears a stale error. The selection is pruned to ids that still exist.
- **Create form.** It cleared the title and re-enabled the button even when creation failed; now it clears only on success, and `submitting` is reset in `finally`.
- **Locked rows can't be selected.** Their checkbox is disabled (tooltip shows the lock holder) and "select all" only selects unlocked documents. The server's 409 is still the backstop, e.g. if a document becomes locked after the list was loaded.
- Small a11y fixes: "select all" checkbox has a label; the error has `role="alert"`.

**Tests:** added service tests for list-after-create/delete, title validation, mixed locked/unlocked bulk delete (nothing deleted), unknown ids, malformed payloads and the `remove(-1)` case.

## Decisions on unclear requirements

- **Mixed bulk delete is all-or-nothing** (HTTP 409, nothing deleted, response lists `lockedIds`/`lockedTitles`). Alternative: delete the unlocked ones and report the locked ones as skipped. I chose all-or-nothing because the user confirmed a specific set ("Delete 5 documents?"), a partial result is the confusing behaviour that was reported, and it is trivially predictable. Trade-off: one locked item blocks the rest, and the user has to deselect it and retry.
- **Unknown id in a bulk delete → 404, nothing deleted** (same all-or-nothing rule). Alternative: treat as already-deleted/idempotent.
- **Status codes:** 409 for locked, 404 for unknown, 400 for malformed input. Successful bulk delete keeps the README's `{ "success": true }` shape (status 201, Nest's default for POST); the API shape is otherwise unchanged.
- **Locks cannot be changed.** There is no lock/unlock endpoint; locks exist only in the seed data. I left that alone since the ticket rules out new features.
- **The reported 404 on `POST http://localhost:5173/documents/bulk-delete` is not an app bug.** The browser always shows the web origin because Vite proxies `/documents` to port 3000 (`client/vite.config.ts`), and the proxy config is correct. The route exists in the source and the build. It looks like a local setup problem: ports 3000/5173 were being held by another instance of the app (the sibling `exp-th` checkout) at the time I looked, so requests may hit a different/older server. Check that nothing else is using 3000/5173 and that `pnpm dev` is running from this checkout.

## Would flag in review, not fixed

- No concurrency control: check-then-delete is only atomic because Node is single-threaded and the store is synchronous. A real database needs a transaction or conditional delete (`DELETE ... WHERE locked_by IS NULL`).
- No authentication/authorization: anyone can create or delete; "locked by" is not tied to the caller, so the lock holder cannot delete their own locked document.
- No server-side input limits (title length, `ids` array size), no DTO/`ValidationPipe` (validation is hand-rolled), and CORS is wide open (`enableCors()` with no origin).
- Ids come from an in-process counter; they reset on restart.
- Client: no abort of in-flight requests on unmount and `window.confirm` is not accessible/stylable. No client test runner.
- Dev-only: `vite` polling watch, ports hardcoded in `main.ts` and `vite.config.ts`.
- `api.ts` types the responses by assertion; nothing validates the server payload at runtime.

## Where AI assistance was used

- **Finding the problems (me).** I ran the app and tested it manually, and read the code, to identify the problem areas.
- **Investigation notes (AI, from my findings).** I used AI to write up notes on the issues I had found, so each one could be investigated for a resolution: the stale startup cache, `splice(-1)` in `remove`, the client `load` pattern, the lock-field mismatch and the non-atomic bulk delete.
- **Fixes (AI).** I used AI to implement the fixes for the issues identified in those notes, and to write the tests and this file.
- **Prioritisation and decisions (me).** I decided the order of the fixes (the locked/unlocked bulk delete first, as the README asks) and made the calls on unclear requirements, e.g. all-or-nothing bulk delete and not allowing locked rows to be selected.
- **Review of the changes (me).** I manually reviewed the code changes the AI made.
- **Verification.** Tests (`jest`, 12 passing), `nest build`, client `tsc --noEmit` + `vite build`, and an HTTP check of the API were run against the changes.
