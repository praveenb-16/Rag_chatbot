import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatSession } from '../../lib/api';

interface SidebarProps {
  sessions: ChatSession[];
  loading: boolean;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  sessions,
  loading,
  onNewChat,
  onDeleteSession,
  isOpen,
  onClose,
}: SidebarProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>

      {/* Brand header */}
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          {/* Logo */}
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'var(--navy)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="5.5" stroke="#4A90D9" strokeWidth="1.3" fill="none"/>
              <circle cx="9" cy="9" r="1.5" fill="#4A90D9"/>
              <path d="M9 6v3l2 2" stroke="#4A90D9" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>AI Nexus</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>KIOT Assistant</div>
          </div>
        </div>

        {/* New Conversation button */}
        <button
          id="new-chat-btn"
          onClick={onNewChat}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 12px', borderRadius: 10,
            background: 'var(--navy)', color: '#fff', border: 'none',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            width: '100%', fontFamily: 'inherit',
            transition: 'background 0.18s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--navy-mid)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--navy)')}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          New Conversation
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px 4px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 10px', border: '1.5px solid var(--border)',
          borderRadius: 8, background: 'var(--surface-2)', color: 'var(--text-muted)'
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M9 9l-1.8-1.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="Search conversations..."
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: 12, color: 'var(--text-primary)', fontFamily: 'inherit', width: '100%'
            }}
          />
        </div>
      </div>

      {/* Sessions list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
        <div style={{
          fontSize: 10, fontWeight: 600, color: 'var(--text-light)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '6px 8px 4px'
        }}>
          Recent
        </div>

        {loading ? (
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 34, borderRadius: 6 }} />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '24px 8px', textAlign: 'center' }}>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No conversations yet.</p>
            <p style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 4 }}>Start a new chat above.</p>
          </div>
        ) : (
          <ul role="list" style={{ display: 'flex', flexDirection: 'column', gap: 1, listStyle: 'none' }}>
            {sessions.map(session => {
              const isActive = session._id === sessionId;
              return (
                <li key={session._id}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => { navigate(`/chat/${session._id}`); onClose(); }}
                    onKeyDown={e => { if (e.key === 'Enter') { navigate(`/chat/${session._id}`); onClose(); } }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 10px', borderRadius: 6,
                      cursor: 'pointer',
                      background: isActive ? 'var(--blue-pale)' : 'transparent',
                      color: isActive ? 'var(--blue)' : 'var(--text-secondary)',
                      fontSize: 12.5, transition: 'background 0.15s ease',
                    }}
                    className={`group conv-item ${isActive ? 'conv-active' : ''}`}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface-3)'; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.6 }}>
                      <path d="M2 2h8v6H2V2z" stroke="currentColor" strokeWidth="1.2" rx="1"/>
                      <path d="M4 8v2l2.5-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {session.title}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteSession(session._id); }}
                      aria-label={`Delete: ${session.title}`}
                      style={{
                        opacity: 0, border: 'none', background: 'transparent',
                        color: 'var(--text-muted)', cursor: 'pointer', padding: '2px',
                        borderRadius: 4, display: 'flex', alignItems: 'center',
                        transition: 'opacity 0.15s',
                      }}
                      className="delete-btn"
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                    >
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                        <path d="M2 2l7 7M9 2l-7 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Footer / user info */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '12px 12px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--navy)', color: '#fff',
            fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            KI
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              KIOT Assistant
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>KIOT College</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex flex-col flex-shrink-0"
        style={{ width: 256, height: '100%' }}
        aria-label="Chat history sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-30"
            style={{ background: 'rgba(15,28,52,0.45)', backdropFilter: 'blur(2px)' }}
            onClick={onClose}
            aria-hidden="true"
          />
          <aside
            className="md:hidden fixed left-0 top-0 h-full z-40 flex flex-col"
            style={{ width: 256, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}
            aria-label="Chat history sidebar"
          >
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Hover reveal for delete buttons */}
      <style>{`
        .conv-item:hover .delete-btn { opacity: 1 !important; }
      `}</style>
    </>
  );
}
