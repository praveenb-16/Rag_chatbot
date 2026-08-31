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

  const handleNewChat = async () => {
    const newSession = await createSession();
    if (newSession) navigate(`/chat/${newSession._id}`);
  };

  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    if (id === sessionId) navigate('/chat');
  };

  const handleSend = async (text: string) => {
    if (!sessionId) {
      const newSession = await createSession();
      if (!newSession) return;
      navigate(`/chat/${newSession._id}`);
      return;
    }
    setInputValue('');
    const result = await sendMessage(text);
    if (result && session?.title === 'New Chat') await fetchSessions();
  };

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  const userInitial = (user?.name?.[0] ?? '?').toUpperCase();

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--surface-2)' }}>

      {/* ── Sidebar ── */}
      <Sidebar
        sessions={sessions}
        loading={sessionsLoading}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main area ── */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, overflow: 'hidden' }}>

        {/* Top bar */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', height: 56,
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {/* Left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Mobile hamburger */}
            <button
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              id="sidebar-toggle"
              style={{
                width: 32, height: 32, border: 'none', background: 'transparent',
                color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Title group */}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
                AI Nexus
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>KIOT Assistant</div>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}
              className="hidden sm:flex">
              <span className="pulse-dot" />
              Knowledge Base Connected
            </div>

            {/* Model badge */}
            <div style={{
              fontSize: 11, fontWeight: 600, color: 'var(--blue)',
              background: 'var(--blue-pale)', padding: '4px 10px',
              borderRadius: 9999, border: '1px solid rgba(74,144,217,0.2)',
            }} className="hidden sm:block">
              GPT-4o + RAG
            </div>

            {/* Admin link */}
            {user?.role === 'admin' && (
              <a
                href="/admin"
                id="admin-link"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', fontSize: 12, fontWeight: 500,
                  color: 'var(--blue)', background: 'var(--blue-pale)',
                  border: '1px solid rgba(74,144,217,0.2)', borderRadius: 8,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
                className="hidden sm:inline-flex"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M2 11c0-2.21 2.015-4 4.5-4S11 8.79 11 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Admin
              </a>
            )}

            {/* User avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--navy)', color: '#fff',
                fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {userInitial}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}
                className="hidden md:block">
                {user?.name}
              </span>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              id="logout-btn"
              style={{
                width: 32, height: 32, border: 'none',
                background: 'transparent', color: 'var(--text-muted)',
                cursor: 'pointer', borderRadius: 6,
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
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 20px' }}>

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
            {!chatLoading && !sessionId && (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', minHeight: '60vh', textAlign: 'center', gap: 18,
              }}>
                {/* Icon */}
                <div className="float-icon">
                  <div style={{
                    width: 64, height: 64, borderRadius: 16,
                    background: 'var(--navy)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                      <circle cx="17" cy="17" r="10" stroke="#4A90D9" strokeWidth="1.6" fill="none"/>
                      <circle cx="17" cy="17" r="2.5" fill="#4A90D9"/>
                      <path d="M17 10.5V17l3.5 3.5" stroke="#4A90D9" strokeWidth="1.6" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>

                <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', margin: 0 }}>
                  How can I help you today?
                </h1>

                <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 460, margin: 0 }}>
                  Ask questions about your organization's knowledge base,
                  documents, policies, projects, research, or technical information.
                </p>

                {/* Prompt cards */}
                <div style={{
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
                      onClick={() => { setInputValue(text); handleNewChat(); }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10,
                        padding: '13px 15px', textAlign: 'left',
                        background: 'var(--surface)', border: '1.5px solid var(--border)',
                        borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45,
                        transition: 'all 0.18s ease',
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
            {messages.map(msg => <MessageBubble key={msg._id} message={msg} />)}

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
