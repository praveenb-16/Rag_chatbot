import { useState, useCallback, DragEvent, ChangeEvent, FormEvent } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { documentsApi, ApiError } from '../../lib/api';

interface UploadDropzoneProps {
  onUploaded: () => void;
}

export function UploadDropzone({ onUploaded }: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const ALLOWED = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const validateFile = (f: File): string | null => {
    if (!ALLOWED.includes(f.type)) return 'Only PDF, TXT, and DOCX files are allowed';
    const maxMb = 20;
    if (f.size > maxMb * 1024 * 1024) return `File must be under ${maxMb} MB`;
    return null;
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    const err = validateFile(f);
    if (err) { setError(err); return; }
    setFile(f);
    setError(null);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
  }, [title]);

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };
  const onDragLeave = () => setIsDragActive(false);
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFiles(e.dataTransfer.files);
  };
  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }
    if (!title.trim()) { setError('Title is required'); return; }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title.trim());
    if (department.trim()) formData.append('department', department.trim());

    setLoading(true);
    setError(null);
    try {
      await documentsApi.upload(formData);
      setSuccess(true);
      setFile(null);
      setTitle('');
      setDepartment('');
      setTimeout(() => {
        setSuccess(false);
        onUploaded();
      }, 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Drop zone */}
      <div
        id="upload-dropzone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        className={`
          flex flex-col items-center justify-center gap-3
          border-2 border-dashed rounded-md p-10 cursor-pointer
          transition-all duration-150
          ${isDragActive
            ? 'border-[var(--color-primary)] bg-[var(--color-primary-container)]'
            : 'border-[var(--color-outline)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface)]'
          }
          ${file ? 'border-[var(--color-success)] bg-green-50' : ''}
        `}
        role="button"
        tabIndex={0}
        aria-label="Upload file drop zone"
        onKeyDown={(e) => e.key === 'Enter' && document.getElementById('file-input')?.click()}
      >
        {file ? (
          <>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-[var(--color-text-primary)]">{file.name}</p>
              <p className="text-caption text-[var(--color-text-secondary)]">
                {(file.size / 1024 / 1024).toFixed(2)} MB · Click to change
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center">
              <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="text-center">
              <p className="font-medium text-[var(--color-text-primary)]">
                Drag &amp; drop a file, or click to browse
              </p>
              <p className="text-caption text-[var(--color-text-secondary)] mt-1">
                PDF, DOCX, TXT up to 20 MB
              </p>
            </div>
          </>
        )}
        <input
          id="file-input"
          type="file"
          accept=".pdf,.txt,.docx"
          onChange={onFileInput}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      {/* Metadata fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          id="doc-title"
          label="Document Title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Hostel Handbook 2024"
          required
        />
        <Input
          id="doc-department"
          label="Department (optional)"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="e.g. Student Affairs"
        />
      </div>

      {/* Error / Success */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-sm text-[var(--color-error)] text-sm" role="alert">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-sm text-[var(--color-success)] text-sm" role="status">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Document uploaded! Processing will begin shortly.
        </div>
      )}

      <Button
        id="upload-submit-btn"
        type="submit"
        loading={loading}
        disabled={!file || !title.trim()}
        className="w-full sm:w-auto"
      >
        Upload Document
      </Button>
    </form>
  );
}
