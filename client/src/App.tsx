import { useCallback, useEffect, useRef, useState } from 'react';
import CreateDocumentForm from './CreateDocumentForm';
import DocumentList from './DocumentList';
import { ApiError, bulkDeleteDocuments, createDocument, fetchDocuments } from './api';
import type { Doc } from './types';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

export default function App() {
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  // Only the most recent load may write state, so a slow older response
  // (e.g. StrictMode's double mount) can't overwrite a newer list.
  // The "Loading…" placeholder is shown for the initial load only; later
  // reloads swap the list in place.
  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      const fetched = await fetchDocuments();
      if (requestId !== latestRequest.current) return;
      setDocuments(fetched);
      // Drop selections that no longer exist (e.g. deleted elsewhere).
      const existing = new Set(fetched.map((doc) => doc.id));
      setSelectedIds((ids) => ids.filter((id) => existing.has(id)));
      setError(null);
    } catch {
      if (requestId === latestRequest.current) setError(GENERIC_ERROR);
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (title: string): Promise<boolean> => {
    setError(null);
    try {
      await createDocument(title);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR);
      return false;
    }
    await load();
    return true;
  };

  const handleDeleteSelected = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} document(s)? This cannot be undone.`)) {
      return;
    }

    setError(null);
    try {
      await bulkDeleteDocuments(selectedIds);
      setSelectedIds([]);
      await load();
    } catch (err) {
      // The server deletes nothing on failure, so keep the selection and let the
      // user deselect the offending (locked) documents and retry. Reload first
      // (a successful load clears the error), then show the failure.
      await load();
      setError(err instanceof ApiError ? err.message : GENERIC_ERROR);
    }
  };

  return (
    <main className="app">
      <header className="app-header">
        <h1>Documents</h1>
        <button
          type="button"
          className="danger"
          onClick={handleDeleteSelected}
          disabled={selectedIds.length === 0}
        >
          Delete selected{selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}
        </button>
      </header>

      <CreateDocumentForm onCreate={handleCreate} />

      {error && (
        <p className="status error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p className="status">Loading documents…</p>
      ) : (
        <DocumentList
          documents={documents}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
        />
      )}
    </main>
  );
}
