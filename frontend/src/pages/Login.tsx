import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const validate = (): boolean => {
    let valid = true;
    setEmailError(''); setPasswordError('');
    if (!email.trim()) { setEmailError('Email is required'); valid = false; }
    else if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Enter a valid email address'); valid = false; }
    if (!password) { setPasswordError('Password is required'); valid = false; }
    return valid;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true); setError(null);
    try {
      await login(email, password);
      navigate('/chat', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', fontFamily: 'Inter, sans-serif', background: 'var(--surface-2)' }}>

      {/* ── Left panel (branding) ── */}
      <div
        className="login-brand-panel"
        style={{
          flex: '0 0 420px', background: 'var(--navy-deep)',
          display: 'flex', flexDirection: 'column',
          padding: '48px 44px', position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: -80, right: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'rgba(74,144,217,0.07)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60,
          width: 220, height: 220, borderRadius: '50%',
          background: 'rgba(74,144,217,0.05)', pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'auto' }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11,
            background: 'rgba(74,144,217,0.15)',
            border: '1px solid rgba(74,144,217,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="6.5" stroke="#4A90D9" strokeWidth="1.4" fill="none"/>
              <circle cx="11" cy="11" r="2" fill="#4A90D9"/>
              <path d="M11 7v4l2.5 2.5" stroke="#4A90D9" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px' }}>AI Nexus</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>KIOT Knowledge Assistant</div>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ marginTop: 'auto', paddingTop: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-0.6px', lineHeight: 1.2, margin: '0 0 14px' }}>
            Institutional AI<br/>powered by your<br/>knowledge base
          </h2>
          <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 32px' }}>
            Ask anything about KIOT's faculty, departments, programs, policies, and documents — grounded in verified sources.
          </p>

          {/* Feature bullets */}
          {[
            { icon: '📚', text: 'RAG-powered answers from real documents' },
            { icon: '🔍', text: 'Source citations on every response' },
            { icon: '🎙️', text: 'Voice input & natural language queries' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Bottom badge */}
        <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 10.5, fontWeight: 600, color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            GPT-4o + RAG Architecture
          </span>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--navy)', letterSpacing: '-0.5px', margin: '0 0 6px' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
              Sign in to your AI Nexus account
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div role="alert" aria-live="assertive" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', marginBottom: 18,
              background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: 10, color: '#DC2626', fontSize: 13,
            }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <path fillRule="evenodd" d="M7 1a6 6 0 100 12A6 6 0 007 1zm-.75 3.5a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 6a.75.75 0 110-1.5.75.75 0 010 1.5z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email field */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="login-email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 6 }}>
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@kiot.ac.in"
                autoComplete="email"
                autoFocus
                style={{
                  width: '100%', padding: '10px 14px',
                  border: `1.5px solid ${emailError ? '#FECACA' : 'var(--border)'}`,
                  borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
                  background: 'var(--surface)', color: 'var(--text-primary)',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--blue)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = emailError ? '#FECACA' : 'var(--border)'; }}
              />
              {emailError && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{emailError}</p>}
            </div>

            {/* Password field */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label htmlFor="login-password" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{ fontSize: 12, color: 'var(--blue)', textDecoration: 'none' }}
                >
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '10px 42px 10px 14px',
                    border: `1.5px solid ${passwordError ? '#FECACA' : 'var(--border)'}`,
                    borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
                    background: 'var(--surface)', color: 'var(--text-primary)',
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--blue)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = passwordError ? '#FECACA' : 'var(--border)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 4, minHeight: 'unset',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.2"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
                      <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.2"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && <p style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>{passwordError}</p>}
            </div>

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', marginTop: 20,
                padding: '12px 20px',
                background: loading ? 'var(--navy-mid)' : 'var(--navy)',
                color: '#fff', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.18s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--navy-mid)'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = 'var(--navy)'; }}
            >
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 24 }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--blue)', fontWeight: 500, textDecoration: 'none' }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
