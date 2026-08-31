import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { documentsApi, CollegeDocument, ApiError } from '../lib/api';
import { UploadDropzone } from '../components/admin/UploadDropzone';
import { DocumentTable } from '../components/admin/DocumentTable';
import { Card } from '../components/ui/Card';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState<CollegeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── URL scraper state ───────────────────────────────────────────
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeTitle, setScrapeTitle] = useState('');
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { documents } = await documentsApi.list();
      setDocuments(documents);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll for status updates every 5 seconds if any docs are processing
  useEffect(() => {
    const hasProcessing = documents.some((d) => d.status === 'processing');
    if (!hasProcessing) return;

    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, [documents, fetchDocuments]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  // ── URL scraper handler ─────────────────────────────────────────
  const handleScrape = async () => {
    const url = scrapeUrl.trim();
    if (!url) { setScrapeMsg({ type: 'error', text: 'Please enter a URL.' }); return; }
    try {
      new URL(url);
    } catch {
      setScrapeMsg({ type: 'error', text: 'Please enter a valid URL (e.g. https://www.kiot.ac.in)' });
      return;
    }
    setScraping(true);
    setScrapeMsg(null);
    try {
      const res = await documentsApi.scrapeUrl(url, scrapeTitle || undefined);
      setScrapeMsg({ type: 'success', text: `✅ Crawl started for "${res.title}". It will appear in the knowledge base once processing is complete (takes ~1–3 min).` });
      setScrapeUrl('');
      setScrapeTitle('');
      // Refresh list after a short delay to pick up the new "processing" entry
      setTimeout(fetchDocuments, 2000);
    } catch (err) {
      setScrapeMsg({ type: 'error', text: err instanceof ApiError ? err.message : 'Crawl failed. Check the URL and try again.' });
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Top app bar */}
      <header className="bg-white border-b border-[var(--color-outline)] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">College Assistant</p>
              <p className="text-caption text-[var(--color-text-secondary)] -mt-0.5">Admin Console</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/chat"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary-container)] rounded-pill transition-colors"
              id="go-to-chat"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Go to Chat
            </a>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center">
                <span className="text-caption font-bold text-[var(--color-primary)] uppercase">
                  {user?.name?.[0] ?? 'A'}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-medium text-[var(--color-text-primary)]">
                {user?.name}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-2 rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] transition-colors"
              aria-label="Sign out"
              id="admin-logout-btn"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-h1 font-semibold text-[var(--color-text-primary)]">
            Manage Documents
          </h1>
          <p className="text-body text-[var(--color-text-secondary)] mt-1">
            Upload and manage documents in the knowledge base. Uploaded documents are automatically processed and made available for student queries.
          </p>
        </div>

        {/* Upload section */}
        <Card className="mb-6">
          <h2 className="text-h3 font-semibold text-[var(--color-text-primary)] mb-4">
            Upload Document
          </h2>
          <UploadDropzone onUploaded={fetchDocuments} />
        </Card>

        {/* ── URL Scraper Section ── */}
        <Card className="mb-8">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 8, background: 'var(--navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                <circle cx="8.5" cy="8.5" r="6.5" stroke="#4A90D9" strokeWidth="1.3"/>
                <path d="M5.5 8.5c0-2 1-4 3-4s3 2 3 4-1 4-3 4-3-2-3-4z" stroke="#4A90D9" strokeWidth="1.1"/>
                <path d="M2 8.5h13" stroke="#4A90D9" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-h3 font-semibold text-[var(--color-text-primary)]" style={{ margin: 0 }}>
                Ingest from Website URL
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                Paste the college's official website URL — the system will crawl up to 30 pages and add all content to the knowledge base.
              </p>
            </div>
          </div>

          {/* URL input row */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 220, position: 'relative' }}>
              <div style={{
                position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--color-text-secondary)', pointerEvents: 'none',
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M4 7c0-1.7.8-3 3-3s3 1.3 3 3-.8 3-3 3-3-1.3-3-3z" stroke="currentColor" strokeWidth="1"/>
                  <path d="M1.5 7h11" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                </svg>
              </div>
              <input
                id="scrape-url-input"
                type="url"
                value={scrapeUrl}
                onChange={e => setScrapeUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScrape()}
                placeholder="https://www.kiot.ac.in"
                disabled={scraping}
                style={{
                  width: '100%', paddingLeft: 32, paddingRight: 12,
                  paddingTop: 9, paddingBottom: 9,
                  border: '1.5px solid var(--color-outline)',
                  borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit',
                  color: 'var(--color-text-primary)', outline: 'none',
                  background: scraping ? 'var(--color-surface)' : '#fff',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-outline)')}
              />
            </div>

            <div style={{ flex: 1, minWidth: 160 }}>
              <input
                id="scrape-title-input"
                type="text"
                value={scrapeTitle}
                onChange={e => setScrapeTitle(e.target.value)}
                placeholder="Document title (optional)"
                disabled={scraping}
                style={{
                  width: '100%', padding: '9px 12px',
                  border: '1.5px solid var(--color-outline)',
                  borderRadius: 10, fontSize: 13.5, fontFamily: 'inherit',
                  color: 'var(--color-text-primary)', outline: 'none',
                  background: scraping ? 'var(--color-surface)' : '#fff',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--color-primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--color-outline)')}
              />
            </div>

            <button
              id="scrape-btn"
              onClick={handleScrape}
              disabled={scraping || !scrapeUrl.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '9px 20px', borderRadius: 10, border: 'none',
                background: scraping || !scrapeUrl.trim() ? 'var(--color-surface-variant)' : 'var(--navy, #1B2B4B)',
                color: scraping || !scrapeUrl.trim() ? 'var(--color-text-secondary)' : '#fff',
                fontSize: 13.5, fontWeight: 600, cursor: scraping || !scrapeUrl.trim() ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              {scraping ? (
                <>
                  <svg className="spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 10" opacity="0.8"/>
                  </svg>
                  Crawling...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
                    <path d="M4 7c0-1.7.8-3 3-3s3 1.3 3 3-.8 3-3 3-3-1.3-3-3z" stroke="currentColor" strokeWidth="1.1"/>
                    <path d="M1.5 7h11" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                  </svg>
                  Crawl & Ingest
                </>
              )}
            </button>
          </div>

          {/* Status message */}
          {scrapeMsg && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, fontSize: 13,
              background: scrapeMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${scrapeMsg.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
              color: scrapeMsg.type === 'success' ? '#166534' : '#DC2626',
              lineHeight: 1.5,
            }}>
              {scrapeMsg.text}
            </div>
          )}

          {/* How it works note */}
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: 'var(--color-surface)', border: '1px solid var(--color-outline)',
            fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.7,
          }}>
            <strong style={{ color: 'var(--color-text-primary)' }}>How it works:</strong>
            {' '}The crawler visits the URL, follows links within the same domain (up to 30 pages),
            extracts all visible text, removes navigation and footer noise, then chunks, embeds,
            and stores it in the vector database — exactly like uploading a document.
          </div>
        </Card>

        {/* Documents table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h3 font-semibold text-[var(--color-text-primary)]">
              Knowledge Base
            </h2>
            <button
              onClick={fetchDocuments}
              className="flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
              id="refresh-docs-btn"
              aria-label="Refresh documents list"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-sm text-[var(--color-error)] text-sm mb-4" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-14 rounded-sm" />
              ))}
            </div>
          ) : (
            <DocumentTable documents={documents} onRefresh={fetchDocuments} />
          )}
        </div>
      </main>
    </div>
  );
}
