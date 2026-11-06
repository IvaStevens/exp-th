import type { Doc } from './types';

interface DocumentListProps {
  documents: Doc[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

function isLocked(doc: Doc) {
  return doc.lockedBy !== null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function DocumentList({ documents, selectedIds, onSelectionChange }: DocumentListProps) {
  // Locked documents can't be deleted, so they can't be selected.
  const selectableIds = documents.filter((doc) => !isLocked(doc)).map((doc) => doc.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  const toggleAll = () => {
    onSelectionChange(allSelected ? [] : selectableIds);
  };

  const toggleOne = (id: string) => {
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter((selected) => selected !== id) : [...selectedIds, id],
    );
  };

  return (
    <table className="documents">
      <thead>
        <tr>
          <th className="checkbox-cell">
            <input
              type="checkbox"
              aria-label="Select all documents"
              checked={allSelected}
              disabled={selectableIds.length === 0}
              onChange={toggleAll}
            />
          </th>
          <th>Title</th>
          <th>Last updated</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => (
          <tr key={doc.id} className={selectedIds.includes(doc.id) ? 'selected' : undefined}>
            <td className="checkbox-cell">
              <input
                type="checkbox"
                aria-label={`Select ${doc.title}`}
                checked={selectedIds.includes(doc.id)}
                disabled={isLocked(doc)}
                title={isLocked(doc) ? `Locked by ${doc.lockedBy}` : undefined}
                onChange={() => toggleOne(doc.id)}
              />
            </td>
            <td>{doc.title}</td>
            <td className="muted">{formatDate(doc.updatedAt)}</td>
            <td>{isLocked(doc) ? <span className="lock">Locked</span> : <span className="muted">—</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
