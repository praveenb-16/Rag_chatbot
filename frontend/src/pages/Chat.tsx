import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSessions } from '../hooks/useSessions';
import { useChat } from '../hooks/useChat';
import { Sidebar } from '../components/chat/Sidebar';
import { MessageBubble } from '../components/chat/MessageBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { LoadingBubble } from '../components/chat/LoadingBubble';

export default function Chat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const { sessions, loading: sessionsLoading, fetchSessions, createSession, deleteSession } =
    useSessions();
  const { session, messages, loading: chatLoading, sending, error, loadSession, sendMessage, clearError } =
    useChat(sessionId ?? null);

  const [inputValue, setInputValue] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);
  const pendingPromptRef = useRef<string | null>(null); // stores prompt from suggestion card click

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  useEffect(() => {
    if (sessionId) { loadSession(); isFirstLoad.current = true; }
  }, [sessionId, loadSession]);

  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: isFirstLoad.current ? 'auto' : 'smooth' });
      isFirstLoad.current = false;
    }
  }, [messages, sending]);

  // Auto-send pending prompt after navigation to a new session
  useEffect(() => {
    if (sessionId && pendingPromptRef.current && !chatLoading) {
      const prompt = pendingPromptRef.current;
      pendingPromptRef.current = null;
      setInputValue('');
      sendMessage(prompt).then(result => {
        if (result) fetchSessions();
      });
    }
  }, [sessionId, chatLoading, sendMessage, fetchSessions]);

  const handleNewChat = async () => {
    const newSession = await createSession();
    if (newSession) navigate(`/chat/${newSession._id}`);
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    if (id === sessionId) navigate('/chat');
  };

  const handleSend = async (val: string) => {
    if (!val.trim() || sending) return;
    setInputValue(''); // Optimistically clear input
    
    if (!sessionId) {
      const newSess = await createSession();
      if (newSess) {
        navigate(`/chat/${newSess._id}`, { replace: true });
        // The message will be picked up by the useEffect below
        pendingPromptRef.current = val;
      } else {
        // If session creation failed, restore input
        setInputValue(val);
      }
      return;
    }
    
    const result = await sendMessage(val);
    if (!result) {
      // If message failed to send, restore the user's input so they don't lose it
      setInputValue(val);
    } else if (session?.title === 'New Chat') {
      await fetchSessions();
    }
  };

  // Regenerate = re-send the last user message
  const handleRegenerate = async () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg && !sending) {
      await sendMessage(lastUserMsg.content);
    }
  };

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  const userInitial = (user?.name?.[0] ?? '?').toUpperCase();

  return (
    <div className="chat-root" style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: 'var(--surface-2)' }}>

      {/* ── Sidebar ── */}
      <Sidebar
        sessions={sessions}
        loading={sessionsLoading}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName={user?.name}
        onLogout={handleLogout}
      />

      {/* ── Main area ── */}
      <div className="chat-main" style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>

        {/* Top bar */}
        <header className="chat-header" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', height: 56,
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          flexShrink: 0, position: 'relative',
        }}>
          {/* LEFT zone: hamburger + desktop title */}
          <div className="chat-header-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Hamburger — md:hidden hides it on tablet/desktop (≥768px) */}
            <button
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              id="sidebar-toggle"
              style={{
                width: 40, height: 40, border: 'none', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 8,
                alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, minHeight: 'unset',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Desktop title — CSS hides on mobile */}
            <div className="chat-title-desktop">
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                AI Nexus
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>KIOT Assistant</div>
            </div>
          </div>

          {/* CENTER — Mobile-only absolutely-centered title */}
          <div className="chat-title-mobile">
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.3px', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 5 }}>
              AI Nexus
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, display: 'inline-block' }} aria-label="Connected" />
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>KIOT Assistant</div>
          </div>

          {/* RIGHT zone */}
          <div className="chat-header-right" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Status — hidden on mobile */}
            <div className="header-status hidden sm:flex" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span className="pulse-dot" />
              Knowledge Base Connected
            </div>

            {/* Model badge — hidden on mobile */}
            <div className="header-model-badge hidden sm:block" style={{
              fontSize: 11, fontWeight: 600, color: 'var(--blue)',
              background: 'var(--blue-pale)', padding: '4px 10px',
              borderRadius: 9999, border: '1px solid rgba(74,144,217,0.2)',
            }}>
              GPT-4o + RAG
            </div>

            {/* Admin link — hidden on mobile */}
            {user?.role === 'admin' && (
              <a
                href="/admin"
                id="admin-link"
                className="header-admin-link hidden sm:inline-flex"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', fontSize: 12, fontWeight: 500,
                  color: 'var(--blue)', background: 'var(--blue-pale)',
                  border: '1px solid rgba(74,144,217,0.2)', borderRadius: 8,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M2 11c0-2.21 2.015-4 4.5-4S11 8.79 11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Admin
              </a>
            )}

            {/* User avatar + name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--navy)', color: '#fff',
                fontSize: 12, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {userInitial}
              </div>
              <span className="header-username hidden md:block" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                {user?.name}
              </span>
            </div>

            {/* Logout — hidden on mobile (accessible via sidebar drawer) */}
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              id="logout-btn"
              className="header-logout hidden sm:flex"
              style={{
                width: 36, height: 36, border: 'none', minHeight: 'unset',
                background: 'transparent', color: 'var(--text-muted)',
                cursor: 'pointer', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-3)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M10 10l4-2.5M14 7.5L10 5M5 7.5h7M2 3v9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </header>

        {/* ── Message area ── */}
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
          <div className="chat-messages-inner" style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px' }}>

            {/* Skeleton loader */}
            {chatLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                    <div className="skeleton" style={{ height: 56, width: `${55 + i * 10}%`, borderRadius: 12 }} />
                  </div>
                ))}
              </div>
            )}

            {/* Welcome / empty state */}
            {!chatLoading && messages.length === 0 && (
              <div
                className="welcome-section"
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: 18,
                }}
              >
                {/* Icon */}
                <div className="float-icon">
                  <div
                    className="welcome-icon-wrap"
                    style={{
                      width: 64, height: 64, borderRadius: 16,
                      background: 'var(--navy)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                      <circle cx="17" cy="17" r="10" stroke="#4A90D9" strokeWidth="1.6" fill="none"/>
                      <circle cx="17" cy="17" r="2.5" fill="#4A90D9"/>
                      <path d="M17 10.5V17l3.5 3.5" stroke="#4A90D9" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>

                <h1 className="welcome-title" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0 }}>
                  Welcome to AI Nexus
                </h1>

                <p className="welcome-desc" style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 460, margin: 0 }}>
                  Ask questions about KIOT's faculty, programs, policies, and documents. Every answer is grounded in the institutional knowledge base.
                </p>

                {/* Knowledge Base Stats Mock */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: -6, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', background: 'var(--blue-pale)', padding: '4px 10px', borderRadius: 999 }}>
                    📚 Connected to KIOT Knowledge Base
                  </span>
                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                    Auto-synced
                  </span>
                </div>

                {/* Prompt cards */}
                <div className="prompt-grid" style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: 10, width: '100%', maxWidth: 580, marginTop: 8,
                }}>
                  {[
                    { icon: '📋', text: 'Who are the faculty members in CSE department?' },
                    { icon: '🎓', text: 'Tell me about training' },
                    { icon: '🤖', text: 'List all professors in the AI & DS department' },
                    { icon: '🚀', text: 'Tell me about iStart' },
                  ].map(({ icon, text }) => (
                    <button
                      key={text}
                      className="prompt-card"
                      onClick={() => {
                        pendingPromptRef.current = text;
                        handleNewChat();
                      }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '13px 15px', textAlign: 'left',
                        background: 'var(--surface)', border: '1.5px solid var(--border)',
                        borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45,
                        transition: 'all 0.18s ease', minHeight: 'unset',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--blue)';
                        e.currentTarget.style.background = 'var(--blue-pale)';
                        e.currentTarget.style.color = 'var(--navy)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(74,144,217,0.12)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.background = 'var(--surface)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                      <span>{text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Empty session */}
            {!chatLoading && sessionId && messages.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                  Start the conversation by typing a question below.
                </p>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, idx) => (
              <MessageBubble
                key={msg._id}
                message={msg}
                onRegenerate={msg.role === 'assistant' && idx === messages.length - 1 ? handleRegenerate : undefined}
              />
            ))}

            {/* Typing */}
            {sending && <LoadingBubble />}

            {/* Error */}
            {error && (
              <div
                role="alert"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', margin: '8px 0',
                  background: '#FEF2F2', border: '1px solid #FECACA',
                  borderRadius: 8, color: 'var(--red)', fontSize: 13,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path fillRule="evenodd" d="M7 1a6 6 0 100 12A6 6 0 007 1zm-.75 3.5a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 6a.75.75 0 110-1.5.75.75 0 010 1.5z" clipRule="evenodd"/>
                </svg>
                <span style={{ flex: 1 }}>{error}</span>
                <button
                  onClick={clearError}
                  style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
                  aria-label="Dismiss"
                >×</button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input bar */}
        <ChatInput value={inputValue} onChange={setInputValue} onSend={handleSend} disabled={sending} />
      </div>
    </div>
  );
}
