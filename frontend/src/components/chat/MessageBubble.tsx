import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '../../lib/api';
import { CitationChip } from './CitationChip';

interface MessageBubbleProps {
  message: ChatMessage;
  onRegenerate?: () => void;
}

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy response'}
      aria-label={copied ? 'Copied' : 'Copy response'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '4px 9px', border: '1px solid var(--border)',
        borderRadius: 6, background: copied ? 'var(--blue-pale)' : 'var(--surface-2)',
        color: copied ? 'var(--blue)' : 'var(--text-muted)',
        fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
        fontFamily: 'inherit', transition: 'all 0.15s ease',
        minHeight: 'unset',
      }}
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p style={{ margin: '0 0 10px', lineHeight: 1.75 }}>{children}</p>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--navy)', margin: '16px 0 8px', letterSpacing: '-0.3px' }}>{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--navy)', margin: '14px 0 6px' }}>{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--navy)', margin: '12px 0 5px' }}>{children}</h3>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul style={{ margin: '6px 0 10px', paddingLeft: 20, display: 'flex', flexDirection: 'column' as const, gap: 3 }}>{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol style={{ margin: '6px 0 10px', paddingLeft: 20, display: 'flex', flexDirection: 'column' as const, gap: 3 }}>{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li style={{ lineHeight: 1.65, color: 'var(--text-primary)' }}>{children}</li>
  ),
  code: ({ inline, children }: { inline?: boolean; children?: React.ReactNode }) =>
    inline ? (
      <code style={{
        fontFamily: "'Consolas', 'Fira Code', monospace",
        fontSize: 14, background: 'var(--surface-3)',
        padding: '2px 6px', borderRadius: 4,
        color: 'var(--navy)', border: '1px solid var(--border)',
      }}>{children}</code>
    ) : (
      <code style={{ fontFamily: "'Consolas', 'Fira Code', monospace", fontSize: 14 }}>{children}</code>
    ),
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre style={{
      background: 'var(--navy-deep)', color: '#E2E8F0',
      padding: '14px 16px', borderRadius: 10, margin: '10px 0',
      overflowX: 'auto', fontSize: 14, lineHeight: 1.65,
      fontFamily: "'Consolas', 'Fira Code', monospace",
      border: '1px solid rgba(255,255,255,0.06)',
    }}>{children}</pre>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote style={{
      borderLeft: '3px solid var(--blue)', paddingLeft: 14,
      margin: '8px 0', color: 'var(--text-secondary)',
      fontStyle: 'italic',
    }}>{children}</blockquote>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div style={{ overflowX: 'auto', margin: '10px 0' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead style={{ background: 'var(--surface-2)' }}>{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th style={{ padding: '8px 12px', border: '1px solid var(--border)', fontWeight: 600, color: 'var(--navy)', textAlign: 'left' as const, fontSize: 12 }}>{children}</th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td style={{ padding: '7px 12px', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>{children}</td>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong style={{ fontWeight: 600, color: 'var(--navy)' }}>{children}</strong>
  ),
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => {
    if (href?.startsWith('#cite-')) {
      return (
        <a href={href} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--blue-pale)', color: 'var(--blue)',
          minWidth: '16px', height: '16px', borderRadius: '8px', padding: '0 4px',
          fontSize: '9.5px', fontWeight: 700, textDecoration: 'none',
          marginLeft: '4px', verticalAlign: 'super', lineHeight: 1,
          border: '1px solid rgba(74,144,217,0.2)',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--blue)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--blue-pale)'; e.currentTarget.style.color = 'var(--blue)'; }}
        onClick={e => {
          e.preventDefault();
          const target = document.getElementById(href.substring(1));
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('cite-highlight');
            setTimeout(() => target.classList.remove('cite-highlight'), 300);
          }
        }}
        >
          {children}
        </a>
      );
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        style={{ color: 'var(--blue)', textDecoration: 'underline', wordBreak: 'break-all' }}
      >{children}</a>
    );
  },
  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />,
};

export function MessageBubble({ message, onRegenerate }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="msg-in msg-user-outer" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <div className="msg-user-bubble-wrap" style={{ maxWidth: '72%' }}>
          <div className="msg-user-bubble" style={{
            background: 'var(--primary-soft)', color: '#fff',
            padding: '11px 16px', borderRadius: '18px 18px 4px 18px',
            fontSize: 16, lineHeight: 1.65,
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            overflowWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'pre-wrap',
          }}>
            {message.content}
          </div>
          <p style={{ fontSize: 10.5, color: 'var(--text-light)', textAlign: 'right', marginTop: 4, paddingRight: 4 }}>
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="msg-in msg-ai-outer" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
      <div style={{
        flexShrink: 0, width: 28, height: 28, borderRadius: 8,
        background: 'var(--navy)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke="#4A90D9" strokeWidth="1.1" fill="none"/>
          <circle cx="7" cy="7" r="1.3" fill="#4A90D9"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>AI Nexus</span>
          {message.abstained && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)',
              background: 'var(--surface-3)', padding: '2px 8px',
              borderRadius: 9999, border: '1px solid var(--border)',
            }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M5 1v3.5L7.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
              No matching documents
            </span>
          )}
        </div>

        <div className="msg-ai-bubble" style={{
          border: '1px solid var(--border)',
          borderRadius: '4px 18px 18px 18px',
          padding: '14px 18px',
          color: 'var(--text-primary)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          background: message.abstained ? 'var(--surface-2)' : 'var(--surface)',
          overflowWrap: 'break-word', wordBreak: 'break-word',
        }}>
          <div className="msg-ai-content" style={{ fontSize: 16 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents as never}>
              {message.content.replace(/(?:\[)(\d+)(?:\])/g, '[$1](#cite-$1)')}
            </ReactMarkdown>
          </div>
          {message.abstained && (
            <div style={{
              marginTop: 12, paddingTop: 12,
              borderTop: '1px dashed var(--border)',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--navy)' }}>Suggestions:</span>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <li>Try rephrasing your question using different keywords.</li>
                <li>Check if the relevant documents have been uploaded to the Knowledge Base.</li>
                <li>Ask your admin to run a crawl on the specific department webpage.</li>
              </ul>
            </div>
          )}
        </div>

        {message.citations.length > 0 && (
          <div className="citations-section" style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 7, fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.1"/>
                <path d="M3.5 4h5M3.5 6h5M3.5 8h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              </svg>
              Retrieved Sources
              <span style={{
                fontSize: 10.5, fontWeight: 600, color: 'var(--blue)',
                background: 'var(--blue-pale)', padding: '1px 7px',
                borderRadius: 9999, border: '1px solid rgba(74,144,217,0.2)', marginLeft: 2,
              }}>
                {message.citations.length} found
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {message.citations.map((citation, i) => (
                <CitationChip key={citation.chunkId} citation={citation} index={i} />
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <CopyButton text={message.content} />
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              title="Regenerate response"
              aria-label="Regenerate response"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '4px 9px', border: '1px solid var(--border)',
                borderRadius: 6, background: 'var(--surface-2)',
                color: 'var(--text-muted)',
                fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s ease',
                minHeight: 'unset',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M9.5 2A5 5 0 101.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M1.5 2.5v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Retry
            </button>
          )}
          <span style={{ fontSize: 10.5, color: 'var(--text-light)', marginLeft: 'auto' }}>
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}
