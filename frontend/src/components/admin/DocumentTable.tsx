import { useState } from 'react';
import { CollegeDocument, documentsApi, ApiError } from '../../lib/api';
import { StatusChip } from './StatusChip';
import { Button } from '../ui/Button';

interface DocumentTableProps {
  documents: CollegeDocument[];
  onRefresh: () => void;
}

export function DocumentTable({ documents, onRefresh }: DocumentTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (doc: CollegeDocument) => {
    if (!confirm(`Delete "${doc.title}"? This will permanently remove all its chunks from retrieval.`)) return;
    setDeletingId(doc._id);
    setError(null);
    try {
      await documentsApi.delete(doc._id);
      onRefresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-[var(--color-surface-variant)] flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <h3 className="text-h3 font-medium text-[var(--color-text-primary)] mb-1">
          No documents yet
        </h3>
        <p className="text-body text-[var(--color-text-secondary)] max-w-sm">
          Upload your first document above to start building the knowledge base.
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-sm text-[var(--color-error)] text-sm" role="alert">
          {error}
        </div>
      )}
      <div className="overflow-x-auto rounded-md shadow-elevation1">
        <table className="w-full text-sm bg-white" aria-label="Documents table">
          <thead>
            <tr className="border-b border-[var(--color-outline)] bg-[var(--color-surface)]">
              <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">Title</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden sm:table-cell">Department</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">Status</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden md:table-cell">Chunks</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden lg:table-cell">Uploaded</th>
              <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-outline)]">
            {documents.map((doc) => (
              <tr
                key={doc._id}
                className="hover:bg-[var(--color-surface)] transition-colors duration-100"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)] truncate max-w-[200px]">
                      {doc.title}
                    </p>
                    <p className="text-caption text-[var(--color-text-secondary)] truncate max-w-[200px]">
                      {doc.originalFilename}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)] hidden sm:table-cell">
                  {doc.department || <span className="italic text-[var(--color-text-secondary)]">—</span>}
                </td>
                <td className="px-4 py-3">
                  <StatusChip status={doc.status} />
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)] hidden md:table-cell">
                  {doc.chunkCount > 0 ? doc.chunkCount : '—'}
                </td>
                <td className="px-4 py-3 text-[var(--color-text-secondary)] hidden lg:table-cell">
                  {formatDate(doc.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(doc)}
                    loading={deletingId === doc._id}
                    aria-label={`Delete document: ${doc.title}`}
                    className="text-[var(--color-error)] hover:bg-red-50 !text-[var(--color-error)]"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-caption text-[var(--color-text-secondary)] mt-2 pl-1">
        {documents.length} document{documents.length !== 1 ? 's' : ''} in knowledge base
      </p>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}
