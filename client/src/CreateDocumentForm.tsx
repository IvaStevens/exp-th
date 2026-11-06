import { useState } from 'react';

interface CreateDocumentFormProps {
  /** Resolves true when the document was created, so the form knows whether to clear itself. */
  onCreate: (title: string) => Promise<boolean>;
}

export default function CreateDocumentForm({ onCreate }: CreateDocumentFormProps) {
  const [title, setTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed) return;

    setSubmitting(true);
    try {
      if (await onCreate(trimmed)) setTitle('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="create-form" onSubmit={handleSubmit}>
      <label htmlFor="new-document-title">New document</label>
      <input
        id="new-document-title"
        value={title}
        placeholder="e.g. Q4 Vendor Agreement"
        onChange={(event) => setTitle(event.target.value)}
      />
      <button type="submit" disabled={submitting || !title.trim()}>
        Create
      </button>
    </form>
  );
}
