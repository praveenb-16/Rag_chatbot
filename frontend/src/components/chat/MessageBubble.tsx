import { ChatMessage } from '../../lib/api';
import { CitationChip } from './CitationChip';

interface MessageBubbleProps { message: ChatMessage; }

/** Strip common markdown symbols the LLM may still emit despite instructions */
function cleanContent(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')   // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')       // *italic* → italic
    .replace(/__(.+?)__/g, '$1')       // __bold__ → bold
    .replace(/_(.+?)_/g, '$1')         // _italic_ → italic
    .replace(/^#{1,6}\s+/gm, '')       // # Headings → plain
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1') // `code` → code
    .trim();
}

function formatTime(iso: string): string {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="msg-in" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <div style={{ maxWidth: '72%' }}>
          <div style={{
            background: 'var(--navy)', color: '#fff',
            padding: '11px 16px',
            borderRadius: '18px 18px 4px 18px',
            fontSize: 13.5, lineHeight: 1.65,
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
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

  // Assistant message
  return (
    <div className="msg-in" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 4 }}>
      {/* Avatar */}
      <div style={{
        flexShrink: 0, width: 26, height: 26, borderRadius: 7,
        background: 'var(--navy)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke="#4A90D9" strokeWidth="1.1" fill="none"/>
          <circle cx="7" cy="7" r="1.3" fill="#4A90D9"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* AI label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy)' }}>AI Nexus</span>
        </div>

        {/* Bubble */}
        <div style={{
          border: `1px solid ${message.abstained ? 'var(--orange)' : 'var(--border)'}`,
          borderRadius: '4px 18px 18px 18px',
          padding: '16px 18px',
          fontSize: 13.5, lineHeight: 1.75,
          color: 'var(--text-primary)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          background: message.abstained ? '#FFFBEB' : 'var(--surface)',
        }}>
          {message.abstained && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, color: 'var(--orange)', fontSize: 12.5, fontWeight: 500 }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path fillRule="evenodd" d="M7 1.5L1.5 12h11L7 1.5zM6.5 5.5h1v3h-1v-3zm.5 5a.75.75 0 110-1.5.75.75 0 010 1.5z" clipRule="evenodd"/>
              </svg>
              No supporting document found
            </div>
          )}
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{cleanContent(message.content)}</p>
        </div>

        {/* Citations */}
        {message.citations.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
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
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {message.citations.map((citation, i) => (
                <CitationChip key={citation.chunkId} citation={citation} index={i} />
              ))}
            </div>
          </div>
        )}

        <p style={{ fontSize: 10.5, color: 'var(--text-light)', marginTop: 6, paddingLeft: 2 }}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
