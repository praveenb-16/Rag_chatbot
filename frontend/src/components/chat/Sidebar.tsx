import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChatSession } from '../../lib/api';

interface SidebarProps {
  sessions: ChatSession[];
  loading: boolean;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  onLogout?: () => void;
}

export function Sidebar({
  sessions,
  loading,
  onNewChat,
  onDeleteSession,
  isOpen,
  onClose,
  userName,
  onLogout,
}: SidebarProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const userInitial = (userName?.[0] ?? 'U').toUpperCase();

  const filteredSessions = searchQuery.trim()
    ? sessions.filter(s =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sessions;

  const handleLogoutClick = () => setShowLogoutConfirm(true);
  const confirmLogout = () => { setShowLogoutConfirm(false); onLogout?.(); };
  const cancelLogout = () => setShowLogoutConfirm(false);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLogoutConfirm) cancelLogout();
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, showLogoutConfirm]);

  const sidebarContent = (
    <div className="flex flex-col h-full" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>

      {/* Brand header */}
      <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>AI Nexus</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>KIOT Assistant</div>
          </div>
          {/* Close button — shown only on mobile via CSS */}
          <button
            className="sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
            style={{
              width: 44, height: 44, border: 'none', background: 'var(--surface-3)',
              color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 7,
              flexShrink: 0, minHeight: 'unset',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 2l9 9M11 2l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
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
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              border: 'none', background: 'transparent', outline: 'none',
              fontSize: 16, color: 'var(--text-primary)', fontFamily: 'inherit', width: '100%'
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
        ) : filteredSessions.length === 0 ? (
          <div style={{ padding: '24px 8px', textAlign: 'center' }}>
            {searchQuery.trim() ? (
              <>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No results for "{searchQuery}"</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 4 }}>Try a different search term.</p>
              </>
            ) : (
              <>
                <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>No conversations yet.</p>
                <p style={{ fontSize: 11.5, color: 'var(--text-light)', marginTop: 4 }}>Start a new chat above.</p>
              </>
            )}
          </div>
        ) : (
          <ul role="list" style={{ display: 'flex', flexDirection: 'column', gap: 1, listStyle: 'none' }}>
            {filteredSessions.map(session => {
              const isActive = session._id === sessionId;
              return (
                <li key={session._id}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => { navigate(`/chat/${session._id}`); onClose(); }}
                    onKeyDown={e => { if (e.key === 'Enter') { navigate(`/chat/${session._id}`); onClose(); } }}
                    className={`sidebar-session-row group conv-item ${isActive ? 'conv-active' : ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', borderRadius: 6,
                      cursor: 'pointer',
                      background: isActive ? 'var(--blue-pale)' : 'transparent',
                      color: isActive ? 'var(--blue)' : 'var(--text-secondary)',
                      fontSize: 12.5, transition: 'background 0.15s ease',
                    }}
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

      {/* Footer — user info + logout (always visible, but logout only shown on mobile) */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 8 }}>
          {/* Avatar */}
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'var(--navy)', color: '#fff',
            fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {userInitial}
          </div>
          {/* Name + subtitle */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userName || 'User'}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>KIOT College</div>
          </div>
          {/* Logout button — visible only on mobile via CSS class */}
          <button
            className="sidebar-logout-btn"
            onClick={handleLogoutClick}
            aria-label="Sign out"
            title="Sign out"
            style={{
              width: 44, height: 44, border: 'none', background: 'var(--surface-3)',
              color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 7,
              flexShrink: 0, minHeight: 'unset',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = 'var(--red)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9.5 9.5l3-2.5M12.5 7L9.5 4.5M5 7h7M2 2v10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Logout confirmation dialog ── */
  const logoutDialog = showLogoutConfirm && (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15,28,52,0.55)', backdropFilter: 'blur(4px)',
        padding: 20,
      }}
      onClick={cancelLogout}
    >
      <div
        style={{
          background: 'var(--surface)', borderRadius: 16,
          padding: '24px 22px', maxWidth: 320, width: '100%',
          boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
          border: '1px solid var(--border)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M11 11l3.5-3M14.5 8L11 5M6 8h8M2 2v12" stroke="#DC2626" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Sign out?</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>You'll be returned to the login screen.</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={cancelLogout}
            style={{
              flex: 1, padding: '9px 0', border: '1.5px solid var(--border)',
              borderRadius: 9, background: 'var(--surface-2)', color: 'var(--text-secondary)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              minHeight: 'unset',
            }}
          >
            Cancel
          </button>
          <button
            onClick={confirmLogout}
            style={{
              flex: 1, padding: '9px 0', border: 'none',
              borderRadius: 9, background: '#DC2626', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              minHeight: 'unset',
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="sidebar-desktop hidden md:flex flex-col flex-shrink-0"
        style={{ width: 256, height: '100%' }}
        aria-label="Chat history sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <>
          {/* Full-screen backdrop — blocks all interaction with chat behind it */}
          <div
            style={{
              position: 'fixed', inset: 0, zIndex: 30,
              background: 'rgba(15,28,52,0.55)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
            }}
            onClick={onClose}
            aria-hidden="true"
          />
          {/* Drawer panel */}
          <aside
            className="sidebar-mobile-drawer"
            style={{
              position: 'fixed', left: 0, top: 0, height: '100%',
              zIndex: 40, width: 280,
              display: 'flex', flexDirection: 'column',
            }}
            aria-label="Chat history sidebar"
          >
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Logout confirmation — rendered outside drawer so it overlays everything */}
      {logoutDialog}

      {/* Hover reveal for delete buttons */}
      <style>{`
        .conv-item:hover .delete-btn { opacity: 1 !important; }
      `}</style>
    </>
  );
}
